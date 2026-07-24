import { db } from '../database';
import { accountRepository } from './accountRepository';
import { investmentService } from '../../services/investmentService';
import { HoldingType } from '../../types';
import type {
  Investment,
  CreateInvestmentDTO,
  UpdateInvestmentDTO,
  InvestmentSummary,
  AccountHoldingSummary,
} from '../../types';
import { generateId, now } from '../../utils/id';

/** 老基金默认归属账户 id（与 database.ts 迁移默认值保持一致） */
const DEFAULT_ACCOUNT_ID = 'acc_citic_securities';

/**
 * 归一化产品名：去空格与常见噪声，用于 WEALTH/CASH upsert 幂等匹配。
 */
function normalizeProductName(name: string): string {
  return (name || '').replace(/\s+/g, '').replace(/[·・]/g, '').trim();
}

/**
 * InvestmentRepository — 投资持仓数据访问层
 *
 * 支持三类持仓：
 * - FUND：按 份额×净值 计算市值/收益（沿用原逻辑）
 * - WEALTH：走 investmentService.calcWealthMetrics 反推成本/收益率
 * - CASH：活期，仅 marketValue 有效
 *
 * 任意持仓 create/update/delete/updatePrice 后触发所属账户余额重算，
 * 保证「持仓变动 → 账户余额一致」为原子行为。
 */
export class InvestmentRepository {
  /** 获取所有投资持仓（按买入日倒序） */
  async getAll(): Promise<Investment[]> {
    const investments = await db.investments.toArray();
    return investments.sort((a, b) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime());
  }

  /** 根据ID获取投资 */
  async getById(id: string): Promise<Investment | undefined> {
    return db.investments.get(id);
  }

  /** 根据基金代码获取投资 */
  async getByFundCode(fundCode: string): Promise<Investment[]> {
    return db.investments.where('fundCode').equals(fundCode).toArray();
  }

  /** 按账户获取持仓（使用新增的 accountId 索引） */
  async getByAccountId(accountId: string): Promise<Investment[]> {
    return db.investments.where('accountId').equals(accountId).toArray();
  }

  /**
   * 按 账户 + 归一化产品名 查找持仓（用于 WEALTH/CASH upsert 幂等）。
   */
  async findByAccountAndName(
    accountId: string,
    productName: string,
    holdingType?: HoldingType,
  ): Promise<Investment | undefined> {
    const target = normalizeProductName(productName);
    const list = await db.investments.where('accountId').equals(accountId).toArray();
    return list.find(
      (inv) =>
        normalizeProductName(inv.fundName) === target &&
        (holdingType === undefined || inv.holdingType === holdingType),
    );
  }

  /**
   * 创建投资持仓（自动区分 FUND / WEALTH / CASH）。
   */
  async create(dto: CreateInvestmentDTO): Promise<Investment> {
    const timestamp = now();
    const holdingType = dto.holdingType ?? HoldingType.FUND;
    const accountId = dto.accountId || DEFAULT_ACCOUNT_ID;

    let investment: Investment;

    if (holdingType === HoldingType.FUND) {
      const shares = dto.shares ?? 0;
      const costPrice = dto.costPrice ?? 0;
      const currentPrice = dto.currentPrice ?? costPrice;
      const costAmount = shares * costPrice;
      const marketValue = shares * currentPrice;
      const profitLoss = marketValue - costAmount;
      const profitLossRate = costAmount > 0 ? (profitLoss / costAmount) * 100 : 0;

      investment = {
        id: generateId(),
        holdingType,
        accountId,
        institution: dto.institution,
        fundCode: dto.fundCode ?? '',
        fundName: dto.fundName,
        shares,
        costPrice,
        currentPrice,
        costAmount,
        marketValue,
        profitLoss,
        profitLossRate,
        dailyProfit: dto.dailyProfit,
        dailyProfitRate: dto.dailyProfitRate,
        holdingProfit: profitLoss,
        holdingProfitRate: profitLossRate,
        buyDate: dto.buyDate ?? timestamp.split('T')[0],
        lastSyncAt: dto.lastSyncAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } else if (holdingType === HoldingType.CASH) {
      const marketValue = dto.marketValue ?? 0;
      investment = {
        id: generateId(),
        holdingType,
        accountId,
        institution: dto.institution,
        fundCode: '',
        fundName: dto.fundName || '活期存款',
        shares: 0,
        costPrice: 0,
        currentPrice: 0,
        costAmount: marketValue,
        marketValue,
        profitLoss: 0,
        profitLossRate: 0,
        dailyProfit: undefined,
        dailyProfitRate: undefined,
        holdingProfit: 0,
        holdingProfitRate: 0,
        buyDate: dto.buyDate ?? timestamp.split('T')[0],
        lastSyncAt: dto.lastSyncAt ?? timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } else {
      const metrics = investmentService.calcWealthMetrics(dto);
      investment = {
        id: generateId(),
        holdingType,
        accountId,
        institution: dto.institution,
        fundCode: '',
        fundName: dto.fundName,
        shares: dto.shares ?? 0,
        costPrice: 0,
        currentPrice: 0,
        costAmount: metrics.costAmount,
        marketValue: metrics.marketValue,
        profitLoss: metrics.profitLoss,
        profitLossRate: metrics.profitLossRate,
        dailyProfit: metrics.dailyProfit,
        dailyProfitRate: metrics.dailyProfitRate,
        holdingProfit: metrics.holdingProfit,
        holdingProfitRate: metrics.holdingProfitRate,
        buyDate: dto.buyDate ?? timestamp.split('T')[0],
        lastSyncAt: dto.lastSyncAt ?? timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }

    await db.investments.add(investment);
    await accountRepository.recalcBalanceFromHoldings(investment.accountId);
    return investment;
  }

  /**
   * Upsert 一条 WEALTH/CASH 持仓：同 accountId + 归一化产品名 已存在则整体覆盖，
   * 否则新建。用于「重新截图覆盖更新」与活期唯一性。
   */
  async upsertByAccountAndName(dto: CreateInvestmentDTO): Promise<Investment> {
    const holdingType = dto.holdingType ?? HoldingType.WEALTH;
    const accountId = dto.accountId || DEFAULT_ACCOUNT_ID;
    const existing = await this.findByAccountAndName(accountId, dto.fundName, holdingType);

    if (existing) {
      await this.update(existing.id, {
        accountId,
        fundName: dto.fundName,
        institution: dto.institution,
        marketValue: dto.marketValue,
        dailyProfit: dto.dailyProfit,
        dailyProfitRate: dto.dailyProfitRate,
        holdingProfit: dto.holdingProfit,
        holdingProfitRate: dto.holdingProfitRate,
        lastSyncAt: dto.lastSyncAt ?? now(),
      });
      const updated = await db.investments.get(existing.id);
      return updated as Investment;
    }

    return this.create(dto);
  }

  /**
   * 更新投资持仓（按 holdingType 分流计算）。
   */
  async update(id: string, dto: UpdateInvestmentDTO): Promise<void> {
    const existing = await db.investments.get(id);
    if (!existing) {
      throw new Error(`Investment not found: ${id}`);
    }

    let updated: Investment;

    if (existing.holdingType === HoldingType.FUND) {
      const shares = dto.shares ?? existing.shares;
      const costPrice = dto.costPrice ?? existing.costPrice;
      const currentPrice = dto.currentPrice ?? existing.currentPrice;
      const costAmount = shares * costPrice;
      const marketValue = shares * currentPrice;
      const profitLoss = marketValue - costAmount;
      const profitLossRate = costAmount > 0 ? (profitLoss / costAmount) * 100 : 0;

      updated = {
        ...existing,
        ...dto,
        shares,
        costPrice,
        currentPrice,
        costAmount,
        marketValue,
        profitLoss,
        profitLossRate,
        holdingProfit: profitLoss,
        holdingProfitRate: profitLossRate,
        updatedAt: now(),
      };
    } else if (existing.holdingType === HoldingType.CASH) {
      const marketValue = dto.marketValue ?? existing.marketValue;
      updated = {
        ...existing,
        ...dto,
        marketValue,
        costAmount: marketValue,
        profitLoss: 0,
        profitLossRate: 0,
        dailyProfit: undefined,
        dailyProfitRate: undefined,
        holdingProfit: 0,
        holdingProfitRate: 0,
        lastSyncAt: dto.lastSyncAt ?? now(),
        updatedAt: now(),
      };
    } else {
      const merged = {
        marketValue: dto.marketValue ?? existing.marketValue,
        holdingProfit: dto.holdingProfit ?? existing.holdingProfit ?? existing.profitLoss,
        holdingProfitRate: dto.holdingProfitRate ?? existing.holdingProfitRate,
        dailyProfit: dto.dailyProfit ?? existing.dailyProfit,
        dailyProfitRate: dto.dailyProfitRate ?? existing.dailyProfitRate,
      };
      const metrics = investmentService.calcWealthMetrics(merged);
      updated = {
        ...existing,
        ...dto,
        costAmount: metrics.costAmount,
        marketValue: metrics.marketValue,
        profitLoss: metrics.profitLoss,
        profitLossRate: metrics.profitLossRate,
        dailyProfit: metrics.dailyProfit,
        dailyProfitRate: metrics.dailyProfitRate,
        holdingProfit: metrics.holdingProfit,
        holdingProfitRate: metrics.holdingProfitRate,
        lastSyncAt: dto.lastSyncAt ?? existing.lastSyncAt,
        updatedAt: now(),
      };
    }

    await db.investments.put(updated);
    await accountRepository.recalcBalanceFromHoldings(updated.accountId);
    // 若归属账户发生变更，旧账户也需重算
    if (existing.accountId !== updated.accountId) {
      await accountRepository.recalcBalanceFromHoldings(existing.accountId);
    }
  }

  /**
   * 更新基金当前价格（批量刷新时使用，仅 FUND 有意义）。
   */
  async updatePrice(id: string, currentPrice: number): Promise<void> {
    const existing = await db.investments.get(id);
    if (!existing) {
      throw new Error(`Investment not found: ${id}`);
    }

    // 非基金持仓无净值概念，直接跳过价格更新
    if (existing.holdingType !== HoldingType.FUND) return;

    const marketValue = existing.shares * currentPrice;
    const profitLoss = marketValue - existing.costAmount;
    const profitLossRate = existing.costAmount > 0 ? (profitLoss / existing.costAmount) * 100 : 0;

    const updated: Investment = {
      ...existing,
      currentPrice,
      marketValue,
      profitLoss,
      profitLossRate,
      holdingProfit: profitLoss,
      holdingProfitRate: profitLossRate,
      updatedAt: now(),
    };

    await db.investments.put(updated);
    await accountRepository.recalcBalanceFromHoldings(updated.accountId);
  }

  /**
   * 删除投资（删除后重算所属账户余额）。
   */
  async delete(id: string): Promise<void> {
    const existing = await db.investments.get(id);
    await db.investments.delete(id);
    if (existing) {
      await accountRepository.recalcBalanceFromHoldings(existing.accountId);
    }
  }

  /**
   * 定投扣款：向目标持仓注入金额。市值与成本同步 +amount，holdingProfit 口径不变。
   *
   * 必须走此方法而非通用 update()——通用 update() 会按 FUND 公式
   * `marketValue = shares * currentPrice` 重算并覆盖手动增量。
   * 写入后调用 recalcBalanceFromHoldings 复用既有余额口径（不新增余额计算）。
   *
   * ⚠️ 余额铁律：本方法仅改持仓 marketValue，余额由 recalcBalanceFromHoldings 重算，
   * 严禁 `balance += amount` 式自增，balance 与持仓市值绝不相加。
   *
   * @param investmentId 目标 FUND 持仓 id
   * @param amount 本期扣款额（元）
   */
  async applyDcaContribution(investmentId: string, amount: number): Promise<void> {
    const investment = await db.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }
    const updated: Investment = {
      ...investment,
      marketValue: (investment.marketValue ?? 0) + amount,
      costAmount: (investment.costAmount ?? 0) + amount,
      updatedAt: now(),
    };
    await db.investments.put(updated);
    // 余额 = Σ持仓市值（沿用既有口径），不新增任何余额计算逻辑
    await accountRepository.recalcBalanceFromHoldings(investment.accountId);
  }

  /**
   * 金价同步：更新 GOLD 持仓的当前金价（元/克）并按策略重算市值。
   *
   * - revalue=true：marketValue = shares(克重) × pricePerGram；市值变动后
   *   调 recalcBalanceFromHoldings 复用既有余额口径（不新增余额计算）。
   * - revalue=false（REFERENCE_ONLY）：仅更新 currentPrice 展示参考，不动
   *   marketValue，也不重算余额（避免无谓写库）。
   *
   * ⚠️ 余额铁律：只经本方法 → recalcBalanceFromHoldings，严禁 `balance +=`。
   *
   * @param id GOLD 持仓 id
   * @param pricePerGram 当前金价（元/克）
   * @param revalue 是否按克重×金价重算市值
   */
  async applyGoldPrice(id: string, pricePerGram: number, revalue = true): Promise<void> {
    const investment = await db.investments.get(id);
    if (!investment) {
      throw new Error(`Investment not found: ${id}`);
    }
    if (investment.holdingType !== HoldingType.GOLD) return;
    const shares = investment.shares ?? 0;
    const marketValue = revalue ? shares * pricePerGram : (investment.marketValue ?? 0);
    const updated: Investment = {
      ...investment,
      currentPrice: pricePerGram,
      marketValue,
      updatedAt: now(),
    };
    await db.investments.put(updated);
    if (revalue) {
      await accountRepository.recalcBalanceFromHoldings(investment.accountId);
    }
  }

  /**
   * 投资汇总（仅统计 FUND + WEALTH，排除 CASH 活期）。
   * CASH 计入账户余额但不属于「投资市值/收益」口径。
   */
  async getSummary(): Promise<InvestmentSummary> {
    const investments = await db.investments.toArray();
    let totalCost = 0;
    let totalMarketValue = 0;
    let totalDailyProfit = 0;
    let count = 0;

    for (const inv of investments) {
      if (inv.holdingType === HoldingType.CASH) continue;
      totalCost += inv.costAmount;
      totalMarketValue += inv.marketValue;
      if (inv.dailyProfit !== undefined && !Number.isNaN(inv.dailyProfit)) {
        totalDailyProfit += inv.dailyProfit;
      }
      count += 1;
    }

    const totalProfitLoss = totalMarketValue - totalCost;
    const totalProfitLossRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalCost,
      totalMarketValue,
      totalProfitLoss,
      totalProfitLossRate,
      totalDailyProfit,
      count,
    };
  }

  /**
   * 按账户聚合持仓汇总（含 CASH），供账户维度展示。
   * @param accountId 账户 id
   */
  async getAccountHoldingSummary(accountId: string): Promise<AccountHoldingSummary> {
    const holdings = await this.getByAccountId(accountId);
    let totalMarketValue = 0;
    let totalHoldingProfit = 0;
    let totalDailyProfit = 0;

    for (const h of holdings) {
      totalMarketValue += h.marketValue || 0;
      totalHoldingProfit += h.holdingProfit ?? h.profitLoss ?? 0;
      if (h.dailyProfit !== undefined && !Number.isNaN(h.dailyProfit)) {
        totalDailyProfit += h.dailyProfit;
      }
    }

    return {
      accountId,
      totalMarketValue,
      totalHoldingProfit,
      totalDailyProfit,
      count: holdings.length,
    };
  }

  /**
   * 清空所有投资
   */
  async clearAll(): Promise<void> {
    await db.investments.clear();
  }
}

/** 投资 Repository 单例 */
export const investmentRepository = new InvestmentRepository();

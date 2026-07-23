import { investmentRepository } from '../db/repositories/investmentRepository';
import { accountRepository } from '../db/repositories/accountRepository';
import { fundApiService } from './fundApiService';
import { HoldingType } from '../types';
import type { Investment, InvestmentSummary } from '../types';

/**
 * WEALTH 理财收益计算结果
 */
export interface WealthMetrics {
  costAmount: number;
  marketValue: number;
  /** 持有收益金额（= holdingProfit，同时写回 profitLoss） */
  profitLoss: number;
  /** 持有收益率(%)（= holdingProfitRate，同时写回 profitLossRate） */
  profitLossRate: number;
  holdingProfit: number;
  holdingProfitRate: number;
  dailyProfit?: number;
  dailyProfitRate?: number;
}

/**
 * InvestmentService — 投资市值/收益/收益率计算 + 批量刷新 + 账户余额联动
 *
 * 职责：
 * 1. 计算基金（FUND）市值、收益、收益率
 * 2. 反推理财（WEALTH）成本与收益率（calcWealthMetrics）
 * 3. 批量刷新持仓净值（仅 FUND）
 * 4. 编排账户余额与持仓联动（syncAccountBalance）
 * 5. 汇总投资组合数据
 */
class InvestmentService {
  /**
   * 计算基金市值和收益
   * @param shares 持有份额
   * @param costPrice 成本价
   * @param currentPrice 当前价
   * @returns 市值、成本、收益、收益率
   */
  calculateProfitLoss(shares: number, costPrice: number, currentPrice: number): {
    costAmount: number;
    marketValue: number;
    profitLoss: number;
    profitLossRate: number;
  } {
    const costAmount = shares * costPrice;
    const marketValue = shares * currentPrice;
    const profitLoss = marketValue - costAmount;
    const profitLossRate = costAmount > 0 ? (profitLoss / costAmount) * 100 : 0;

    return { costAmount, marketValue, profitLoss, profitLossRate };
  }

  /**
   * 计算理财（WEALTH）收益指标。
   *
   * 理财无公开净值，靠截图更新 marketValue + 收益字段：
   * - costAmount = marketValue - holdingProfit（反推成本，与 FUND 汇总口径一致）
   * - holdingProfitRate：优先取入参；否则由 holdingProfit / costAmount * 100 反推
   * - dailyProfitRate：优先取入参；否则由 dailyProfit / (marketValue - dailyProfit) * 100 反推
   *
   * @param dto 创建/更新入参（需含 marketValue，可选 holdingProfit/dailyProfit 等）
   * @returns 计算后的市值/成本/收益字段
   */
  calcWealthMetrics(dto: {
    marketValue?: number;
    holdingProfit?: number;
    holdingProfitRate?: number;
    dailyProfit?: number;
    dailyProfitRate?: number;
  }): WealthMetrics {
    const marketValue = dto.marketValue ?? 0;
    const holdingProfit = dto.holdingProfit ?? 0;
    const costAmount = marketValue - holdingProfit;

    let holdingProfitRate: number;
    if (dto.holdingProfitRate !== undefined && !Number.isNaN(dto.holdingProfitRate)) {
      holdingProfitRate = dto.holdingProfitRate;
    } else if (costAmount > 0) {
      holdingProfitRate = (holdingProfit / costAmount) * 100;
    } else {
      holdingProfitRate = 0;
    }

    // 当日收益率：截图常缺失，尽量反推；无当日收益金额则保持 undefined
    let dailyProfit = dto.dailyProfit;
    let dailyProfitRate = dto.dailyProfitRate;
    if (dailyProfit !== undefined && !Number.isNaN(dailyProfit)) {
      if (dailyProfitRate === undefined || Number.isNaN(dailyProfitRate)) {
        const base = marketValue - dailyProfit;
        dailyProfitRate = base > 0 ? (dailyProfit / base) * 100 : undefined;
      }
    } else {
      dailyProfit = undefined;
      dailyProfitRate = undefined;
    }

    return {
      costAmount,
      marketValue,
      profitLoss: holdingProfit,
      profitLossRate: holdingProfitRate,
      holdingProfit,
      holdingProfitRate,
      dailyProfit,
      dailyProfitRate,
    };
  }

  /**
   * 同步账户余额：按该账户下所有持仓 marketValue 之和回写 Account.balance。
   * 编排层封装，供 Store/Hook 在持仓变更后调用。
   * @param accountId 账户 id
   */
  async syncAccountBalance(accountId: string): Promise<void> {
    if (!accountId) return;
    await accountRepository.recalcBalanceFromHoldings(accountId);
  }

  /**
   * 批量刷新所有持仓的基金净值（仅处理 holdingType===FUND）。
   * WEALTH/CASH 无公开净值，跳过。
   * @param investments 持仓列表
   * @returns 刷新后的持仓列表
   */
  async refreshAllPrices(investments: Investment[]): Promise<Investment[]> {
    // 仅刷新基金；理财/活期原样保留
    const fundInvestments = investments.filter(
      (inv) => inv.holdingType === HoldingType.FUND && inv.fundCode,
    );

    if (fundInvestments.length === 0) return investments;

    // 获取所有不重复的基金代码
    const fundCodes = [...new Set(fundInvestments.map((inv) => inv.fundCode))];

    // 批量获取净值
    const navMap = await fundApiService.batchGetFundNavs(fundCodes);

    // 更新每个基金持仓的当前价格；受影响的账户集合稍后统一重算余额
    const affectedAccountIds = new Set<string>();
    const updatedMap = new Map<string, Investment>();

    for (const inv of fundInvestments) {
      const nav = navMap.get(inv.fundCode);
      if (nav) {
        const price = parseFloat(nav.gszz) || parseFloat(String(nav.nav)) || inv.currentPrice;
        await investmentRepository.updatePrice(inv.id, price);
        const updated = await investmentRepository.getById(inv.id);
        if (updated) {
          updatedMap.set(inv.id, updated);
          affectedAccountIds.add(updated.accountId);
        }
      }
    }

    // 刷新受影响账户余额
    for (const accountId of affectedAccountIds) {
      await accountRepository.recalcBalanceFromHoldings(accountId);
    }

    // 合并返回：基金取最新，其余原样
    return investments.map((inv) => updatedMap.get(inv.id) ?? inv);
  }

  /**
   * 获取投资组合汇总
   */
  async getSummary(): Promise<InvestmentSummary> {
    return investmentRepository.getSummary();
  }

  /**
   * 获取单个基金的当前估值
   * @param fundCode 基金代码
   * @returns 当前估值
   */
  async getCurrentPrice(fundCode: string): Promise<number | null> {
    return fundApiService.getCurrentPrice(fundCode);
  }

  /**
   * 获取基金名称
   * @param fundCode 基金代码
   * @returns 基金名称
   */
  async getFundName(fundCode: string): Promise<string> {
    const nav = await fundApiService.getFundNav(fundCode);
    return nav?.fundName ?? '';
  }

  /**
   * 格式化收益率展示
   * @param rate 收益率
   * @returns 格式化字符串
   */
  formatProfitLossRate(rate: number): string {
    const sign = rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  }

  /**
   * 判断是否为正收益
   */
  isProfit(profitLoss: number): boolean {
    return profitLoss > 0;
  }
}

/** 投资服务单例 */
export const investmentService = new InvestmentService();

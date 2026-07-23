import { dcaRepository } from '../db/repositories/dcaRepository';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { DcaDeductionMode, DcaFrequency, HoldingType } from '../types';
import type {
  DcaPlan,
  DcaRecord,
  CreateDcaPlanDTO,
  DcaDeductionResult,
} from '../types';
import { now } from '../utils/id';
import { parseISO, addDays, addWeeks, addMonths, format } from 'date-fns';

/**
 * DcaService — 定投计划业务服务层
 *
 * - `savePlan`：解析 / 创建目标 FUND 持仓并落库 DcaPlan（targetInvestmentId 建档时确定）。
 * - `runDueDeductions`：扫到期计划 → 写 DcaRecord → applyDcaContribution →
 *   余额重算 → rollNextDeductionDate 前滚 → updatePlan，返回 DcaDeductionResult[]。
 * - `rollNextDeductionDate`：按频度前滚到首个 >= today 的日期（多日未开只补记一条）。
 */
export class DcaService {
  /**
   * 解析目标 FUND 持仓 id：已提供则直接复用；否则按 fundCode 在该账户下查找，
   * 找不到则新建一条 FUND 持仓并绑定。
   */
  async resolveTargetInvestment(input: {
    accountId: string;
    fundCode?: string;
    fundName: string;
    targetInvestmentId?: string;
  }): Promise<string> {
    if (input.targetInvestmentId) return input.targetInvestmentId;

    const code = input.fundCode ?? '';
    if (code) {
      const candidates = await investmentRepository.getByFundCode(code);
      const match = candidates.find(
        (inv) => inv.accountId === input.accountId && inv.holdingType === HoldingType.FUND,
      );
      if (match) return match.id;
    }

    const created = await investmentRepository.create({
      holdingType: HoldingType.FUND,
      accountId: input.accountId,
      fundCode: code,
      fundName: input.fundName,
    });
    return created.id;
  }

  /** 保存计划：解析目标持仓 → 落库 DcaPlan */
  async savePlan(dto: CreateDcaPlanDTO): Promise<DcaPlan> {
    const targetInvestmentId = await this.resolveTargetInvestment({
      accountId: dto.accountId,
      fundCode: dto.fundCode,
      fundName: dto.fundName,
      targetInvestmentId: dto.targetInvestmentId,
    });
    return dcaRepository.createPlan({ ...dto, targetInvestmentId });
  }

  /**
   * 执行到期扣款（核心调度逻辑）。
   * @param today 本地日期 'YYYY-MM-DD'；缺省取当日
   * @returns 本次实际扣款的结果列表（用于提醒 Snackbar）
   */
  async runDueDeductions(today: string = format(new Date(), 'yyyy-MM-dd')): Promise<DcaDeductionResult[]> {
    const duePlans = await dcaRepository.getEnabledDuePlans(today);
    const results: DcaDeductionResult[] = [];

    for (const plan of duePlans) {
      // MANUAL_CONFIRM：本期默认 AUTO，该分支仅收集不写记录（后续预留）
      if (plan.deductionMode === DcaDeductionMode.MANUAL_CONFIRM) {
        continue;
      }

      // 1) 写扣款记录（basisDate = 当次 nextDeductionDate，仅补记一次）
      const record: DcaRecord = await dcaRepository.createRecord({
        planId: plan.id,
        accountId: plan.accountId,
        targetInvestmentId: plan.targetInvestmentId,
        fundCode: plan.fundCode,
        fundName: plan.fundName,
        amount: plan.amount,
        deductedAt: now(),
        basisDate: plan.nextDeductionDate,
      });

      // 2) 注入持仓市值 / 成本，并联动账户余额重算（余额铁律，无 balance += amount）
      await investmentRepository.applyDcaContribution(plan.targetInvestmentId, plan.amount);

      // 3) 前滚 nextDeductionDate 到首个 >= today 的日期
      const nextDate = this.rollNextDeductionDate(plan.nextDeductionDate, plan.frequency, today);

      // 4) 更新计划下一次扣款日与已投期数
      await dcaRepository.updatePlan(plan.id, {
        nextDeductionDate: nextDate,
        investedPeriods: (plan.investedPeriods ?? 0) + 1,
      });

      results.push({
        planId: plan.id,
        fundName: plan.fundName,
        amount: plan.amount,
        basisDate: plan.nextDeductionDate,
        recordId: record.id,
      });
    }

    return results;
  }

  /**
   * 按频度前滚扣款日：从 dateISO 起逐期前进，直到 > today。
   * 多日未开也只补记一条（记录对应原 nextDeductionDate），此处直接前滚到未来首日。
   */
  private rollNextDeductionDate(dateISO: string, freq: DcaFrequency, today: string): string {
    const advance = (d: Date): Date =>
      freq === DcaFrequency.DAILY
        ? addDays(d, 1)
        : freq === DcaFrequency.WEEKLY
          ? addWeeks(d, 1)
          : addMonths(d, 1);

    let current = parseISO(dateISO);
    let next = advance(current);
    let nextStr = format(next, 'yyyy-MM-dd');
    // 若仍 <= 今日，继续前滚（保证只补记一条后落到未来）
    while (nextStr <= today) {
      next = advance(next);
      nextStr = format(next, 'yyyy-MM-dd');
    }
    return nextStr;
  }
}

/** 定投服务单例 */
export const dcaService = new DcaService();

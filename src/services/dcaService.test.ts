/**
 * dcaService.test.ts — 定投自动扣款核心逻辑 + 余额铁律（需求⑤ DCA 红线）
 *
 * 使用 fake-indexeddb 在 Node 环境驱动真实 Dexie。覆盖：
 *  ② applyDcaContribution 余额铁律（marketValue/costAmount 各 +amount，
 *     holdingProfit 不变，账户 balance = Σ持仓市值，严禁 balance += amount 双算）
 *  ③ runDueDeductions：正常到期扣款 / 多日未开只补记一条 /
 *     MANUAL_CONFIRM 不自动入账 / 非到期·未启用不扣 / 频率前滚 / 红线守恒
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { format, parseISO, addDays, addMonths } from 'date-fns';
import { dcaService } from './dcaService';
import { dcaRepository } from '../db/repositories/dcaRepository';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { db } from '../db/database';
import { AccountType, HoldingType, DcaPlanType, DcaFrequency, DcaDeductionMode } from '../types';

const TS = '2024-01-01T00:00:00.000Z';

/** 建一个账户，挂一个目标 FUND 持仓 + 一个 CASH 活期，便于验证「balance = Σ市值」 */
async function setupAccountWithFund(): Promise<{ fundId: string; cashId: string }> {
  await db.accounts.add({
    id: 'acc1', name: '中信证券', type: AccountType.OTHER, balance: 0, currency: 'CNY', icon: '📈', note: '', createdAt: TS, updatedAt: TS,
  });
  // FUND：shares100 * cost10 = 1000；* current15 = 1500 → holdingProfit 500
  const fund = await investmentRepository.create({
    holdingType: HoldingType.FUND, accountId: 'acc1', fundCode: '000001', fundName: '基金A',
    shares: 100, costPrice: 10, currentPrice: 15,
  });
  // CASH 活期 500，作为「其他持仓」以暴露双算 bug
  const cash = await investmentRepository.create({
    holdingType: HoldingType.CASH, accountId: 'acc1', fundName: '活期存款', marketValue: 500,
  });
  return { fundId: fund.id, cashId: cash.id };
}

function makePlan(over: Record<string, unknown> = {}): any {
  return {
    type: DcaPlanType.FIXED,
    accountId: 'acc1',
    targetInvestmentId: 'inv1',
    fundCode: '000001',
    fundName: '基金A',
    amount: 100,
    frequency: DcaFrequency.MONTHLY,
    nextDeductionDate: '2024-02-01',
    enabled: true,
    deductionMode: DcaDeductionMode.AUTO,
    investedPeriods: 0,
    ...over,
  };
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.investments.clear();
  await db.dcaPlans.clear();
  await db.dcaRecords.clear();
});

describe('② 余额铁律（红线）：applyDcaContribution', () => {
  it('marketValue/costAmount 各 +amount，holdingProfit 不变，balance = Σ市值（无双算）', async () => {
    const { fundId, cashId } = await setupAccountWithFund();
    // 初始：fund 1500 + cash 500 = 2000
    const before = await db.accounts.get('acc1');
    expect(before?.balance).toBeCloseTo(2000, 2);

    await investmentRepository.applyDcaContribution(fundId, 200);

    const inv = await db.investments.get(fundId);
    expect(inv?.marketValue).toBeCloseTo(1700, 2); // 1500 + 200
    expect(inv?.costAmount).toBeCloseTo(1200, 2); // 1000 + 200
    expect(inv?.holdingProfit).toBeCloseTo(500, 2); // 不变

    const cash = await db.investments.get(cashId);
    const acc = await db.accounts.get('acc1');
    // 红线：balance 必须等于 Σ(全部持仓市值)，绝不比 Σ市值多 amount
    expect(acc?.balance).toBeCloseTo(inv!.marketValue + cash!.marketValue, 2); // 1700 + 500 = 2200
    expect(acc?.balance).toBeCloseTo(2200, 2);
    // 红线：balance 绝不等于「Σ市值 + amount」（即重复注入那笔 amount 的双算形态）
    expect(acc?.balance).not.toBeCloseTo(1700 + 500 + 200, 2); // ≠ 2400（Σ市值 + amount 双算）
    expect(acc?.balance).toBeLessThan(2400); // 余额绝不超过 2400
  });
});

describe('③ runDueDeductions 自动扣款核心逻辑', () => {
  it('到期 AUTO 计划：1 条记录 + 持仓增额 + balance 正确 + 前滚 + investedPeriods+1', async () => {
    const { fundId, cashId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    const plan = await dcaRepository.createPlan(
      makePlan({ targetInvestmentId: fundId, accountId: 'acc1', amount: 200, frequency: DcaFrequency.MONTHLY, nextDeductionDate: today }),
    );

    const results = await dcaService.runDueDeductions(today);

    expect(results.length).toBe(1);
    expect(results[0].amount).toBe(200);

    const recs = await dcaRepository.getRecordsByPlan(plan.id);
    expect(recs.length).toBe(1);
    expect(recs[0].basisDate).toBe(today); // basisDate = 当次 nextDeductionDate

    const inv = await db.investments.get(fundId);
    expect(inv?.marketValue).toBeCloseTo(1700, 2); // 1500 + 200
    expect(inv?.holdingProfit).toBeCloseTo(500, 2); // 不变

    const cash = await db.investments.get(cashId);
    const acc = await db.accounts.get('acc1');
    // 红线再次钉死：balance = Σ市值（1700 + 500 = 2200），不是 2400
    expect(acc?.balance).toBeCloseTo(inv!.marketValue + cash!.marketValue, 2);
    expect(acc?.balance).not.toBeCloseTo(2400, 2);

    const updated = await dcaRepository.getPlan(plan.id);
    expect(updated?.investedPeriods).toBe(1);
    // 前滚：MONTHLY 从 today 前进 1 月，且 > today
    const expected = format(addMonths(parseISO(today), 1), 'yyyy-MM-dd');
    expect(updated?.nextDeductionDate).toBe(expected);
    expect(updated!.nextDeductionDate > today).toBe(true);
  });

  it('频率前滚：DAILY +1天 / WEEKLY +7天 / MONTHLY +1月', async () => {
    const { fundId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    const cases = [
      { f: DcaFrequency.DAILY, exp: format(addDays(parseISO(today), 1), 'yyyy-MM-dd') },
      { f: DcaFrequency.WEEKLY, exp: format(addDays(parseISO(today), 7), 'yyyy-MM-dd') },
      { f: DcaFrequency.MONTHLY, exp: format(addMonths(parseISO(today), 1), 'yyyy-MM-dd') },
    ];
    for (const c of cases) {
      const plan = await dcaRepository.createPlan(
        makePlan({ targetInvestmentId: fundId, accountId: 'acc1', amount: 10, frequency: c.f, nextDeductionDate: today }),
      );
      await dcaService.runDueDeductions(today);
      const updated = await dcaRepository.getPlan(plan.id);
      expect(updated?.nextDeductionDate).toBe(c.exp);
    }
  });

  it('多日未开只补记一条：nextDeductionDate 远在过去，仅 1 条且前滚到未来', async () => {
    const { fundId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    const past = format(addDays(parseISO(today), -10), 'yyyy-MM-dd');
    const plan = await dcaRepository.createPlan(
      makePlan({ targetInvestmentId: fundId, accountId: 'acc1', amount: 100, frequency: DcaFrequency.DAILY, nextDeductionDate: past }),
    );

    const results = await dcaService.runDueDeductions(today);

    expect(results.length).toBe(1); // 只补记一条
    const recs = await dcaRepository.getRecordsByPlan(plan.id);
    expect(recs.length).toBe(1);
    expect(recs[0].basisDate).toBe(past); // 补记对应原 nextDeductionDate

    const updated = await dcaRepository.getPlan(plan.id);
    expect(updated!.nextDeductionDate > today).toBe(true); // 前滚到首个 > today 的日期
  });

  it('MANUAL_CONFIRM 模式不自动入账：无记录、持仓/余额不变、计划不前进', async () => {
    const { fundId, cashId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    const plan = await dcaRepository.createPlan(
      makePlan({
        targetInvestmentId: fundId, accountId: 'acc1', amount: 100, frequency: DcaFrequency.MONTHLY,
        nextDeductionDate: today, deductionMode: DcaDeductionMode.MANUAL_CONFIRM,
      }),
    );

    const results = await dcaService.runDueDeductions(today);

    expect(results.length).toBe(0);
    expect((await dcaRepository.getRecordsByPlan(plan.id)).length).toBe(0);

    const inv = await db.investments.get(fundId);
    expect(inv?.marketValue).toBeCloseTo(1500, 2); // 不变
    const cash = await db.investments.get(cashId);
    const acc = await db.accounts.get('acc1');
    expect(acc?.balance).toBeCloseTo(inv!.marketValue + cash!.marketValue, 2); // 2000 不变

    const updated = await dcaRepository.getPlan(plan.id);
    expect(updated?.nextDeductionDate).toBe(today); // 未前滚
    expect(updated?.investedPeriods).toBe(0);
  });

  it('非到期（nextDeductionDate > today）不扣款', async () => {
    const { fundId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    const future = format(addDays(parseISO(today), 5), 'yyyy-MM-dd');
    await dcaRepository.createPlan(
      makePlan({ targetInvestmentId: fundId, accountId: 'acc1', amount: 100, frequency: DcaFrequency.MONTHLY, nextDeductionDate: future }),
    );
    const results = await dcaService.runDueDeductions(today);
    expect(results.length).toBe(0);
  });

  it('未启用（enabled=false）不扣款', async () => {
    const { fundId } = await setupAccountWithFund();
    const today = format(new Date(), 'yyyy-MM-dd');
    await dcaRepository.createPlan(
      makePlan({ targetInvestmentId: fundId, accountId: 'acc1', amount: 100, frequency: DcaFrequency.MONTHLY, nextDeductionDate: today, enabled: false }),
    );
    const results = await dcaService.runDueDeductions(today);
    expect(results.length).toBe(0);
  });
});

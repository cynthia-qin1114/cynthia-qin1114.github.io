/**
 * useDcaStore.test.ts — 定投计划 Zustand Store（需求⑤ DCA）
 *
 * 使用 fake-indexeddb 在 Node 环境驱动真实 Dexie。覆盖：
 * - createPlan：经 dcaService 落库后 plans 含新计划
 * - runDueDeductions：lastDeductions 填充、plans 的 nextDeductionDate 更新、记录生成
 * - deletePlan：级联清 records
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { format, parseISO, addMonths } from 'date-fns';
import { useDcaStore } from './useDcaStore';
import { db } from '../db/database';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { dcaRepository } from '../db/repositories/dcaRepository';
import { AccountType, HoldingType, DcaPlanType, DcaFrequency } from '../types';

const TS = '2024-01-01T00:00:00.000Z';

beforeEach(async () => {
  await db.accounts.clear();
  await db.investments.clear();
  await db.dcaPlans.clear();
  await db.dcaRecords.clear();
  useDcaStore.setState({ plans: [], records: [], lastDeductions: [], loading: false, error: null });
});

describe('useDcaStore.createPlan', () => {
  it('落库后 plans 含新计划，且联动刷新', async () => {
    await db.accounts.add({
      id: 'acc1', name: '中信证券', type: AccountType.OTHER, balance: 0, currency: 'CNY', icon: '📈', note: '', createdAt: TS, updatedAt: TS,
    });
    const fund = await investmentRepository.create({
      holdingType: HoldingType.FUND, accountId: 'acc1', fundCode: '000001', fundName: '基金A', shares: 10, costPrice: 1, currentPrice: 1,
    });

    await useDcaStore.getState().createPlan({
      type: DcaPlanType.FIXED,
      accountId: 'acc1',
      targetInvestmentId: fund.id,
      fundCode: '000001',
      fundName: '基金A',
      amount: 300,
      frequency: DcaFrequency.MONTHLY,
      nextDeductionDate: '2024-05-01',
      enabled: true,
    });

    const plans = useDcaStore.getState().plans;
    expect(plans.length).toBe(1);
    expect(plans[0].fundName).toBe('基金A');
    expect(plans[0].amount).toBe(300);
    // 真实落库
    expect((await dcaRepository.getAllPlans()).length).toBe(1);
  });
});

describe('useDcaStore.runDueDeductions', () => {
  it('到期计划扣款：lastDeductions 填充、nextDeductionDate 前滚、记录生成', async () => {
    await db.accounts.add({
      id: 'acc1', name: '中信证券', type: AccountType.OTHER, balance: 0, currency: 'CNY', icon: '📈', note: '', createdAt: TS, updatedAt: TS,
    });
    const fund = await investmentRepository.create({
      holdingType: HoldingType.FUND, accountId: 'acc1', fundCode: '000001', fundName: '基金A', shares: 10, costPrice: 1, currentPrice: 1,
    });
    const today = format(new Date(), 'yyyy-MM-dd');
    await dcaRepository.createPlan({
      type: DcaPlanType.FIXED,
      accountId: 'acc1',
      targetInvestmentId: fund.id,
      fundCode: '000001',
      fundName: '基金A',
      amount: 300,
      frequency: DcaFrequency.MONTHLY,
      nextDeductionDate: today,
      enabled: true,
    });

    await useDcaStore.getState().runDueDeductions();

    const state = useDcaStore.getState();
    expect(state.lastDeductions.length).toBe(1);
    expect(state.lastDeductions[0].amount).toBe(300);

    const plans = state.plans;
    expect(plans.length).toBe(1);
    const expectedNext = format(addMonths(parseISO(today), 1), 'yyyy-MM-dd');
    expect(plans[0].nextDeductionDate).toBe(expectedNext);
    expect(plans[0].investedPeriods).toBe(1);

    // 记录真实落库
    expect((await dcaRepository.getAllRecords()).length).toBe(1);
  });

  it('无到期计划时 lastDeductions 清空', async () => {
    await useDcaStore.getState().runDueDeductions();
    expect(useDcaStore.getState().lastDeductions).toEqual([]);
  });
});

describe('useDcaStore.deletePlan', () => {
  it('级联清空该计划全部扣款记录', async () => {
    await db.accounts.add({
      id: 'acc1', name: '中信证券', type: AccountType.OTHER, balance: 0, currency: 'CNY', icon: '📈', note: '', createdAt: TS, updatedAt: TS,
    });
    const fund = await investmentRepository.create({
      holdingType: HoldingType.FUND, accountId: 'acc1', fundCode: '000001', fundName: '基金A', shares: 10, costPrice: 1, currentPrice: 1,
    });
    const plan = await dcaRepository.createPlan({
      type: DcaPlanType.FIXED, accountId: 'acc1', targetInvestmentId: fund.id, fundCode: '000001',
      fundName: '基金A', amount: 300, frequency: DcaFrequency.MONTHLY, nextDeductionDate: '2024-05-01', enabled: true,
    });
    await dcaRepository.createRecord({
      planId: plan.id, accountId: 'acc1', targetInvestmentId: fund.id, fundCode: '000001',
      fundName: '基金A', amount: 300, deductedAt: TS, basisDate: '2024-05-01',
    });
    await dcaRepository.createRecord({
      planId: plan.id, accountId: 'acc1', targetInvestmentId: fund.id, fundCode: '000001',
      fundName: '基金A', amount: 300, deductedAt: TS, basisDate: '2024-06-01',
    });

    await useDcaStore.getState().deletePlan(plan.id);

    const state = useDcaStore.getState();
    expect(state.plans.find((p) => p.id === plan.id)).toBeUndefined();
    expect((await dcaRepository.getRecordsByPlan(plan.id)).length).toBe(0);
    expect((await dcaRepository.getAllRecords()).length).toBe(0);
  });
});

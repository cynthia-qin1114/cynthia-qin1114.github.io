/**
 * dcaRepository.test.ts — 定投计划 Repository CRUD + getEnabledDuePlans 过滤（需求⑤ DCA）
 *
 * 使用 fake-indexeddb 在 Node 环境驱动真实 Dexie。
 * 覆盖 dcaRepository 的完整 CRUD、级联删除、记录查询与到期过滤逻辑。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { dcaRepository } from './dcaRepository';
import { db } from '../database';
import { DcaPlanType, DcaFrequency, DcaDeductionMode } from '../../types';

const TS = '2024-01-01T00:00:00.000Z';

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
  await db.dcaPlans.clear();
  await db.dcaRecords.clear();
});

describe('DcaPlanRepository CRUD', () => {
  it('createPlan 返回带 id 的计划并落库', async () => {
    const p = await dcaRepository.createPlan(makePlan());
    expect(p.id).toBeTruthy();
    expect(p.fundName).toBe('基金A');
    expect(p.enabled).toBe(true);
    const got = await db.dcaPlans.get(p.id);
    expect(got?.id).toBe(p.id);
  });

  it('getPlan 按 id 取回', async () => {
    const p = await dcaRepository.createPlan(makePlan());
    const got = await dcaRepository.getPlan(p.id);
    expect(got?.id).toBe(p.id);
  });

  it('getAllPlans 按创建时间升序返回全部', async () => {
    await dcaRepository.createPlan(makePlan({ fundName: 'A' }));
    await dcaRepository.createPlan(makePlan({ fundName: 'B' }));
    const all = await dcaRepository.getAllPlans();
    expect(all.length).toBe(2);
    expect(all[0].fundName).toBe('A');
  });

  it('updatePlan 局部更新（金额/启用状态）', async () => {
    const p = await dcaRepository.createPlan(makePlan());
    await dcaRepository.updatePlan(p.id, { amount: 999, enabled: false });
    const got = await dcaRepository.getPlan(p.id);
    expect(got?.amount).toBe(999);
    expect(got?.enabled).toBe(false);
  });

  it('updatePlan 不存在的计划抛错', async () => {
    await expect(dcaRepository.updatePlan('nope', { amount: 1 })).rejects.toThrow();
  });

  it('getRecordsByPlan / getAllRecords 返回记录', async () => {
    const p = await dcaRepository.createPlan(makePlan());
    await dcaRepository.createRecord({
      planId: p.id, accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-02-01',
    });
    await dcaRepository.createRecord({
      planId: p.id, accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-03-01',
    });
    const recs = await dcaRepository.getRecordsByPlan(p.id);
    expect(recs.length).toBe(2);
    const all = await dcaRepository.getAllRecords();
    expect(all.length).toBe(2);
  });

  it('deletePlan 级联删除该计划全部扣款记录（不影响其他计划）', async () => {
    const p1 = await dcaRepository.createPlan(makePlan());
    const p2 = await dcaRepository.createPlan(makePlan());
    await dcaRepository.createRecord({
      planId: p1.id, accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-02-01',
    });
    await dcaRepository.createRecord({
      planId: p1.id, accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-03-01',
    });
    await dcaRepository.createRecord({
      planId: p2.id, accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-02-01',
    });

    await dcaRepository.deletePlan(p1.id);

    expect(await dcaRepository.getPlan(p1.id)).toBeUndefined();
    expect(await dcaRepository.getPlan(p2.id)).toBeTruthy();
    expect((await dcaRepository.getRecordsByPlan(p1.id)).length).toBe(0);
    expect((await dcaRepository.getRecordsByPlan(p2.id)).length).toBe(1);
  });
});

describe('getEnabledDuePlans 过滤逻辑', () => {
  it('仅返回 enabled 且 nextDeductionDate <= today 的计划', async () => {
    const today = '2024-05-10';
    const dueOn = await dcaRepository.createPlan(makePlan({ nextDeductionDate: '2024-05-10' })); // 到期 + 启用
    await dcaRepository.createPlan(makePlan({ nextDeductionDate: '2024-05-10', enabled: false })); // 到期但禁用
    await dcaRepository.createPlan(makePlan({ nextDeductionDate: '2024-05-20' })); // 启用但未来

    const due = await dcaRepository.getEnabledDuePlans(today);
    const ids = due.map((p) => p.id);
    expect(ids).toEqual([dueOn.id]);
  });

  it('空库返回空数组', async () => {
    const due = await dcaRepository.getEnabledDuePlans('2024-05-10');
    expect(due).toEqual([]);
  });
});

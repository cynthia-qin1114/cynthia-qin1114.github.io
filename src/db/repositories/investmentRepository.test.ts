import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { investmentRepository } from './investmentRepository';
import { HoldingType } from '../../types';

/**
 * 需求①回归测试：账户管理手动录入「同一 (账户, 产品, 类型)」多次后，
 * 账户详情页仍显示多条持仓明细。
 *
 * 根因：早期手动录入走 create() 留下同名多条；后续 upsert 只更新其中一条，
 * 其余陈旧记录残留。修复点：upsertByAccountAndName 发现多条则用 matches[0]
 * 覆盖、删除其余（matches.slice(1)）。
 *
 * 本测试模拟「历史重复 create → 重新录入 upsert」全过程，断言最终仅保留 1 条。
 */
const ACC = 'acc_test_dedup';

beforeEach(async () => {
  await investmentRepository.clearAll();
});

describe('investmentRepository.upsertByAccountAndName — 重复去重(需求①)', () => {
  it('WEALTH：历史重复两条 → 重新录入后合并为 1 条且保留最新数据', async () => {
    // 模拟早期 bug：手动录入两次同一理财，各 create 一条
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '慧盈象固收增利',
      institution: '信银理财',
      marketValue: 10000,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '慧盈象固收增利',
      institution: '信银理财',
      marketValue: 10000,
    });

    // 重新录入（更新市值）
    const updated = await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '慧盈象固收增利',
      institution: '信银理财',
      marketValue: 30200,
    });

    const all = await investmentRepository.getByAccountId(ACC);
    const sameKey = all.filter(
      (h) => h.holdingType === HoldingType.WEALTH && h.fundName === '慧盈象固收增利',
    );
    expect(sameKey.length).toBe(1);
    expect(updated.marketValue).toBe(30200);
    expect(updated.id).toBe(sameKey[0].id);
  });

  it('FUND：相同 fundCode 多条 → 合并为 1 条（按 fundCode 优先匹配）', async () => {
    await investmentRepository.create({
      holdingType: HoldingType.FUND,
      accountId: ACC,
      fundCode: '161725',
      fundName: '招商中证白酒指数',
      shares: 100,
      costPrice: 1,
      currentPrice: 1,
    });
    await investmentRepository.create({
      holdingType: HoldingType.FUND,
      accountId: ACC,
      fundCode: '161725',
      fundName: '白酒',
      shares: 200,
      costPrice: 1,
      currentPrice: 1,
    });

    const updated = await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.FUND,
      accountId: ACC,
      fundCode: '161725',
      fundName: '招商中证白酒指数',
      shares: 300,
      costPrice: 1.2,
      currentPrice: 1.3,
    });

    const all = await investmentRepository.getByAccountId(ACC);
    const sameCode = all.filter((h) => h.fundCode === '161725');
    expect(sameCode.length).toBe(1);
    expect(updated.shares).toBe(300);
  });

  it('FUND：无 fundCode 时用归一化名称匹配（去空格/间隔号）', async () => {
    await investmentRepository.create({
      holdingType: HoldingType.FUND,
      accountId: ACC,
      fundName: '易方达蓝筹精选',
      shares: 100,
      costPrice: 2,
      currentPrice: 2,
    });
    const updated = await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.FUND,
      accountId: ACC,
      fundName: '易方达·蓝筹精选', // 含间隔号，归一化后应命中
      shares: 150,
      costPrice: 2,
      currentPrice: 2,
    });
    const all = await investmentRepository.getByAccountId(ACC);
    expect(all.length).toBe(1);
    expect(updated.shares).toBe(150);
  });

  it('CASH：对同一账户活期多次录入 → 合并为 1 条', async () => {
    await investmentRepository.create({
      holdingType: HoldingType.CASH,
      accountId: ACC,
      fundName: '活期存款',
      marketValue: 5000,
    });
    await investmentRepository.create({
      holdingType: HoldingType.CASH,
      accountId: ACC,
      fundName: '活期存款',
      marketValue: 5000,
    });
    const updated = await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.CASH,
      accountId: ACC,
      fundName: '活期存款',
      marketValue: 8000,
    });
    const all = await investmentRepository.getByAccountId(ACC);
    const cash = all.filter((h) => h.holdingType === HoldingType.CASH);
    expect(cash.length).toBe(1);
    expect(updated.marketValue).toBe(8000);
  });

  it('全新 key：upsert 创建且不会产生重复', async () => {
    await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '全新理财A',
      marketValue: 1000,
    });
    await investmentRepository.upsertByAccountAndName({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '全新理财A',
      marketValue: 2000,
    });
    const all = await investmentRepository.getByAccountId(ACC);
    expect(all.length).toBe(1);
    expect(all[0].marketValue).toBe(2000);
  });

  it('findAllByAccountAndName 返回所有匹配（去重前）', async () => {
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '重复产品',
      marketValue: 1,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: ACC,
      fundName: '重复产品',
      marketValue: 1,
    });
    const matches = await investmentRepository.findAllByAccountAndName(
      ACC,
      '重复产品',
      HoldingType.WEALTH,
    );
    expect(matches.length).toBe(2);
  });
});

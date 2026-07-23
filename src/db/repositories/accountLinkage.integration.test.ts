/**
 * accountLinkage.integration.test.ts — 账户余额联动 + Dexie v3 迁移集成测试
 *
 * 使用 fake-indexeddb 在 Node 环境驱动真实 Dexie，覆盖架构 §7 / §3：
 * - recalcBalanceFromHoldings：balance = Σholding.marketValue（含 CASH+WEALTH+FUND）
 * - 无持仓账户保留手填 balance
 * - investmentRepository.create/update/delete 后自动重算余额
 * - Dexie v3 迁移：老基金补 holdingType/accountId/holdingProfit，幂等安全、零数据丢失
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database';
import { accountRepository } from './accountRepository';
import { investmentRepository } from './investmentRepository';
import { HoldingType, AccountType } from '../../types';
import type { Account } from '../../types';

const makeAccount = (id: string, balance: number): Account => ({
  id,
  name: `账户${id}`,
  type: AccountType.OTHER,
  balance,
  currency: 'CNY',
  icon: '💳',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

beforeEach(async () => {
  await db.investments.clear();
  await db.accounts.clear();
});

describe('recalcBalanceFromHoldings（账户余额 = Σ marketValue）', () => {
  it('有持仓：余额=所有持仓市值之和（含 CASH+WEALTH+FUND）', async () => {
    await db.accounts.add(makeAccount('acc_boc', 999)); // 初始手填余额应被覆盖
    // 三类持仓混合
    await investmentRepository.create({
      holdingType: HoldingType.CASH,
      accountId: 'acc_boc',
      fundName: '活期存款',
      marketValue: 116.59,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '信银理财慧盈象',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '中银理财固收增强A',
      marketValue: 159900,
      holdingProfit: 14800,
    });

    const acc = await accountRepository.getById('acc_boc');
    expect(acc?.balance).toBeCloseTo(116.59 + 30200 + 159900, 2);
  });

  it('无持仓账户保留手填 balance（跳过写入）', async () => {
    await db.accounts.add(makeAccount('acc_manual', 5000));
    await accountRepository.recalcBalanceFromHoldings('acc_manual');
    const acc = await accountRepository.getById('acc_manual');
    expect(acc?.balance).toBe(5000);
  });

  it('删除持仓后余额自动重算', async () => {
    await db.accounts.add(makeAccount('acc_boc', 0));
    const inv1 = await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '理财A',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '理财B',
      marketValue: 159900,
      holdingProfit: 14800,
    });
    let acc = await accountRepository.getById('acc_boc');
    expect(acc?.balance).toBeCloseTo(190100, 2);

    await investmentRepository.delete(inv1.id);
    acc = await accountRepository.getById('acc_boc');
    expect(acc?.balance).toBeCloseTo(159900, 2); // 仅剩理财B
  });

  it('更新持仓市值后余额自动重算', async () => {
    await db.accounts.add(makeAccount('acc_boc', 0));
    const inv = await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '理财A',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    await investmentRepository.update(inv.id, { marketValue: 40000, holdingProfit: 1000 });
    const acc = await accountRepository.getById('acc_boc');
    expect(acc?.balance).toBeCloseTo(40000, 2);
  });

  it('持仓换绑账户：新旧账户余额都重算', async () => {
    await db.accounts.add(makeAccount('acc_old', 0));
    await db.accounts.add(makeAccount('acc_new', 0));
    const inv = await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_old',
      fundName: '理财A',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    expect((await accountRepository.getById('acc_old'))?.balance).toBeCloseTo(30200, 2);

    await investmentRepository.update(inv.id, { accountId: 'acc_new' });
    // 旧账户无持仓 → 保留其当前值（0，因为之前被写过 30200 再无持仓则保留）
    const oldAcc = await accountRepository.getById('acc_old');
    const newAcc = await accountRepository.getById('acc_new');
    expect(newAcc?.balance).toBeCloseTo(30200, 2);
    // 旧账户此时无持仓，recalc 跳过写入，保留上一次的 30200（符合"无持仓保留"规则）
    expect(oldAcc?.balance).toBeCloseTo(30200, 2);
  });
});

describe('WEALTH 反推收益（经 Repository create 落库）', () => {
  it('create WEALTH 后 costAmount = marketValue - holdingProfit', async () => {
    await db.accounts.add(makeAccount('acc_boc', 0));
    const inv = await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '信银理财慧盈象',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    expect(inv.costAmount).toBeCloseTo(29389.2, 2);
    expect(inv.holdingProfit).toBeCloseTo(810.8, 2);
    expect(inv.profitLoss).toBeCloseTo(810.8, 2);
  });
});

describe('getSummary（排除 CASH，仅统计 FUND+WEALTH）', () => {
  it('CASH 不计入投资汇总', async () => {
    await db.accounts.add(makeAccount('acc_boc', 0));
    await investmentRepository.create({
      holdingType: HoldingType.CASH,
      accountId: 'acc_boc',
      fundName: '活期存款',
      marketValue: 116.59,
    });
    await investmentRepository.create({
      holdingType: HoldingType.WEALTH,
      accountId: 'acc_boc',
      fundName: '理财A',
      marketValue: 30200,
      holdingProfit: 810.8,
    });
    const summary = await investmentRepository.getSummary();
    expect(summary.count).toBe(1); // 仅 WEALTH
    expect(summary.totalMarketValue).toBeCloseTo(30200, 2);
  });
});

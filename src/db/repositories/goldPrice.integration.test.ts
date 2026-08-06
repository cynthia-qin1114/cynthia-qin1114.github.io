/**
 * goldPrice.integration.test.ts — 需求④ applyGoldPrice 余额铁律集成测试
 *
 * 使用 fake-indexeddb 驱动真实 investmentRepository + accountRepository，覆盖：
 * - REVALUE 路径：marketValue = 克重 × 金价；currentPrice 更新；触发 recalcBalanceFromHoldings
 *   余额重算（balance = Σ marketValue，严禁 balance +=）
 * - REFERENCE_ONLY 路径：仅更新 currentPrice，marketValue 不变，不重算余额
 * - 非 GOLD 持仓被跳过（不改动）
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../database';
import { accountRepository } from './accountRepository';
import { investmentRepository } from './investmentRepository';
import { HoldingType, AccountType, GoldRecalcStrategy } from '../../types';
import type { Account, Investment } from '../../types';

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

const makeGold = (over: Partial<Investment>): Investment =>
  ({
    id: 'gold_1',
    holdingType: HoldingType.GOLD,
    accountId: 'acc_cmb',
    fundName: '招银黄金积存金',
    fundCode: '',
    shares: 10, // 克重
    costPrice: 0,
    currentPrice: 0, // 元/克
    costAmount: 0,
    marketValue: 5000, // 手填市值
    profitLoss: 0,
    profitLossRate: 0,
    holdingProfit: 0,
    holdingProfitRate: 0,
    dailyProfit: 0,
    dailyProfitRate: 0,
    buyDate: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }) as Investment;

beforeEach(async () => {
  await db.investments.clear();
  await db.accounts.clear();
});

describe('applyGoldPrice — 余额铁律', () => {
  it('REVALUE：市值=克重×金价，且余额经重算而非累加', async () => {
    await db.accounts.add(makeAccount('acc_cmb', 999)); // 手填余额应被覆盖
    await db.investments.add(makeGold({ id: 'g1', shares: 10, marketValue: 5000 }));

    await investmentRepository.applyGoldPrice('g1', 470, true); // 10g × 470 = 4700

    const inv = await db.investments.get('g1');
    expect(inv!.currentPrice).toBeCloseTo(470, 4);
    expect(inv!.marketValue).toBeCloseTo(4700, 2); // 10 × 470

    const acc = await accountRepository.getById('acc_cmb');
    // 余额 = Σ marketValue（仅此一条 GOLD=4700），严禁 999 + 4700
    expect(acc!.balance).toBeCloseTo(4700, 2);
  });

  it('REFERENCE_ONLY：仅更新 currentPrice，市值与余额不变', async () => {
    await db.accounts.add(makeAccount('acc_cmb', 5000));
    await db.investments.add(makeGold({ id: 'g2', shares: 10, marketValue: 5000 }));

    const spy = vi.spyOn(accountRepository, 'recalcBalanceFromHoldings');

    await investmentRepository.applyGoldPrice('g2', 470, false); // revalue=false

    const inv = await db.investments.get('g2');
    expect(inv!.currentPrice).toBeCloseTo(470, 4);
    expect(inv!.marketValue).toBe(5000); // 不变

    const acc = await accountRepository.getById('acc_cmb');
    expect(acc!.balance).toBe(5000); // 不变
    expect(spy).not.toHaveBeenCalled(); // 不重算
    spy.mockRestore();
  });

  it('非 GOLD 持仓被跳过（不改动市值/金价）', async () => {
    await db.accounts.add(makeAccount('acc_cmb', 0));
    await db.investments.add(
      makeGold({ id: 'w1', holdingType: HoldingType.WEALTH, shares: 0, marketValue: 8000 }),
    );

    await investmentRepository.applyGoldPrice('w1', 470, true);

    const inv = await db.investments.get('w1');
    expect(inv!.currentPrice).toBe(0); // 未改
    expect(inv!.marketValue).toBe(8000); // 未改
  });

  it('多 GOLD 持仓：每条按各自克重重算，余额=Σ 全部 GOLD 市值', async () => {
    await db.accounts.add(makeAccount('acc_cmb', 0));
    await db.investments.add(makeGold({ id: 'gA', shares: 10, marketValue: 1000 })); // 10 × 470 = 4700
    await db.investments.add(makeGold({ id: 'gB', shares: 5, marketValue: 1000 })); // 5 × 470 = 2350

    await investmentRepository.applyGoldPrice('gA', 470, true);
    await investmentRepository.applyGoldPrice('gB', 470, true);

    const a = await db.investments.get('gA');
    const b = await db.investments.get('gB');
    expect(a!.marketValue).toBeCloseTo(4700, 2);
    expect(b!.marketValue).toBeCloseTo(2350, 2);

    const acc = await accountRepository.getById('acc_cmb');
    expect(acc!.balance).toBeCloseTo(4700 + 2350, 2);
  });

  it('REFERENCE_ONLY + 成本均价：持有收益按 (金价-成本)×克重 重算，市值不变', async () => {
    // 模拟招行黄金账户：2.0000 克，成本均价 450.00 元/克，手填市值 900.00，原持有收益 50.00
    await db.accounts.add(makeAccount('acc_ref', 0));
    await db.investments.add(
      makeGold({ id: 'gRef', accountId: 'acc_ref', shares: 2.0000, costPrice: 450.00, marketValue: 900.00, holdingProfit: 50.00 }),
    );

    const currentPrice = 480.00; // 实时买入价
    await investmentRepository.applyGoldPrice('gRef', currentPrice, false); // revalue=false

    const inv = await db.investments.get('gRef');
    // 市值保持用户录入（revalue=false 不动 marketValue）
    expect(inv!.marketValue).toBe(900.00);
    // 金价更新为实时价
    expect(inv!.currentPrice).toBeCloseTo(currentPrice, 4);
    // 持有收益按成本重算：(480.00 - 450.00) × 2.0000
    const expectedHolding = (currentPrice - 450.00) * 2.0000;
    expect(inv!.holdingProfit).toBeCloseTo(expectedHolding, 2);
    // 持有收益率 = (480.00 - 450.00) / 450.00 × 100
    const expectedRate = ((currentPrice - 450.00) / 450.00) * 100;
    expect(inv!.holdingProfitRate).toBeCloseTo(expectedRate, 2);

    // 余额铁律：revalue=false 不触发 recalcBalanceFromHoldings，余额保持初始 0
    const acc = await accountRepository.getById('acc_ref');
    expect(acc!.balance).toBe(0);
  });

  it('REVALUE + 成本均价：市值=克重×金价，持有收益同步按成本重算', async () => {
    await db.accounts.add(makeAccount('acc_rev', 0));
    await db.investments.add(
      makeGold({ id: 'gRev', accountId: 'acc_rev', shares: 2.0000, costPrice: 450.00, marketValue: 900.00, holdingProfit: 50.00 }),
    );

    const currentPrice = 480.00;
    await investmentRepository.applyGoldPrice('gRev', currentPrice, true);

    const inv = await db.investments.get('gRev');
    expect(inv!.currentPrice).toBeCloseTo(currentPrice, 4);
    const expectedMv = 2.0000 * currentPrice; // 2.0000 × 480.00
    expect(inv!.marketValue).toBeCloseTo(expectedMv, 2);
    const expectedHolding = (currentPrice - 450.00) * 2.0000;
    expect(inv!.holdingProfit).toBeCloseTo(expectedHolding, 2);
    const expectedRate = ((currentPrice - 450.00) / 450.00) * 100;
    expect(inv!.holdingProfitRate).toBeCloseTo(expectedRate, 2);

    // 余额铁律：balance = Σ marketValue = 2.0000×480.00
    const acc = await accountRepository.getById('acc_rev');
    expect(acc!.balance).toBeCloseTo(expectedMv, 2);
  });
});

// 引用 GoldRecalcStrategy 以确保枚举与仓储常量一致（类型守卫）
describe('GoldRecalcStrategy 常量', () => {
  it('REVALUE / REFERENCE_ONLY 取值稳定', () => {
    expect(GoldRecalcStrategy.REVALUE).toBe('REVALUE');
    expect(GoldRecalcStrategy.REFERENCE_ONLY).toBe('REFERENCE_ONLY');
  });
});

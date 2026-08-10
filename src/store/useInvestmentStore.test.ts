/**
 * useInvestmentStore.test.ts — 投资持仓 Store 单元测试
 *
 * 关键关注：「账户管理 - 手动录入」应走 upsert（快照语义），不是 create。
 * 同 `(accountId, holdingType, 归一化 fundName)` 多次保存只能产生 1 条记录，
 * 避免"录一次存一条、叠加累加"的 Bug。覆盖：
 * - CASH：同账户同名活期多次保存 → 仅 1 条、金额取最新
 * - WEALTH：同账户同名理财多次保存 → 仅 1 条、市值/收益更新
 * - FUND：同账户同名基金多次保存 → 仅 1 条、份额/价格更新
 * - 不冲突：不同账户 / 不同产品名 → 共存
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { useInvestmentStore } from './useInvestmentStore';
import { db } from '../db/database';
import { HoldingType, AccountType } from '../types';
import type { Account, CreateInvestmentDTO } from '../types';

const makeAccount = (id: string, name: string): Account => ({
  id,
  name,
  type: AccountType.BANK_DEBIT,
  balance: 0,
  currency: 'CNY',
  icon: '🏦',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

beforeEach(async () => {
  await db.accounts.clear();
  await db.investments.clear();
  useInvestmentStore.setState({
    investments: [],
    loading: false,
    error: null,
    summary: null,
    refreshing: false,
  });
});

describe('useInvestmentStore.createInvestment — 手动录入应走 upsert（快照语义，防叠加）', () => {
  it('CASH：同账户同名"活期存款"连续录入 3 次仅 1 条记录，且金额为最新', async () => {
    const acc = makeAccount('acc_boc_debit', '中行储蓄卡');
    await db.accounts.add(acc);

    const dto: CreateInvestmentDTO = {
      accountId: acc.id,
      holdingType: HoldingType.CASH,
      fundName: '活期存款',
      marketValue: 100,
    };

    await useInvestmentStore.getState().createInvestment(dto);
    await useInvestmentStore.getState().createInvestment({ ...dto, marketValue: 200 });
    await useInvestmentStore.getState().createInvestment({ ...dto, marketValue: 350 });

    const all = await db.investments.toArray();
    expect(all.length).toBe(1);
    expect(all[0].holdingType).toBe(HoldingType.CASH);
    expect(all[0].marketValue).toBeCloseTo(350, 2);
  });

  it('WEALTH：同账户 + 同产品名连续录入 3 次仅 1 条，市值/收益取最新', async () => {
    const acc = makeAccount('acc_boc_debit', '中行储蓄卡');
    await db.accounts.add(acc);

    const dto: CreateInvestmentDTO = {
      accountId: acc.id,
      holdingType: HoldingType.WEALTH,
      fundName: '代销中银理财|固收增强A',
      marketValue: 100000,
      dailyProfit: 100,
      holdingProfit: 5000,
    };

    await useInvestmentStore.getState().createInvestment(dto);
    await useInvestmentStore.getState().createInvestment({ ...dto, marketValue: 160500, dailyProfit: 86.19, holdingProfit: 15300 });
    await useInvestmentStore.getState().createInvestment({ ...dto, marketValue: 165000, dailyProfit: 50, holdingProfit: 16000 });

    const all = await db.investments.toArray();
    expect(all.length).toBe(1);
    expect(all[0].marketValue).toBeCloseTo(165000, 2);
    expect(all[0].dailyProfit).toBeCloseTo(50, 2);
    expect(all[0].holdingProfit).toBeCloseTo(16000, 2);
  });

  it('FUND：同账户 + 同产品名连续录入 3 次仅 1 条，份额/价格取最新', async () => {
    const acc = makeAccount('acc_alipay', '支付宝');
    await db.accounts.add(acc);

    const dto: CreateInvestmentDTO = {
      accountId: acc.id,
      holdingType: HoldingType.FUND,
      fundName: '示例纳斯达克100指数(QDII)A',
      fundCode: '006479',
      shares: 1000,
      costPrice: 1.5,
      currentPrice: 1.8,
    };

    await useInvestmentStore.getState().createInvestment(dto);
    await useInvestmentStore.getState().createInvestment({ ...dto, shares: 1200, currentPrice: 1.9 });
    await useInvestmentStore.getState().createInvestment({ ...dto, shares: 1250, currentPrice: 2.0 });

    const all = await db.investments.toArray();
    expect(all.length).toBe(1);
    expect(all[0].shares).toBeCloseTo(1250, 2);
    expect(all[0].currentPrice).toBeCloseTo(2.0, 2);
    expect(all[0].fundCode).toBe('006479');
  });

  it('不冲突：不同产品名 → 共存多笔；不同账户 → 各自独立', async () => {
    const accA = makeAccount('acc_a', '账户A');
    const accB = makeAccount('acc_b', '账户B');
    await db.accounts.bulkAdd([accA, accB]);

    await useInvestmentStore.getState().createInvestment({
      accountId: accA.id, holdingType: HoldingType.CASH, fundName: '活期存款', marketValue: 100,
    });
    await useInvestmentStore.getState().createInvestment({
      accountId: accA.id, holdingType: HoldingType.WEALTH, fundName: '招睿季季增享A', marketValue: 200,
    });
    await useInvestmentStore.getState().createInvestment({
      accountId: accB.id, holdingType: HoldingType.CASH, fundName: '活期存款', marketValue: 300,
    });

    const all = await db.investments.toArray();
    expect(all.length).toBe(3);
  });
});

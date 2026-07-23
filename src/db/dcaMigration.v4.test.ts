/**
 * dcaMigration.v4.test.ts — Dexie v3→v4 Schema 迁移幂等安全集成测试（需求⑤ DCA）
 *
 * 使用 fake-indexeddb 在 Node 环境驱动真实 Dexie(database.ts 的 SmartFinanceDB 类 v4) 升级，验证：
 * - 先以 v3 schema（6 张既有表，含正确二级索引）写入数据，再打开 v4（含 dcaPlans / dcaRecords）
 * - v4 upgrade 闭包为空，既有 6 表数据零丢失、未被误删
 * - 新增 dcaPlans / dcaRecords 表可正常写入
 * - 重复打开（幂等）不丢数据
 *
 * 为避免全局 db 单例在 close/delete 时与其他用例发生「Database has been closed」竞态，
 * 本文件：
 *   - 用一份「忠实复刻 v1~v3 schema」的本地 Dexie 实例完成 v3 建库与写数；
 *   - 再用 database.ts 真实导出的 SmartFinanceDB 类 new 出「独立 v4 实例」打开触发升级。
 * 每次用例后显式 close 实例，beforeEach 中 Dexie.delete 清空，保证用例隔离、无悬挂连接。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { SmartFinanceDB } from './database';

const TS = '2024-01-01T00:00:00.000Z';

let v4: SmartFinanceDB | null = null;

/** 忠实复刻 database.ts 的 v1~v3 schema，仅在本地建一个 v3 实例并写入 6 表数据 */
async function seedV3(): Promise<void> {
  const v3: any = new Dexie('SmartFinanceDB');
  v3.version(1).stores({
    accounts: 'id, type, createdAt',
    transactions: 'id, accountId, type, category, platform, date, createdAt',
    categories: 'id, type, parentId, sortOrder',
    investments: 'id, fundCode, buyDate, createdAt',
    platformMappings: 'id, platform, category',
    budgets: 'id, category, period',
  });
  v3.version(2).stores({
    accounts: 'id, type, createdAt',
    transactions: 'id, accountId, type, category, platform, date, createdAt',
    categories: 'id, type, parentId, sortOrder',
    investments: 'id, fundCode, buyDate, createdAt',
    platformMappings: 'id, platform, category',
    budgets: 'id, category, period',
  });
  v3.version(3).stores({
    accounts: 'id, type, createdAt',
    transactions: 'id, accountId, type, category, platform, date, createdAt',
    categories: 'id, type, parentId, sortOrder',
    investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
    platformMappings: 'id, platform, category',
    budgets: 'id, category, period',
  });

  await v3.open();
  await v3.transaction(
    'rw',
    v3.accounts,
    v3.transactions,
    v3.categories,
    v3.investments,
    v3.platformMappings,
    v3.budgets,
    async () => {
      await v3.accounts.add({
        id: 'acc1', name: '中信证券', type: 'OTHER', balance: 0, currency: 'CNY', icon: '📈', note: '', createdAt: TS, updatedAt: TS,
      });
      await v3.transactions.add({
        id: 'tx1', accountId: 'acc1', type: 'EXPENSE', category: 'cat_food', platform: 'alipay', date: '2024-01-02', amount: 50, note: '', createdAt: TS,
      });
      await v3.categories.add({
        id: 'cat1', name: '餐饮', type: 'EXPENSE', icon: '🍔', parentId: null, sortOrder: 3,
      });
      await v3.investments.add({
        id: 'inv1', fundCode: '000001', fundName: '基金A', shares: 100, costPrice: 1, currentPrice: 1.5,
        costAmount: 100, marketValue: 150, profitLoss: 50, profitLossRate: 50,
        holdingType: 'FUND', accountId: 'acc1', buyDate: '2023-06-01', createdAt: TS, updatedAt: TS,
      });
      await v3.platformMappings.add({ id: 'pm1', platform: 'alipay', category: 'cat_food' });
      await v3.budgets.add({ id: 'b1', category: 'cat_food', period: 'MONTHLY', limit: 500, used: 0 });
    },
  );
  await v3.close();
}

/** 用真实的 SmartFinanceDB(v4) 类打开并触发 v3→v4 升级，返回独立实例 */
async function openV4(): Promise<SmartFinanceDB> {
  v4 = new SmartFinanceDB();
  await v4.open();
  return v4;
}

beforeEach(async () => {
  await Dexie.delete('SmartFinanceDB').catch(() => {});
});

afterEach(async () => {
  if (v4) {
    try {
      v4.close();
    } catch {
      /* 关闭失败不影响用例隔离（已在 beforeEach 中 delete 重建） */
    }
    v4 = null;
  }
});

describe('Dexie v3→v4 迁移 — 零数据丢失 / 幂等', () => {
  it('升级后 6 张既有表数据与字段全部保留', async () => {
    await seedV3();
    const db4 = await openV4();

    expect((await db4.accounts.toArray()).length).toBe(1);
    expect((await db4.transactions.toArray()).length).toBe(1);
    expect((await db4.categories.toArray()).length).toBe(1);
    expect((await db4.platformMappings.toArray()).length).toBe(1);
    expect((await db4.budgets.toArray()).length).toBe(1);

    const inv = await db4.investments.get('inv1');
    expect(inv).toBeDefined();
    expect(inv?.fundName).toBe('基金A');
    expect(inv?.marketValue).toBe(150);
    expect(inv?.holdingType).toBe('FUND');
    expect(inv?.accountId).toBe('acc1');
  });

  it('升级后 dcaPlans / dcaRecords 两表可写（未误删既有表、新表建好）', async () => {
    await seedV3();
    const db4 = await openV4();

    await db4.dcaPlans.add({
      id: 'p1', type: 'FIXED', accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, frequency: 'MONTHLY',
      nextDeductionDate: '2024-02-01', enabled: true, deductionMode: 'AUTO',
      createdAt: TS, updatedAt: TS,
    } as any);
    expect(await db4.dcaPlans.count()).toBe(1);

    await db4.dcaRecords.add({
      id: 'r1', planId: 'p1', accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, deductedAt: TS, basisDate: '2024-02-01',
    } as any);
    expect(await db4.dcaRecords.count()).toBe(1);

    // 既有表在新表写入后依然完好
    expect(await db4.accounts.count()).toBe(1);
    expect(await db4.investments.count()).toBe(1);
  });

  it('幂等：再次打开 v4 不丢失既有与新写入数据', async () => {
    await seedV3();
    const db4 = await openV4();

    await db4.dcaPlans.add({
      id: 'p1', type: 'FIXED', accountId: 'acc1', targetInvestmentId: 'inv1',
      fundCode: '000001', fundName: '基金A', amount: 100, frequency: 'MONTHLY',
      nextDeductionDate: '2024-02-01', enabled: true, deductionMode: 'AUTO',
      createdAt: TS, updatedAt: TS,
    } as any);

    // 关闭再以 v4 重新打开（模拟二次启动）
    await db4.close();
    v4 = null;
    const reopened = await openV4();
    const reInv = await reopened.investments.get('inv1');
    expect(reInv?.marketValue).toBe(150);
    expect(await reopened.dcaPlans.count()).toBe(1);
    expect(await reopened.categories.count()).toBe(1);
  });
});

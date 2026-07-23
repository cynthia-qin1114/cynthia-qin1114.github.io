/**
 * database.migration.v5.test.ts — 招商银行信用卡默认账户「彻底移除」回归测试
 *
 * 本次修复目标（database.ts 已改）：
 *   1. buildDefaultAccounts() 不再包含 acc_cmb_credit（默认账户 8 → 7）。
 *   2. 新增 Dexie version(5) 迁移：升级时删除既有 acc_cmb_credit 账户及其持仓，
 *      并保证「恢复默认账户与分类」(resetDefaultData) 因默认列表已不含它而不会种回。
 *   3. AccountType.BANK_CREDIT 枚举保留，手动「添加账户」仍可创建信用卡类型。
 *
 * 覆盖用例：
 *   - 用例A（复活防护）：删除 acc_cmb_credit 后调用 resetDefaultData()，断言不被种回。
 *   - 用例B（默认种子）：清空后 initializeDefaultData() 写入 7 个默认账户，不含 acc_cmb_credit。
 *   - 用例C（v5 迁移真正删除既有记录，关键）：先以 v4 schema 写入 acc_cmb_credit 账户 + 其持仓，
 *      再用真实 SmartFinanceDB(v5) 打开触发升级，断言账户与其持仓均被删除、其他账户不受影响。
 *   - 用例D（枚举保留）：AccountType.BANK_CREDIT 仍可取，手动添加信用卡能力未被破坏。
 *
 * 隔离策略（避免「Database has been closed / versionchange」竞态）：
 *   - 用例A/B/D 使用 database.ts 导出的单例 db（initializeDefaultData / resetDefaultData 内部均引用该单例），
 *     每个用例后 db.close() 释放连接。
 *   - 用例C 仿照 dcaMigration.v4.test.ts：用本地 Dexie 实例以 v1~v4 schema 建库写数，再用
 *     new SmartFinanceDB() 打开触发 v4→v5 升级；beforeEach 用 Dexie.delete 清空，afterEach 关闭实例。
 *   两个 describe 块顺序执行，用例A/B/D 的 db.close() 在用例C 的 Dexie.delete 之前完成，保证无悬挂连接。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import {
  db, // 单例，initializeDefaultData / resetDefaultData 内部引用它
  initializeDefaultData,
  resetDefaultData,
  SmartFinanceDB, // 真实类，用于触发 version(5) 升级
} from './database';
import { AccountType } from '../types';
import { AccountTypeIcons } from '../config/constants';

const TS = '2024-01-01T00:00:00.000Z';
const CMB_CREDIT_ID = 'acc_cmb_credit';
const CMB_DEBIT_ID = 'acc_cmb_debit';

// ==================== 用例 A / B / D：默认账户体系、复活防护、枚举保留 ====================
describe('v5 — 默认账户体系 / 复活防护 / BANK_CREDIT 枚举保留', () => {
  beforeEach(async () => {
    await db.open();
    // 清空账户/分类/平台映射，确保 initializeDefaultData 会重新种入默认数据
    await db.transaction(
      'rw',
      db.accounts,
      db.categories,
      db.platformMappings,
      async () => {
        await db.accounts.clear();
        await db.categories.clear();
        await db.platformMappings.clear();
      },
    );
  });

  afterEach(async () => {
    // 释放单例连接，避免与「迁移」用例的 new SmartFinanceDB() 升级冲突
    try {
      db.close();
    } catch {
      /* 关闭失败不影响用例隔离（用例C 的 beforeEach 会 Dexie.delete 重建） */
    }
  });

  it('用例B：清空后 initializeDefaultData 写入 7 个默认账户，且不含 acc_cmb_credit', async () => {
    await initializeDefaultData();

    const accounts = await db.accounts.toArray();
    expect(accounts.length).toBe(7);

    const ids = accounts.map((a) => a.id);
    // 关键：已彻底移除
    expect(ids).not.toContain(CMB_CREDIT_ID);
    // 其余默认账户仍然存在（部分采样）
    expect(ids).toContain(CMB_DEBIT_ID);
    expect(ids).toContain('acc_boc_debit');
    expect(ids).toContain('acc_alipay');
    expect(ids).toContain('acc_citic_securities');
  });

  it('用例A：删除 acc_cmb_credit 后 resetDefaultData 不会复活它（复活防护）', async () => {
    // 1) 先种入默认账户（已不含 acc_cmb_credit）
    await initializeDefaultData();

    // 2) 手动种入一个遗留的 acc_cmb_credit 账户（模拟老用户升级前的默认账户）
    await db.accounts.add({
      id: CMB_CREDIT_ID,
      name: '招商银行信用卡',
      type: AccountType.BANK_CREDIT,
      balance: 0,
      currency: 'CNY',
      icon: '💳',
      note: '',
      createdAt: TS,
      updatedAt: TS,
    } as any);
    expect(await db.accounts.get(CMB_CREDIT_ID)).toBeDefined();

    // 3) 删除它
    await db.accounts.delete(CMB_CREDIT_ID);
    expect(await db.accounts.get(CMB_CREDIT_ID)).toBeUndefined();

    // 4) 触发「恢复默认账户与分类」
    await resetDefaultData();

    // 关键断言：不应被默认列表种回（证明不会复活）
    expect(await db.accounts.get(CMB_CREDIT_ID)).toBeUndefined();
    expect((await db.accounts.toArray()).map((a) => a.id)).not.toContain(CMB_CREDIT_ID);
  });

  it('用例D：AccountType.BANK_CREDIT 仍可从 Object.values 取到，且图标已保留（手动添加信用卡能力未破坏）', () => {
    expect(AccountType.BANK_CREDIT).toBe('BANK_CREDIT');
    expect(Object.values(AccountType)).toContain('BANK_CREDIT');
    // 手动「添加账户」仍可选择信用卡类型（枚举 + 图标均已保留）
    expect(AccountTypeIcons[AccountType.BANK_CREDIT]).toBeDefined();
  });
});

// ==================== 用例 C：v4→v5 迁移真正删除既有 acc_cmb_credit 记录 ====================
describe('v4→v5 迁移 — 真正删除 acc_cmb_credit 账户及其持仓', () => {
  let v5: SmartFinanceDB | null = null;

  /**
   * 忠实复刻 database.ts 的 v1~v4 schema，仅在本地建一个 v4 实例并写入：
   *   - 一个 acc_cmb_credit 账户（余额非 0，模拟老用户真实使用的信用卡）
   *   - 一条 accountId = acc_cmb_credit 的持仓（验证「无孤儿数据」）
   *   - 一个 acc_cmb_debit 账户（验证其他账户不受影响）
   */
  async function seedV4(): Promise<void> {
    const v4local: any = new Dexie('SmartFinanceDB');
    v4local.version(1).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    });
    v4local.version(2).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    });
    v4local.version(3).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    });
    v4local.version(4).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
      dcaPlans: 'id,accountId,fundCode,type,nextDeductionDate,createdAt',
      dcaRecords: 'id,planId,accountId,basisDate',
    });

    await v4local.open();
    await v4local.transaction(
      'rw',
      v4local.accounts,
      v4local.investments,
      async () => {
        await v4local.accounts.add({
          id: CMB_CREDIT_ID,
          name: '招商银行信用卡',
          type: 'BANK_CREDIT',
          balance: 5000,
          currency: 'CNY',
          icon: '💳',
          note: '',
          createdAt: TS,
          updatedAt: TS,
        });
        await v4local.accounts.add({
          id: CMB_DEBIT_ID,
          name: '招商银行储蓄卡',
          type: 'BANK_DEBIT',
          balance: 100,
          currency: 'CNY',
          icon: '🏦',
          note: '',
          createdAt: TS,
          updatedAt: TS,
        });
        await v4local.investments.add({
          id: 'inv_cmb',
          fundCode: '000001',
          fundName: '基金C',
          shares: 10,
          costPrice: 1,
          currentPrice: 1.2,
          costAmount: 10,
          marketValue: 12,
          profitLoss: 2,
          profitLossRate: 20,
          holdingType: 'FUND',
          accountId: CMB_CREDIT_ID,
          buyDate: '2023-06-01',
          createdAt: TS,
          updatedAt: TS,
        });
      },
    );
    await v4local.close();
  }

  /** 用真实的 SmartFinanceDB(v5) 类打开并触发 v4→v5 升级，返回独立实例 */
  async function openV5(): Promise<SmartFinanceDB> {
    v5 = new SmartFinanceDB();
    await v5.open();
    return v5;
  }

  beforeEach(async () => {
    await Dexie.delete('SmartFinanceDB').catch(() => {});
  });

  afterEach(async () => {
    if (v5) {
      try {
        v5.close();
      } catch {
        /* 关闭失败不影响用例隔离（已在 beforeEach 中 delete 重建） */
      }
      v5 = null;
    }
  });

  it('用例C：v5 迁移删除 acc_cmb_credit 账户与其持仓（无孤儿数据），且不影响其他账户', async () => {
    await seedV4();
    const db5 = await openV5();

    // (1) acc_cmb_credit 账户已被删除
    expect(await db5.accounts.get(CMB_CREDIT_ID)).toBeUndefined();

    // (2) 其持仓也已被删除（无孤儿数据）
    expect(await db5.investments.where('accountId').equals(CMB_CREDIT_ID).count()).toBe(0);

    // (3) 其他账户不受影响
    expect(await db5.accounts.get(CMB_DEBIT_ID)).toBeDefined();
  });
});

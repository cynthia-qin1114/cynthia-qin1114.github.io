import { db } from '../database';
import type { Account, CreateAccountDTO, UpdateAccountDTO, AccountType } from '../../types';
import { generateId, now } from '../../utils/id';

/**
 * AccountRepository — 账户数据访问层
 * 提供账户CRUD、余额操作、总资产计算
 */
export class AccountRepository {
  /**
   * 获取所有账户（按创建时间排序）
   */
  async getAll(): Promise<Account[]> {
    return db.accounts.orderBy('createdAt').toArray();
  }

  /**
   * 根据ID获取账户
   */
  async getById(id: string): Promise<Account | undefined> {
    return db.accounts.get(id);
  }

  /**
   * 创建账户
   */
  async create(dto: CreateAccountDTO): Promise<Account> {
    const timestamp = now();
    const account: Account = {
      id: generateId(),
      name: dto.name,
      type: dto.type,
      balance: dto.balance,
      currency: dto.currency || 'CNY',
      icon: dto.icon || '💳',
      note: dto.note || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.accounts.add(account);
    return account;
  }

  /**
   * 更新账户
   */
  async update(id: string, dto: UpdateAccountDTO): Promise<void> {
    const existing = await db.accounts.get(id);
    if (!existing) {
      throw new Error(`Account not found: ${id}`);
    }
    const updated: Account = {
      ...existing,
      ...dto,
      updatedAt: now(),
    };
    await db.accounts.put(updated);
  }

  /**
   * 删除账户
   * 级联删除该账户下持仓（investments），避免孤儿持仓继续计入投资列表 / 账户余额。
   * 交易记录保留（历史不丢），仅不再关联此账户。
   */
  async delete(id: string): Promise<void> {
    await db.investments.where('accountId').equals(id).delete();
    await db.accounts.delete(id);
  }

  /**
   * 调整账户余额
   * @param id 账户ID
   * @param delta 余额变化量（正数增加，负数减少）
   */
  async adjustBalance(id: string, delta: number): Promise<void> {
    const account = await db.accounts.get(id);
    if (!account) {
      throw new Error(`Account not found: ${id}`);
    }
    account.balance += delta;
    account.updatedAt = now();
    await db.accounts.put(account);
  }

  /**
   * 转账：从一个账户到另一个账户
   */
  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    await db.transaction('rw', db.accounts, async () => {
      const fromAccount = await db.accounts.get(fromId);
      const toAccount = await db.accounts.get(toId);
      if (!fromAccount || !toAccount) {
        throw new Error('Source or target account not found');
      }
      const timestamp = now();
      fromAccount.balance -= amount;
      fromAccount.updatedAt = timestamp;
      toAccount.balance += amount;
      toAccount.updatedAt = timestamp;
      await db.accounts.put(fromAccount);
      await db.accounts.put(toAccount);
    });
  }

  /**
   * 计算总资产（所有账户余额之和）
   * 信用卡余额为负数，自动计算负债
   */
  async getTotalAssets(): Promise<{ totalAssets: number; totalLiabilities: number; netAssets: number }> {
    const accounts = await db.accounts.toArray();
    let totalAssets = 0;
    let totalLiabilities = 0;
    for (const account of accounts) {
      if (account.balance >= 0) {
        totalAssets += account.balance;
      } else {
        totalLiabilities += Math.abs(account.balance);
      }
    }
    return {
      totalAssets,
      totalLiabilities,
      netAssets: totalAssets - totalLiabilities,
    };
  }

  /**
   * 按账户下所有持仓市值汇总，回写 Account.balance。
   *
   * 规则（见架构 §7）：
   * - 有持仓：balance = Σ(该账户下所有 holding.marketValue)（含 CASH活期 + WEALTH理财 + FUND基金）
   * - 无持仓：保持用户手填 balance 不变（老账户兼容），跳过写入
   *
   * @param accountId 账户 id
   */
  async recalcBalanceFromHoldings(accountId: string): Promise<void> {
    if (!accountId) return;
    const holdings = await db.investments.where('accountId').equals(accountId).toArray();
    if (holdings.length === 0) return; // 无持仓，保留手填余额
    const balance = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
    const acc = await db.accounts.get(accountId);
    if (acc) {
      await db.accounts.put({ ...acc, balance, updatedAt: now() });
    }
  }

  /**
   * 按类型筛选账户
   */
  async getByType(type: AccountType): Promise<Account[]> {
    return db.accounts.where('type').equals(type).toArray();
  }

  /**
   * 批量插入账户（用于数据导入）
   */
  async bulkCreate(accounts: Account[]): Promise<void> {
    await db.accounts.bulkAdd(accounts);
  }

  /**
   * 清空所有账户
   */
  async clearAll(): Promise<void> {
    await db.accounts.clear();
  }
}

/** 账户Repository单例 */
export const accountRepository = new AccountRepository();

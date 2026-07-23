import { db } from '../database';
import { accountRepository } from './accountRepository';
import { TransactionType } from '../../types';
import type {
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilter,
  MonthlySummary,
  CategorySummary,
} from '../../types';
import { generateId, now } from '../../utils/id';
import { getMonthKey } from '../../utils/format';

/**
 * TransactionRepository — 交易数据访问层
 * 提供交易CRUD、日期范围查询、月度汇总、分类汇总
 */
export class TransactionRepository {
  /**
   * 获取所有交易（按日期倒序）
   */
  async getAll(): Promise<Transaction[]> {
    const transactions = await db.transactions.toArray();
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * 根据ID获取交易
   */
  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  }

  /**
   * 创建交易（同时更新账户余额）
   */
  async create(dto: CreateTransactionDTO): Promise<Transaction> {
    const timestamp = now();
    const transaction: Transaction = {
      id: generateId(),
      accountId: dto.accountId,
      type: dto.type,
      amount: dto.amount,
      category: dto.category,
      platform: dto.platform || '',
      note: dto.note || '',
      date: dto.date,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.add(transaction);
      // 根据交易类型更新账户余额
      const delta = this.calculateBalanceDelta(dto.type, dto.amount);
      await accountRepository.adjustBalance(dto.accountId, delta);
    });

    return transaction;
  }

  /**
   * 更新交易（需回滚旧余额、应用新余额）
   */
  async update(id: string, dto: UpdateTransactionDTO): Promise<void> {
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      const existing = await db.transactions.get(id);
      if (!existing) {
        throw new Error(`Transaction not found: ${id}`);
      }

      // 回滚旧余额
      const oldDelta = this.calculateBalanceDelta(existing.type, existing.amount);
      await accountRepository.adjustBalance(existing.accountId, -oldDelta);

      // 应用新余额
      const newType = dto.type ?? existing.type;
      const newAmount = dto.amount ?? existing.amount;
      const newAccountId = dto.accountId ?? existing.accountId;
      const newDelta = this.calculateBalanceDelta(newType, newAmount);
      await accountRepository.adjustBalance(newAccountId, newDelta);

      // 更新交易记录
      const updated: Transaction = {
        ...existing,
        ...dto,
        updatedAt: now(),
      };
      await db.transactions.put(updated);
    });
  }

  /**
   * 删除交易（回滚账户余额）
   */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      const transaction = await db.transactions.get(id);
      if (!transaction) return;

      // 回滚余额
      const delta = this.calculateBalanceDelta(transaction.type, transaction.amount);
      await accountRepository.adjustBalance(transaction.accountId, -delta);

      await db.transactions.delete(id);
    });
  }

  /**
   * 按筛选条件查询交易
   */
  async query(filter: TransactionFilter): Promise<Transaction[]> {
    let collection = db.transactions.toCollection();

    const results = await collection.toArray();
    let filtered = results;

    if (filter.accountId) {
      filtered = filtered.filter((t) => t.accountId === filter.accountId);
    }
    if (filter.type) {
      filtered = filtered.filter((t) => t.type === filter.type);
    }
    if (filter.category) {
      filtered = filtered.filter((t) => t.category === filter.category);
    }
    if (filter.platform) {
      filtered = filtered.filter((t) => t.platform === filter.platform);
    }
    if (filter.startDate) {
      const startTime = new Date(filter.startDate).getTime();
      filtered = filtered.filter((t) => new Date(t.date).getTime() >= startTime);
    }
    if (filter.endDate) {
      const endTime = new Date(filter.endDate).getTime();
      filtered = filtered.filter((t) => new Date(t.date).getTime() <= endTime);
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.note.toLowerCase().includes(kw) ||
          t.category.toLowerCase().includes(kw) ||
          t.platform.toLowerCase().includes(kw)
      );
    }

    // 按日期倒序
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * 按日期范围查询
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return this.query({ startDate, endDate });
  }

  /**
   * 获取最近N条交易
   */
  async getRecent(limit: number = 10): Promise<Transaction[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  }

  /**
   * 月度收支汇总
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const transactions = await db.transactions.toArray();
    const monthTransactions = transactions.filter((t) => getMonthKey(t.date) === monthStr);

    let income = 0;
    let expense = 0;
    for (const t of monthTransactions) {
      if (t.type === TransactionType.INCOME) {
        income += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        expense += t.amount;
      }
    }

    return {
      month: monthStr,
      income,
      expense,
      net: income - expense,
    };
  }

  /**
   * 获取近N个月汇总
   */
  async getRecentMonthlySummaries(monthCount: number): Promise<MonthlySummary[]> {
    const summaries: MonthlySummary[] = [];
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const summary = await this.getMonthlySummary(date.getFullYear(), date.getMonth() + 1);
      summaries.push(summary);
    }
    return summaries;
  }

  /**
   * 分类汇总
   */
  async getCategorySummary(
    type: TransactionType,
    startDate?: string,
    endDate?: string
  ): Promise<CategorySummary[]> {
    let transactions = await db.transactions.where('type').equals(type).toArray();

    if (startDate) {
      const startTime = new Date(startDate).getTime();
      transactions = transactions.filter((t) => new Date(t.date).getTime() >= startTime);
    }
    if (endDate) {
      const endTime = new Date(endDate).getTime();
      transactions = transactions.filter((t) => new Date(t.date).getTime() <= endTime);
    }

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    for (const t of transactions) {
      const existing = categoryMap.get(t.category) ?? { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count += 1;
      categoryMap.set(t.category, existing);
      totalAmount += t.amount;
    }

    const results: CategorySummary[] = [];
    for (const [category, data] of categoryMap.entries()) {
      results.push({
        category,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        count: data.count,
      });
    }

    return results.sort((a, b) => b.amount - a.amount);
  }

  /**
   * 获取指定账户的所有交易
   */
  async getByAccountId(accountId: string): Promise<Transaction[]> {
    return db.transactions.where('accountId').equals(accountId).reverse().sortBy('date');
  }

  /**
   * 清空所有交易
   */
  async clearAll(): Promise<void> {
    await db.transactions.clear();
  }

  /**
   * 计算余额变化量
   * 收入：正数（增加余额）
   * 支出：负数（减少余额）
   * 转账：0（转账在transfer方法中单独处理）
   */
  private calculateBalanceDelta(type: TransactionType, amount: number): number {
    switch (type) {
      case TransactionType.INCOME:
        return amount;
      case TransactionType.EXPENSE:
        return -amount;
      case TransactionType.TRANSFER:
        return 0;
      default:
        return 0;
    }
  }
}

/** 交易Repository单例 */
export const transactionRepository = new TransactionRepository();

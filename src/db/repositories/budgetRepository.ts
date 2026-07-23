import { db } from '../database';
import type { Budget } from '../../types';
import { generateId, now } from '../../utils/id';

/**
 * BudgetRepository — 预算数据访问层 (P2预留)
 * 提供预算CRUD
 */
export class BudgetRepository {
  /**
   * 获取所有预算
   */
  async getAll(): Promise<Budget[]> {
    return db.budgets.toArray();
  }

  /**
   * 根据ID获取预算
   */
  async getById(id: string): Promise<Budget | undefined> {
    return db.budgets.get(id);
  }

  /**
   * 按类别获取预算
   */
  async getByCategory(category: string): Promise<Budget | undefined> {
    const budgets = await db.budgets.where('category').equals(category).toArray();
    return budgets[0];
  }

  /**
   * 创建预算
   */
  async create(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const timestamp = now();
    const newBudget: Budget = {
      id: generateId(),
      ...budget,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.budgets.add(newBudget);
    return newBudget;
  }

  /**
   * 更新预算
   */
  async update(id: string, dto: Partial<Budget>): Promise<void> {
    const existing = await db.budgets.get(id);
    if (!existing) {
      throw new Error(`Budget not found: ${id}`);
    }
    const updated: Budget = {
      ...existing,
      ...dto,
      updatedAt: now(),
    };
    await db.budgets.put(updated);
  }

  /**
   * 删除预算
   */
  async delete(id: string): Promise<void> {
    await db.budgets.delete(id);
  }

  /**
   * 清空所有预算
   */
  async clearAll(): Promise<void> {
    await db.budgets.clear();
  }
}

/** 预算 Repository 单例 */
export const budgetRepository = new BudgetRepository();

import { db } from '../database';
import type { Category, CreateCategoryDTO } from '../../types';
import { CategoryType } from '../../types';
import { generateId } from '../../utils/id';

/**
 * CategoryRepository — 分类数据访问层
 * 提供分类CRUD
 */
export class CategoryRepository {
  /**
   * 获取所有分类（按排序顺序）
   */
  async getAll(): Promise<Category[]> {
    const categories = await db.categories.toArray();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 根据ID获取分类
   */
  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  }

  /**
   * 按类型获取分类
   */
  async getByType(type: CategoryType): Promise<Category[]> {
    const categories = await db.categories.where('type').equals(type).toArray();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 创建分类
   */
  async create(dto: CreateCategoryDTO): Promise<Category> {
    const category: Category = {
      id: generateId(),
      name: dto.name,
      type: dto.type,
      icon: dto.icon || '📝',
      parentId: dto.parentId,
      sortOrder: dto.sortOrder,
    };

    await db.categories.add(category);
    return category;
  }

  /**
   * 更新分类
   */
  async update(id: string, dto: Partial<CreateCategoryDTO>): Promise<void> {
    const existing = await db.categories.get(id);
    if (!existing) {
      throw new Error(`Category not found: ${id}`);
    }
    const updated = { ...existing, ...dto };
    await db.categories.put(updated);
  }

  /**
   * 删除分类
   */
  async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  }

  /**
   * 清空所有分类
   */
  async clearAll(): Promise<void> {
    await db.categories.clear();
  }
}

/** 分类 Repository 单例 */
export const categoryRepository = new CategoryRepository();

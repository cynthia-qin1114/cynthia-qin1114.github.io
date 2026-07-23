import { db } from '../database';
import { generateId, now } from '../../utils/id';
import { DcaDeductionMode } from '../../types';
import type { DcaPlan, DcaRecord, CreateDcaPlanDTO } from '../../types';

/**
 * DcaPlanRepository — 定投计划 / 扣款记录数据访问层
 *
 * 覆盖 dcaPlans / dcaRecords 两张表的完整 CRUD，以及调度所需的
 * `getEnabledDuePlans`（enabled && nextDeductionDate <= today）与
 * `getRecordsByPlan`（计划扣款历史）。
 */
export class DcaPlanRepository {
  /** 获取全部计划（按创建时间升序） */
  async getAllPlans(): Promise<DcaPlan[]> {
    return db.dcaPlans.orderBy('createdAt').toArray();
  }

  /** 按 id 获取计划 */
  async getPlan(id: string): Promise<DcaPlan | undefined> {
    return db.dcaPlans.get(id);
  }

  /** 创建计划（补全 id / 默认值 / 时间戳） */
  async createPlan(dto: CreateDcaPlanDTO): Promise<DcaPlan> {
    const timestamp = now();
    const plan: DcaPlan = {
      id: generateId(),
      type: dto.type,
      accountId: dto.accountId,
      targetInvestmentId: dto.targetInvestmentId,
      fundCode: dto.fundCode ?? '',
      fundName: dto.fundName,
      amount: dto.amount,
      frequency: dto.frequency,
      nextDeductionDate: dto.nextDeductionDate,
      enabled: dto.enabled ?? true,
      deductionMode: dto.deductionMode ?? DcaDeductionMode.AUTO,
      benchmarkIndex: dto.benchmarkIndex,
      benchmarkMa: dto.benchmarkMa,
      investedPeriods: dto.investedPeriods ?? 0,
      deductionRule: dto.deductionRule,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.dcaPlans.add(plan);
    return plan;
  }

  /** 局部更新计划 */
  async updatePlan(id: string, dto: Partial<CreateDcaPlanDTO>): Promise<void> {
    const existing = await db.dcaPlans.get(id);
    if (!existing) {
      throw new Error(`DcaPlan not found: ${id}`);
    }
    const updated: DcaPlan = {
      ...existing,
      ...dto,
      id,
      updatedAt: now(),
    };
    await db.dcaPlans.put(updated);
  }

  /** 删除计划（级联删除其全部扣款记录） */
  async deletePlan(id: string): Promise<void> {
    await db.transaction('rw', db.dcaPlans, db.dcaRecords, async () => {
      await db.dcaRecords.where('planId').equals(id).delete();
      await db.dcaPlans.delete(id);
    });
  }

  /**
   * 获取到期且启用的计划：enabled && nextDeductionDate <= today。
   * 依赖 dcaPlans 的 nextDeductionDate 索引；ISO 日期字符串可直接按字典序比较。
   */
  async getEnabledDuePlans(today: string): Promise<DcaPlan[]> {
    return db.dcaPlans
      .where('nextDeductionDate')
      .belowOrEqual(today)
      .filter((plan) => plan.enabled)
      .toArray();
  }

  /** 创建一条扣款记录 */
  async createRecord(dto: Omit<DcaRecord, 'id'>): Promise<DcaRecord> {
    const record: DcaRecord = {
      id: generateId(),
      ...dto,
    };
    await db.dcaRecords.add(record);
    return record;
  }

  /** 获取某计划的全部扣款记录（按扣款日倒序） */
  async getRecordsByPlan(planId: string): Promise<DcaRecord[]> {
    return db.dcaRecords.where('planId').equals(planId).toArray();
  }

  /** 获取全部扣款记录（按扣款日倒序），供概览聚合使用 */
  async getAllRecords(): Promise<DcaRecord[]> {
    return db.dcaRecords.orderBy('basisDate').reverse().toArray();
  }
}

/** 定投 Repository 单例 */
export const dcaRepository = new DcaPlanRepository();

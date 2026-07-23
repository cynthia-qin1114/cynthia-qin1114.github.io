import { create } from 'zustand';
import { format } from 'date-fns';
import { dcaRepository } from '../db/repositories/dcaRepository';
import { dcaService } from '../services/dcaService';
import { useAccountStore } from './useAccountStore';
import { useInvestmentStore } from './useInvestmentStore';
import type {
  DcaPlan,
  DcaRecord,
  CreateDcaPlanDTO,
  DcaDeductionResult,
} from '../types';

/**
 * useDcaStore — 定投计划 Zustand Store（对齐 useInvestmentStore 模式）
 *
 * 管理计划 / 记录列表与自动扣款；createPlan 经 dcaService 落库（含目标 FUND 持仓建档），
 * runDueDeductions 触发调度并把结果写入 `lastDeductions`（App 据此弹提醒 Snackbar），
 * 任何写操作后联动 useAccountStore / useInvestmentStore 刷新依赖视图。
 */
interface DcaStore {
  plans: DcaPlan[];
  records: DcaRecord[];
  loading: boolean;
  error: string | null;
  lastDeductions: DcaDeductionResult[]; // 提醒源（App 据其弹 Snackbar）
  fetchPlans: () => Promise<void>;
  createPlan: (dto: CreateDcaPlanDTO) => Promise<void>;
  updatePlan: (id: string, dto: Partial<CreateDcaPlanDTO>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  fetchRecords: (planId?: string) => Promise<void>;
  runDueDeductions: () => Promise<void>;
}

/** 联动刷新账户与投资 Store（余额已在 Repository 层随持仓自动重算） */
const syncLinkedStores = async (): Promise<void> => {
  await useAccountStore.getState().fetchAccounts();
  await useInvestmentStore.getState().fetchInvestments();
};

export const useDcaStore = create<DcaStore>((set) => ({
  plans: [],
  records: [],
  loading: false,
  error: null,
  lastDeductions: [],

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await dcaRepository.getAllPlans();
      set({ plans, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  createPlan: async (dto: CreateDcaPlanDTO) => {
    set({ loading: true, error: null });
    try {
      await dcaService.savePlan(dto);
      const plans = await dcaRepository.getAllPlans();
      set({ plans, loading: false });
      await syncLinkedStores();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  updatePlan: async (id: string, dto: Partial<CreateDcaPlanDTO>) => {
    set({ loading: true, error: null });
    try {
      await dcaRepository.updatePlan(id, dto);
      const plans = await dcaRepository.getAllPlans();
      set({ plans, loading: false });
      await syncLinkedStores();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  deletePlan: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await dcaRepository.deletePlan(id);
      const plans = await dcaRepository.getAllPlans();
      set({ plans, loading: false });
      await syncLinkedStores();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  fetchRecords: async (planId?: string) => {
    set({ loading: true, error: null });
    try {
      const records = planId
        ? await dcaRepository.getRecordsByPlan(planId)
        : await dcaRepository.getAllRecords();
      set({ records, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  runDueDeductions: async () => {
    set({ loading: true, error: null });
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const results = await dcaService.runDueDeductions(today);
      if (results.length > 0) {
        const plans = await dcaRepository.getAllPlans();
        const records = await dcaRepository.getAllRecords();
        set({ plans, records, lastDeductions: results, loading: false });
        await syncLinkedStores();
      } else {
        set({ lastDeductions: [], loading: false });
      }
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },
}));

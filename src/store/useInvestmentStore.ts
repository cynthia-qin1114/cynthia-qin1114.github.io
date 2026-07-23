import { create } from 'zustand';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { useAccountStore } from './useAccountStore';
import type {
  Investment,
  CreateInvestmentDTO,
  UpdateInvestmentDTO,
  InvestmentSummary,
} from '../types';

/**
 * useInvestmentStore — 投资 Zustand Store
 *
 * 管理投资持仓列表、汇总信息；持仓变更（create/update/delete/batchUpsert）后
 * 联动刷新 useAccountStore（账户余额已在 Repository 层随持仓自动重算）。
 */
interface InvestmentStore {
  investments: Investment[];
  loading: boolean;
  error: string | null;
  summary: InvestmentSummary | null;
  refreshing: boolean;
  fetchInvestments: () => Promise<void>;
  createInvestment: (dto: CreateInvestmentDTO) => Promise<void>;
  updateInvestment: (id: string, dto: UpdateInvestmentDTO) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  batchUpsertWealth: (dtos: CreateInvestmentDTO[]) => Promise<void>;
  refreshSummary: () => Promise<void>;
  updateInvestmentPrice: (id: string, currentPrice: number) => Promise<void>;
  setRefreshing: (refreshing: boolean) => void;
}

/** 刷新账户 Store（账户余额已随持仓在 Repository 层重算，这里仅拉取最新值） */
const syncAccountStore = async (): Promise<void> => {
  await useAccountStore.getState().fetchAccounts();
};

export const useInvestmentStore = create<InvestmentStore>((set) => ({
  investments: [],
  loading: false,
  error: null,
  summary: null,
  refreshing: false,

  fetchInvestments: async () => {
    set({ loading: true, error: null });
    try {
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  createInvestment: async (dto: CreateInvestmentDTO) => {
    set({ loading: true, error: null });
    try {
      await investmentRepository.create(dto);
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary, loading: false });
      await syncAccountStore();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  updateInvestment: async (id: string, dto: UpdateInvestmentDTO) => {
    set({ loading: true, error: null });
    try {
      await investmentRepository.update(id, dto);
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary, loading: false });
      await syncAccountStore();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  deleteInvestment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await investmentRepository.delete(id);
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary, loading: false });
      await syncAccountStore();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  batchUpsertWealth: async (dtos: CreateInvestmentDTO[]) => {
    set({ loading: true, error: null });
    try {
      for (const dto of dtos) {
        // 同 accountId + 归一化产品名 覆盖更新，否则新建
        await investmentRepository.upsertByAccountAndName(dto);
      }
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary, loading: false });
      await syncAccountStore();
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  refreshSummary: async () => {
    try {
      const summary = await investmentRepository.getSummary();
      set({ summary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateInvestmentPrice: async (id: string, currentPrice: number) => {
    try {
      await investmentRepository.updatePrice(id, currentPrice);
      const investments = await investmentRepository.getAll();
      const summary = await investmentRepository.getSummary();
      set({ investments, summary });
      await syncAccountStore();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setRefreshing: (refreshing: boolean) => set({ refreshing }),
}));

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

  /**
   * 「账户管理 - 手动录入」创建/覆盖一条持仓（快照语义）。
   * 同 `(accountId, holdingType, 归一化 fundName)` 已存在则**整体覆盖**为最新金额 / 收益，
   * 避免「录一次存一条、叠加累加」（活期/理财/基金当前真实情况变化时不应保留历史数笔）。
   * 过程记录（每笔买入、定投扣款）请走「记账」界面 ——
   * 那里的入账会通过 (accountId, holdingType, fundName) 同步更新对应持仓。
   * 关键坑：之前手动录入路径走 `create()` 直接新增（不幂等），导致用户多次点击保存
   * 同账户同活期会被记录为多条并在投资列表叠加显示。改为 upsert 修复此 Bug。
   */
  createInvestment: async (dto: CreateInvestmentDTO) => {
    set({ loading: true, error: null });
    try {
      await investmentRepository.upsertByAccountAndName(dto);
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

import { create } from 'zustand';
import { accountRepository } from '../db/repositories/accountRepository';
import type { Account, CreateAccountDTO, UpdateAccountDTO } from '../types';

/**
 * useAccountStore — 账户 Zustand Store
 * 管理账户列表、加载状态、总资产
 */
interface AccountStore {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  fetchAccounts: () => Promise<void>;
  createAccount: (dto: CreateAccountDTO) => Promise<void>;
  updateAccount: (id: string, dto: UpdateAccountDTO) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refreshTotalAssets: () => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  loading: false,
  error: null,
  totalAssets: 0,
  totalLiabilities: 0,
  netAssets: 0,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await accountRepository.getAll();
      const totals = await accountRepository.getTotalAssets();
      set({
        accounts,
        loading: false,
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  createAccount: async (dto: CreateAccountDTO) => {
    set({ loading: true, error: null });
    try {
      await accountRepository.create(dto);
      const accounts = await accountRepository.getAll();
      const totals = await accountRepository.getTotalAssets();
      set({
        accounts,
        loading: false,
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  updateAccount: async (id: string, dto: UpdateAccountDTO) => {
    set({ loading: true, error: null });
    try {
      await accountRepository.update(id, dto);
      const accounts = await accountRepository.getAll();
      const totals = await accountRepository.getTotalAssets();
      set({
        accounts,
        loading: false,
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  deleteAccount: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await accountRepository.delete(id);
      const accounts = await accountRepository.getAll();
      const totals = await accountRepository.getTotalAssets();
      set({
        accounts,
        loading: false,
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  refreshTotalAssets: async () => {
    try {
      const totals = await accountRepository.getTotalAssets();
      set({
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));

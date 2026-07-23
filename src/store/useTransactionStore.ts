import { create } from 'zustand';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { accountRepository } from '../db/repositories/accountRepository';
import type {
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilter,
  MonthlySummary,
  TransactionType,
} from '../types';

/**
 * useTransactionStore — 交易 Zustand Store
 * 管理交易列表、加载状态、月度汇总
 */
interface TransactionStore {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  monthlySummary: MonthlySummary | null;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  createTransaction: (dto: CreateTransactionDTO) => Promise<void>;
  updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchMonthlySummary: (year: number, month: number) => Promise<void>;
  getCategorySummary: (
    type: TransactionType,
    startDate?: string,
    endDate?: string
  ) => Promise<{ category: string; amount: number; percentage: number; count: number }[]>;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  loading: false,
  error: null,
  monthlySummary: null,

  fetchTransactions: async (filter?: TransactionFilter) => {
    set({ loading: true, error: null });
    try {
      const transactions = filter
        ? await transactionRepository.query(filter)
        : await transactionRepository.getAll();
      set({ transactions, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  createTransaction: async (dto: CreateTransactionDTO) => {
    set({ loading: true, error: null });
    try {
      await transactionRepository.create(dto);
      // 刷新交易列表和账户余额
      const transactions = await transactionRepository.getAll();
      await accountRepository.getTotalAssets();
      set({ transactions, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  updateTransaction: async (id: string, dto: UpdateTransactionDTO) => {
    set({ loading: true, error: null });
    try {
      await transactionRepository.update(id, dto);
      const transactions = await transactionRepository.getAll();
      set({ transactions, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  deleteTransaction: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await transactionRepository.delete(id);
      const transactions = await transactionRepository.getAll();
      set({ transactions, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  fetchMonthlySummary: async (year: number, month: number) => {
    try {
      const summary = await transactionRepository.getMonthlySummary(year, month);
      set({ monthlySummary: summary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getCategorySummary: async (type: TransactionType, startDate?: string, endDate?: string) => {
    return transactionRepository.getCategorySummary(type, startDate, endDate);
  },
}));

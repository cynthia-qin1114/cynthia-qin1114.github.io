import { useEffect, useCallback, useState } from 'react';
import { useTransactionStore } from '../store/useTransactionStore';
import { useAccountStore } from '../store/useAccountStore';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { ocrService } from '../services/ocrService';
import { classificationService } from '../services/classificationService';
import type { CreateTransactionDTO, UpdateTransactionDTO, TransactionFilter, TransactionType } from '../types';

/**
 * useTransaction — 交易Hooks
 * 封装交易Store操作，集成OCR和分类引擎
 */
export const useTransaction = () => {
  const {
    transactions,
    loading,
    error,
    monthlySummary,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchMonthlySummary,
  } = useTransactionStore();

  const { refreshTotalAssets } = useAccountStore();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 创建交易
   */
  const handleCreate = useCallback(
    async (data: {
      accountId: string;
      type: TransactionType;
      amount: number;
      category: string;
      platform?: string;
      note?: string;
      date?: string;
    }) => {
      const dto: CreateTransactionDTO = {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        category: data.category,
        platform: data.platform ?? '',
        note: data.note ?? '',
        date: data.date ?? new Date().toISOString(),
      };
      await createTransaction(dto);
      await refreshTotalAssets();

      // 学习记忆：如果指定了platform和category，记录映射关系
      if (dto.platform && dto.category) {
        classificationService.learn(dto.platform, dto.category);
      }
    },
    [createTransaction, refreshTotalAssets]
  );

  /**
   * 更新交易
   */
  const handleUpdate = useCallback(
    async (id: string, data: Partial<CreateTransactionDTO>) => {
      const dto: UpdateTransactionDTO = { ...data };
      await updateTransaction(id, dto);
      await refreshTotalAssets();
    },
    [updateTransaction, refreshTotalAssets]
  );

  /**
   * 删除交易
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      await refreshTotalAssets();
    },
    [deleteTransaction, refreshTotalAssets]
  );

  /**
   * 按筛选条件查询
   */
  const handleFilter = useCallback(
    async (filter: TransactionFilter) => {
      await fetchTransactions(filter);
    },
    [fetchTransactions]
  );

  /**
   * OCR识别图片
   * @param image 图片File或URL
   * @returns 识别结果（文本、金额、日期、分类建议）
   */
  const handleOcr = useCallback(
    async (image: File | string): Promise<{
      text: string;
      amounts: number[];
      date: string | null;
      classification: { platform: string; category: string } | null;
    }> => {
      setOcrLoading(true);
      setOcrError(null);
      try {
        // 初始化OCR
        await ocrService.initialize();

        // 识别文字
        const text = await ocrService.recognize(image);
        setOcrResult(text);

        // 提取金额
        const amounts = ocrService.extractAmounts(text);

        // 提取日期
        const date = ocrService.extractDate(text);

        // 分类识别（基于OCR文本中的商户/平台名称）
        let classification = null;
        if (text.trim().length > 0) {
          const result = await classificationService.classify(text);
          classification = {
            platform: result.platform,
            category: result.category,
          };
        }

        setOcrLoading(false);
        return { text, amounts, date, classification };
      } catch (error) {
        setOcrError((error as Error).message);
        setOcrLoading(false);
        return {
          text: '',
          amounts: [],
          date: null,
          classification: null,
        };
      }
    },
    []
  );

  /**
   * 加载当月汇总
   */
  const loadMonthlySummary = useCallback(
    (year: number, month: number) => {
      fetchMonthlySummary(year, month);
    },
    [fetchMonthlySummary]
  );

  /**
   * 获取最近交易
   */
  const getRecentTransactions = useCallback(
    async (limit: number = 10) => {
      return transactionRepository.getRecent(limit);
    },
    []
  );

  return {
    transactions,
    loading,
    error,
    monthlySummary,
    ocrLoading,
    ocrResult,
    ocrError,
    fetchTransactions,
    createTransaction: handleCreate,
    updateTransaction: handleUpdate,
    deleteTransaction: handleDelete,
    filter: handleFilter,
    ocr: handleOcr,
    loadMonthlySummary,
    getRecentTransactions,
  };
};

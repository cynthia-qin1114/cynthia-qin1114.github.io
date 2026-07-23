import { useEffect, useState, useCallback } from 'react';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { accountRepository } from '../db/repositories/accountRepository';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { TransactionType } from '../types';
import type {
  MonthlySummary,
  CategorySummary,
  AccountDistribution,
  AssetOverview,
  AssetTrendPoint,
} from '../types';
import { TREND_MONTH_COUNT } from '../config/constants';

/**
 * useReport — 报表Hooks
 * 聚合多Repository数据，提供报表所需的数据查询接口
 */
export const useReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [incomeCategorySummary, setIncomeCategorySummary] = useState<CategorySummary[]>([]);
  const [expenseCategorySummary, setExpenseCategorySummary] = useState<CategorySummary[]>([]);
  const [accountDistribution, setAccountDistribution] = useState<AccountDistribution[]>([]);
  const [assetOverview, setAssetOverview] = useState<AssetOverview | null>(null);
  const [assetTrend, setAssetTrend] = useState<AssetTrendPoint[]>([]);

  /**
   * 加载收支趋势数据（近6个月）
   */
  const fetchMonthlySummaries = useCallback(async () => {
    try {
      const summaries = await transactionRepository.getRecentMonthlySummaries(TREND_MONTH_COUNT);
      setMonthlySummaries(summaries);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  /**
   * 加载分类汇总
   */
  const fetchCategorySummaries = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        const [income, expense] = await Promise.all([
          transactionRepository.getCategorySummary(TransactionType.INCOME, startDate, endDate),
          transactionRepository.getCategorySummary(TransactionType.EXPENSE, startDate, endDate),
        ]);
        setIncomeCategorySummary(income);
        setExpenseCategorySummary(expense);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    []
  );

  /**
   * 加载账户分布
   */
  const fetchAccountDistribution = useCallback(async () => {
    try {
      const accounts = await accountRepository.getAll();
      const total = accounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
      const distribution: AccountDistribution[] = accounts.map((acc) => ({
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        balance: acc.balance,
        percentage: total > 0 ? (Math.abs(acc.balance) / total) * 100 : 0,
      }));
      setAccountDistribution(distribution);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  /**
   * 加载资产概览
   */
  const fetchAssetOverview = useCallback(async () => {
    try {
      const totals = await accountRepository.getTotalAssets();
      const investmentSummary = await investmentRepository.getSummary();
      const overview: AssetOverview = {
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        netAssets: totals.netAssets,
        investmentValue: investmentSummary.totalMarketValue,
      };
      setAssetOverview(overview);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  /**
   * 加载资产趋势（基于历史交易推算）
   */
  const fetchAssetTrend = useCallback(async () => {
    try {
      const summaries = await transactionRepository.getRecentMonthlySummaries(TREND_MONTH_COUNT);
      const investmentSummary = await investmentRepository.getSummary();
      const currentTotals = await accountRepository.getTotalAssets();

      const trendPoints: AssetTrendPoint[] = [];
      let cumulativeNet = currentTotals.netAssets;

      // 从当前月份倒推
      for (let i = summaries.length - 1; i >= 0; i--) {
        const summary = summaries[i];
        const date = `${summary.month}-01`;
        trendPoints.unshift({
          date,
          totalAssets: cumulativeNet,
          investmentValue: i === 0 ? investmentSummary.totalMarketValue : investmentSummary.totalMarketValue * 0.95,
          cashAssets: cumulativeNet - (i === 0 ? investmentSummary.totalMarketValue : investmentSummary.totalMarketValue * 0.95),
        });
        cumulativeNet -= summary.net;
      }

      setAssetTrend(trendPoints);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  /**
   * 加载所有报表数据
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchMonthlySummaries(),
      fetchCategorySummaries(),
      fetchAccountDistribution(),
      fetchAssetOverview(),
      fetchAssetTrend(),
    ]);
    setLoading(false);
  }, [fetchMonthlySummaries, fetchCategorySummaries, fetchAccountDistribution, fetchAssetOverview, fetchAssetTrend]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    loading,
    error,
    monthlySummaries,
    incomeCategorySummary,
    expenseCategorySummary,
    accountDistribution,
    assetOverview,
    assetTrend,
    fetchAll,
    fetchMonthlySummaries,
    fetchCategorySummaries,
    fetchAccountDistribution,
    fetchAssetOverview,
    fetchAssetTrend,
  };
};

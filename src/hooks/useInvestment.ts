import { useEffect, useCallback } from 'react';
import { useInvestmentStore } from '../store/useInvestmentStore';
import { investmentService } from '../services/investmentService';
import { HoldingType } from '../types';
import type { CreateInvestmentDTO, UpdateInvestmentDTO } from '../types';

/**
 * useInvestment — 投资Hooks
 * 封装投资Store操作，集成净值刷新、理财批量 upsert、账户联动
 */
export const useInvestment = () => {
  const {
    investments,
    loading,
    error,
    summary,
    refreshing,
    fetchInvestments,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    batchUpsertWealth,
    refreshSummary,
    updateInvestmentPrice,
    setRefreshing,
  } = useInvestmentStore();

  useEffect(() => {
    fetchInvestments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 添加投资（兼容 FUND / WEALTH）。
   * FUND 且缺名称/净值时尝试从 API 补全。
   */
  const handleCreate = useCallback(
    async (data: CreateInvestmentDTO) => {
      const holdingType = data.holdingType ?? HoldingType.FUND;

      // 理财/活期直接透传（无需查净值）
      if (holdingType !== HoldingType.FUND) {
        await createInvestment(data);
        return;
      }

      // 基金：缺名称或净值时尝试补全
      let fundName = data.fundName ?? '';
      let currentPrice = data.currentPrice ?? 0;
      const fundCode = data.fundCode ?? '';

      if (fundCode && (!fundName || currentPrice === 0)) {
        try {
          const nav = await investmentService.getCurrentPrice(fundCode);
          if (nav && nav > 0) currentPrice = currentPrice || nav;
          const name = await investmentService.getFundName(fundCode);
          if (name) fundName = fundName || name;
        } catch (err) {
          console.warn('Failed to fetch fund info:', err);
        }
      }

      const dto: CreateInvestmentDTO = {
        holdingType: HoldingType.FUND,
        accountId: data.accountId,
        fundCode,
        fundName: fundName || `基金${fundCode}`,
        shares: data.shares ?? 0,
        costPrice: data.costPrice ?? 0,
        currentPrice: currentPrice || (data.costPrice ?? 0),
        buyDate: data.buyDate ?? new Date().toISOString().split('T')[0],
      };
      await createInvestment(dto);
    },
    [createInvestment]
  );

  /**
   * 更新投资（透传 accountId/holdingType 相关字段）
   */
  const handleUpdate = useCallback(
    async (id: string, data: UpdateInvestmentDTO) => {
      await updateInvestment(id, data);
    },
    [updateInvestment]
  );

  /**
   * 批量 upsert 理财（OCR 多条确认后保存）
   */
  const handleBatchUpsertWealth = useCallback(
    async (dtos: CreateInvestmentDTO[]) => {
      await batchUpsertWealth(dtos);
    },
    [batchUpsertWealth]
  );

  /**
   * 删除投资
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteInvestment(id);
    },
    [deleteInvestment]
  );

  /**
   * 刷新所有持仓净值
   */
  const handleRefreshPrices = useCallback(async () => {
    if (investments.length === 0) return;
    setRefreshing(true);
    try {
      await investmentService.refreshAllPrices(investments);
      await fetchInvestments();
      await refreshSummary();
    } catch (error) {
      console.error('Failed to refresh prices:', error);
    } finally {
      setRefreshing(false);
    }
  }, [investments, fetchInvestments, refreshSummary, setRefreshing]);

  /**
   * 刷新单个持仓净值
   */
  const handleRefreshSinglePrice = useCallback(
    async (id: string, fundCode: string) => {
      try {
        const price = await investmentService.getCurrentPrice(fundCode);
        if (price && price > 0) {
          await updateInvestmentPrice(id, price);
        }
      } catch (error) {
        console.error('Failed to refresh single price:', error);
      }
    },
    [updateInvestmentPrice]
  );

  /**
   * 获取投资总额
   */
  const getTotalInvestmentValue = useCallback((): number => {
    return summary?.totalMarketValue ?? 0;
  }, [summary]);

  return {
    investments,
    loading,
    error,
    summary,
    refreshing,
    fetchInvestments,
    createInvestment: handleCreate,
    updateInvestment: handleUpdate,
    deleteInvestment: handleDelete,
    batchUpsertWealth: handleBatchUpsertWealth,
    refreshPrices: handleRefreshPrices,
    refreshSinglePrice: handleRefreshSinglePrice,
    refreshSummary,
    getTotalInvestmentValue,
  };
};

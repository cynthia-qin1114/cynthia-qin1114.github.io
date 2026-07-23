import { useEffect, useCallback } from 'react';
import { useAccountStore } from '../store/useAccountStore';
import { accountRepository } from '../db/repositories/accountRepository';
import type { CreateAccountDTO, UpdateAccountDTO, AccountType } from '../types';

/**
 * useAccount — 账户Hooks
 * 封装账户Store操作，提供便捷的账户管理接口
 */
export const useAccount = () => {
  const {
    accounts,
    loading,
    error,
    totalAssets,
    totalLiabilities,
    netAssets,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    refreshTotalAssets,
  } = useAccountStore();

  useEffect(() => {
    if (accounts.length === 0 && !loading) {
      fetchAccounts();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 创建账户
   */
  const handleCreate = useCallback(
    async (data: { name: string; type: AccountType; balance: number; currency?: string; icon?: string; note?: string }) => {
      const dto: CreateAccountDTO = {
        name: data.name,
        type: data.type,
        balance: data.balance,
        currency: data.currency ?? 'CNY',
        icon: data.icon ?? '💳',
        note: data.note ?? '',
      };
      await createAccount(dto);
    },
    [createAccount]
  );

  /**
   * 更新账户
   */
  const handleUpdate = useCallback(
    async (id: string, data: Partial<{ name: string; type: AccountType; balance: number; currency: string; icon: string; note: string }>) => {
      const dto: UpdateAccountDTO = { ...data };
      await updateAccount(id, dto);
    },
    [updateAccount]
  );

  /**
   * 删除账户
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteAccount(id);
    },
    [deleteAccount]
  );

  /**
   * 获取账户名称
   */
  const getAccountName = useCallback(
    (accountId: string): string => {
      const account = accounts.find((a) => a.id === accountId);
      return account?.name ?? '未知账户';
    },
    [accounts]
  );

  /**
   * 获取账户类型
   */
  const getAccountType = useCallback(
    (accountId: string): AccountType | undefined => {
      const account = accounts.find((a) => a.id === accountId);
      return account?.type;
    },
    [accounts]
  );

  /**
   * 转账
   */
  const handleTransfer = useCallback(
    async (fromId: string, toId: string, amount: number) => {
      await accountRepository.transfer(fromId, toId, amount);
      await fetchAccounts();
      await refreshTotalAssets();
    },
    [fetchAccounts, refreshTotalAssets]
  );

  return {
    accounts,
    loading,
    error,
    totalAssets,
    totalLiabilities,
    netAssets,
    fetchAccounts,
    createAccount: handleCreate,
    updateAccount: handleUpdate,
    deleteAccount: handleDelete,
    transfer: handleTransfer,
    getAccountName,
    getAccountType,
    refreshTotalAssets,
  };
};

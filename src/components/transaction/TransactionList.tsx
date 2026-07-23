import React from 'react';
import List from '@mui/material/List';
import TransactionItem from './TransactionItem';
import EmptyState from '../common/EmptyState';
import type { Transaction } from '../../types';

/**
 * TransactionList — 交易列表（支持筛选）
 */
interface TransactionListProps {
  transactions: Transaction[];
  accountMap?: Map<string, string>;
  onItemClick?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accountMap,
  onItemClick,
  onDelete,
  emptyTitle = '暂无交易记录',
  emptyDescription = '点击右下角按钮开始记账',
}) => {
  if (transactions.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <List sx={{ width: '100%', p: 0 }}>
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          accountName={accountMap?.get(transaction.accountId)}
          onClick={onItemClick ? () => onItemClick(transaction) : undefined}
          onDelete={onDelete ? () => onDelete(transaction) : undefined}
        />
      ))}
    </List>
  );
};

export default TransactionList;

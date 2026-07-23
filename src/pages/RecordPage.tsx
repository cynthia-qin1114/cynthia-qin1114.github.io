import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTransaction } from '../hooks/useTransaction';
import { useAccount } from '../hooks/useAccount';
import { categoryRepository } from '../db/repositories/categoryRepository';
import TransactionForm from '../components/transaction/TransactionForm';
import TransactionList from '../components/transaction/TransactionList';
import OcrButton from '../components/transaction/OcrButton';
import Loading from '../components/common/Loading';
import { TransactionType } from '../types';
import type { Category, Transaction, CreateTransactionDTO } from '../types';

/**
 * RecordPage — 记账页
 * 手动记账 + OCR记账 + 交易列表
 */
const RecordPage: React.FC = () => {
  const { transactions, loading, fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransaction();
  const { accounts } = useAccount();
  const [categories, setCategories] = useState<Category[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [prefillData, setPrefillData] = useState<Partial<CreateTransactionDTO> | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await categoryRepository.getAll();
      setCategories(cats);
    };
    loadCategories();
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, acc.name));
    return map;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    if (filterType === 'ALL') return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  const handleFilterChange = async (_e: React.MouseEvent<HTMLElement>, val: TransactionType | 'ALL') => {
    if (val) {
      setFilterType(val);
      if (val === 'ALL') {
        await fetchTransactions();
      } else {
        await fetchTransactions({ type: val as TransactionType });
      }
    }
  };

  const handleOpenCreate = () => {
    setEditTransaction(null);
    setPrefillData(null);
    setFormOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setPrefillData(null);
    setFormOpen(true);
  };

  const handleDelete = useCallback((transaction: Transaction) => {
    deleteTransaction(transaction.id);
  }, [deleteTransaction]);

  const handleOcrResult = useCallback(
    async (result: { text: string; amounts: number[]; date: string | null; classification: { platform: string; category: string } | null }) => {
      // 预填表单数据
      setPrefillData({
        type: TransactionType.EXPENSE,
        amount: result.amounts[0] ?? 0,
        category: result.classification?.category ?? '',
        platform: result.classification?.platform ?? '',
        date: result.date ?? new Date().toISOString(),
        accountId: accounts[0]?.id ?? '',
      });
      setEditTransaction(null);
      setFormOpen(true);
    },
    [accounts]
  );

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        记账
      </Typography>

      {/* OCR记账 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            📸 拍照记账
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            拍摄或上传账单截图，自动识别金额和分类
          </Typography>
          <OcrButton onResult={handleOcrResult} />
        </CardContent>
      </Card>

      {/* 筛选 */}
      <ToggleButtonGroup
        value={filterType}
        exclusive
        onChange={handleFilterChange}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="ALL">全部</ToggleButton>
        <ToggleButton value="EXPENSE">支出</ToggleButton>
        <ToggleButton value="INCOME">收入</ToggleButton>
        <ToggleButton value="TRANSFER">转账</ToggleButton>
      </ToggleButtonGroup>

      {/* 交易列表 */}
      <Card>
        <CardContent>
          {loading ? (
            <Loading message="加载交易记录..." />
          ) : (
            <TransactionList
              transactions={filteredTransactions}
              accountMap={accountMap}
              onItemClick={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* 添加按钮 */}
      <Fab
        color="primary"
        onClick={handleOpenCreate}
        sx={{
          position: 'fixed',
          bottom: 70,
          right: '50%',
          transform: 'translateX(215px)',
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>

      {/* 表单弹窗 */}
      <TransactionForm
        open={formOpen}
        accounts={accounts}
        categories={categories}
        transaction={editTransaction}
        prefillData={prefillData}
        onClose={() => {
          setFormOpen(false);
          setEditTransaction(null);
          setPrefillData(null);
        }}
        onSubmit={async (data) => {
          if (editTransaction) {
            await updateTransaction(editTransaction.id, data);
          } else {
            await createTransaction(data);
          }
          await fetchTransactions();
        }}
      />
    </Box>
  );
};

export default RecordPage;

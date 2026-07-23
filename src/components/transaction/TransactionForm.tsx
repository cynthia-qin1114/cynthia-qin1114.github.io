import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { TransactionTypeColors } from '../../config/constants';
import { TransactionType } from '../../types';
import { CategoryType } from '../../types';
import type { Account, Transaction, Category, CreateTransactionDTO } from '../../types';

/**
 * TransactionForm — 手动记账表单
 * 类型/金额/账户/分类/平台/备注
 */
interface TransactionFormProps {
  open: boolean;
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction | null;
  onClose: () => void;
  onSubmit: (data: CreateTransactionDTO) => Promise<void>;
  prefillData?: Partial<CreateTransactionDTO> | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  accounts,
  categories,
  transaction,
  onClose,
  onSubmit,
  prefillData,
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setAccountId(transaction.accountId);
      setCategory(transaction.category);
      setPlatform(transaction.platform);
      setNote(transaction.note);
      setDate(transaction.date.split('T')[0]);
    } else if (prefillData) {
      setType(prefillData.type ?? TransactionType.EXPENSE);
      setAmount(prefillData.amount ? String(prefillData.amount) : '');
      setAccountId(prefillData.accountId ?? '');
      setCategory(prefillData.category ?? '');
      setPlatform(prefillData.platform ?? '');
      setNote(prefillData.note ?? '');
      setDate(prefillData.date ? prefillData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setType(TransactionType.EXPENSE);
      setAmount('');
      setAccountId(accounts[0]?.id ?? '');
      setCategory('');
      setPlatform('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [transaction, prefillData, open, accounts]);

  const filteredCategories = categories.filter((c) =>
    type === TransactionType.INCOME ? c.type === CategoryType.INCOME : c.type === CategoryType.EXPENSE
  );

  const handleSubmit = async () => {
    if (!amount || !accountId) return;
    setSubmitting(true);
    try {
      const data: CreateTransactionDTO = {
        accountId,
        type,
        amount: parseFloat(amount),
        category: category || (type === TransactionType.INCOME ? '其他收入' : '其他支出'),
        platform: platform.trim(),
        note: note.trim(),
        date: new Date(date).toISOString(),
      };
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Transaction form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {transaction ? '编辑交易' : '记一笔'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* 交易类型切换 */}
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, val) => val && setType(val)}
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                py: 1,
                fontWeight: 600,
              },
            }}
          >
            <ToggleButton value={TransactionType.EXPENSE} sx={{ color: TransactionTypeColors.EXPENSE, borderColor: TransactionTypeColors.EXPENSE, '&.Mui-selected': { backgroundColor: TransactionTypeColors.EXPENSE, color: 'white' } }}>
              支出
            </ToggleButton>
            <ToggleButton value={TransactionType.INCOME} sx={{ color: TransactionTypeColors.INCOME, borderColor: TransactionTypeColors.INCOME, '&.Mui-selected': { backgroundColor: TransactionTypeColors.INCOME, color: 'white' } }}>
              收入
            </ToggleButton>
            <ToggleButton value={TransactionType.TRANSFER} sx={{ color: TransactionTypeColors.TRANSFER, borderColor: TransactionTypeColors.TRANSFER, '&.Mui-selected': { backgroundColor: TransactionTypeColors.TRANSFER, color: 'white' } }}>
              转账
            </ToggleButton>
          </ToggleButtonGroup>

          {/* 金额 */}
          <TextField
            label="金额"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            InputProps={{ inputProps: { step: '0.01' }, startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>¥</Typography> }}
          />

          {/* 账户 */}
          <TextField
            select
            label="账户"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.name}
              </MenuItem>
            ))}
          </TextField>

          {/* 分类 */}
          {type !== TransactionType.TRANSFER && (
            <TextField
              select
              label="分类"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {filteredCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* 平台 */}
          <TextField
            label="平台/商户"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="如：美团、淘宝（可选）"
          />

          {/* 日期 */}
          <TextField
            label="日期"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* 备注 */}
          <TextField
            label="备注"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可选"
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" fullWidth disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={submitting || !amount || !accountId}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionForm;

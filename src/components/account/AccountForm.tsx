import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import { AccountTypeLabels, AccountTypeIcons } from '../../config/constants';
import { AccountType } from '../../types';
import type { Account, CreateAccountDTO, UpdateAccountDTO } from '../../types';

/**
 * AccountForm — 账户新增/编辑表单（Dialog）
 */
interface AccountFormProps {
  open: boolean;
  account?: Account | null;
  onClose: () => void;
  onSubmit: (data: CreateAccountDTO | UpdateAccountDTO) => Promise<void>;
}

const accountTypes = Object.values(AccountType);

const AccountForm: React.FC<AccountFormProps> = ({ open, account, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.BANK_DEBIT);
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(String(account.balance));
      setNote(account.note);
    } else {
      setName('');
      setType(AccountType.BANK_DEBIT);
      setBalance('');
      setNote('');
    }
  }, [account, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const data: CreateAccountDTO | UpdateAccountDTO = {
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        currency: 'CNY',
        icon: AccountTypeIcons[type] ?? '💳',
        note: note.trim(),
      };
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Account form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {account ? '编辑账户' : '添加账户'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="账户名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：招商银行储蓄卡"
            required
          />
          <TextField
            select
            label="账户类型"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            {accountTypes.map((t) => (
              <MenuItem key={t} value={t}>
                {AccountTypeIcons[t]} {AccountTypeLabels[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="初始余额"
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            InputProps={{ inputProps: { step: '0.01' } }}
          />
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
          disabled={submitting || !name.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountForm;

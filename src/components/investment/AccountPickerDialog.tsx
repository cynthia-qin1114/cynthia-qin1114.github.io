import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { AccountTypeLabels } from '../../config/constants';
import { formatCurrency } from '../../utils/format';
import AccountAvatar from '../account/AccountAvatar';
import type { Account } from '../../types';

/**
 * AccountPickerDialog — 扫描前选择归属账户对话框
 *
 * OCR 录入向导第 1 步：用户先选定理财/基金要归属的账户，
 * accountId 随后注入所有解析结果（不做银行名自动匹配）。
 */
interface AccountPickerDialogProps {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onSelect: (account: Account) => void;
  title?: string;
}

const AccountPickerDialog: React.FC<AccountPickerDialogProps> = ({
  open,
  accounts,
  onClose,
  onSelect,
  title = '选择归属账户',
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {accounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            暂无账户，请先在账户页添加
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {accounts.map((account) => (
              <ListItemButton
                key={account.id}
                onClick={() => onSelect(account)}
                sx={{ py: 1.5 }}
              >
                <ListItemAvatar>
                  <AccountAvatar account={account} size={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {account.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {AccountTypeLabels[account.type] ?? account.type} · 当前余额 {formatCurrency(account.balance)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccountPickerDialog;

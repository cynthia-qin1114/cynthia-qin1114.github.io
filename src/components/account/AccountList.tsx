import React from 'react';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCard from './AccountCard';
import EmptyState from '../common/EmptyState';
import type { Account } from '../../types';

/**
 * AccountList — 账户列表
 */
interface AccountListProps {
  accounts: Account[];
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  onCardClick?: (account: Account) => void;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, onEdit, onDelete, onCardClick }) => {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null);

  // 账户按总金额（balance，口径 = Σ持仓市值，含 CASH 活期）降序排序
  const sortedAccounts = React.useMemo(
    () => [...accounts].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)),
    [accounts],
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, account: Account) => {
    setMenuAnchor(event.currentTarget);
    setSelectedAccount(account);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedAccount(null);
  };

  const handleEdit = () => {
    if (selectedAccount && onEdit) {
      onEdit(selectedAccount);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedAccount && onDelete) {
      onDelete(selectedAccount);
    }
    handleMenuClose();
  };

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="暂无账户"
        description="点击右下角按钮添加你的第一个账户"
      />
    );
  }

  return (
    <Box>
      {sortedAccounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onClick={onCardClick ? () => onCardClick(account) : undefined}
          onMenuClick={onEdit || onDelete ? (e) => handleMenuClick(e, account) : undefined}
        />
      ))}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>编辑</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>删除</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default AccountList;

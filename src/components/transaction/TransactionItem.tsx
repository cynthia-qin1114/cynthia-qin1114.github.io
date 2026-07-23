import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { TransactionTypeColors } from '../../config/constants';
import { TransactionType } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/format';
import type { Transaction } from '../../types';

/**
 * TransactionItem — 交易列表项
 */
interface TransactionItemProps {
  transaction: Transaction;
  accountName?: string;
  onClick?: () => void;
  onDelete?: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, accountName, onClick, onDelete }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const isTransfer = transaction.type === TransactionType.TRANSFER;
  const color = TransactionTypeColors[transaction.type] ?? '#757575';
  const sign = isIncome ? '+' : isTransfer ? '' : '-';

  return (
    <ListItem
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        py: 1.5,
        px: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': onClick ? { backgroundColor: 'rgba(0,0,0,0.02)' } : {},
      }}
    >
      <ListItemAvatar>
        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color: color,
            width: 40,
            height: 40,
            fontSize: 18,
          }}
        >
          {isIncome ? '📈' : isTransfer ? '🔄' : '📉'}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
              {transaction.category || transaction.platform || '未分类'}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: color, flexShrink: 0, ml: 1 }}
            >
              {sign}
              {formatCurrency(transaction.amount, false)}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {transaction.platform && `${transaction.platform} · `}
              {accountName ?? ''}
              {transaction.note && ` · ${transaction.note}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
              {formatShortDate(transaction.date)}
            </Typography>
          </Box>
        }
      />
      {onDelete && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{ ml: 0.5 }}
        >
          <DeleteOutlineIcon fontSize="small" color="error" />
        </IconButton>
      )}
    </ListItem>
  );
};

export default TransactionItem;

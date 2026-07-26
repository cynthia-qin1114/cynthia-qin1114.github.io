import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { AccountTypeLabels } from '../../config/constants';
import { formatCurrency } from '../../utils/format';
import AccountAvatar from './AccountAvatar';
import type { Account } from '../../types';

/**
 * AccountCard — 账户卡片
 */
interface AccountCardProps {
  account: Account;
  onClick?: () => void;
  onMenuClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onClick, onMenuClick }) => {
  const isNegative = account.balance < 0;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        mb: 1.5,
        '&:hover': onClick
          ? { boxShadow: '0 10px 28px rgba(15,23,42,0.10)', transform: 'translateY(-1px)' }
          : {},
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ mr: 2, flexShrink: 0 }}>
          <AccountAvatar account={account} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
            {account.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {AccountTypeLabels[account.type] ?? '其他'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', mr: onMenuClick ? 0 : 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              color: isNegative ? 'error.main' : 'text.primary',
            }}
          >
            {formatCurrency(account.balance)}
          </Typography>
        </Box>
        {onMenuClick && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick(e);
            }}
            sx={{ ml: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountCard;

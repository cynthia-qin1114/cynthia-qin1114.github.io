import React from 'react';
import Avatar from '@mui/material/Avatar';
import { resolveAccountBrand } from '../../utils/accountBrand';
import type { Account } from '../../types';

/**
 * AccountAvatar — 账户品牌头像（需求⑥）
 * 圆形头像，品牌色底 + 机构简称，一眼区分 招行/支付宝/微信 等。
 */
interface AccountAvatarProps {
  account: Account;
  size?: number;
}

const AccountAvatar: React.FC<AccountAvatarProps> = ({ account, size = 44 }) => {
  const brand = resolveAccountBrand(account.name);
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: brand.color,
        color: '#fff',
        fontSize: size * 0.5,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {brand.short}
    </Avatar>
  );
};

export default AccountAvatar;

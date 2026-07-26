import React from 'react';
import Avatar from '@mui/material/Avatar';
import { resolveAccountBrand } from '../../utils/accountBrand';
import { isKnownInstitution } from '../common/InstitutionLogo';
import InstitutionLogo from '../common/InstitutionLogo';
import type { Account } from '../../types';

/**
 * AccountAvatar — 账户品牌头像
 * - 命中已知机构 → 渲染拟真品牌标志（圆形头像风）。
 * - 未命中 → 沿用品牌色 + 机构简称文字头像（保持原有可读性与辨识度）。
 */
interface AccountAvatarProps {
  account: Account;
  size?: number;
}

const AccountAvatar: React.FC<AccountAvatarProps> = ({ account, size = 44 }) => {
  if (isKnownInstitution(account.name)) {
    return (
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: 'transparent',
          p: 0,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <InstitutionLogo name={account.name} size={size} shape="circle" />
      </Avatar>
    );
  }

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

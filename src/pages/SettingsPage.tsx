import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsItem from '../components/settings/SettingsItem';
import AccountForm from '../components/account/AccountForm';
import AccountList from '../components/account/AccountList';
import AccountDetailDialog from '../components/account/AccountDetailDialog';
import { useAccount } from '../hooks/useAccount';
import { useSettingsStore } from '../store/useSettingsStore';
import { db, resetDefaultData } from '../db/database';
import { CORS_PROXIES } from '../config/constants';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import type { Account, CreateAccountDTO, UpdateAccountDTO } from '../types';

/**
 * SettingsPage — 设置页
 * 账户管理 + CORS配置 + 数据管理
 */
const SettingsPage: React.FC = () => {
  const { accounts, fetchAccounts, createAccount, updateAccount, deleteAccount } = useAccount();
  const { corsProxy, setCorsProxy } = useSettingsStore();
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);
  const [proxyValue, setProxyValue] = useState(corsProxy);
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    fetchAccounts();
    setProxyValue(corsProxy);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProxy = () => {
    setCorsProxy(proxyValue);
  };

  const handleEditAccount = (account: Account) => {
    setEditAccount(account);
    setAccountFormOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    confirm({
      title: '删除账户',
      message: `确定删除账户「${account.name}」吗？该账户下的持仓将一并删除；相关交易记录将保留但不再关联此账户。`,
      confirmText: '删除',
      confirmColor: 'error',
      onConfirm: () => deleteAccount(account.id),
    });
  };

  const handleExportData = async () => {
    try {
      const data = {
        accounts: await db.accounts.toArray(),
        transactions: await db.transactions.toArray(),
        categories: await db.categories.toArray(),
        investments: await db.investments.toArray(),
        platformMappings: await db.platformMappings.toArray(),
        exportDate: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-finance-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleResetDefaults = () => {
    confirm({
      title: '恢复默认账户与分类',
      message:
        '将写入最新的默认账户与分类体系（工资/报销、餐饮/交通/购物等）。已录入余额或已有流水的账户不会被改动，你的历史交易数据不会丢失。确定继续吗？',
      confirmText: '恢复',
      confirmColor: 'primary',
      onConfirm: async () => {
        await resetDefaultData();
        await fetchAccounts();
      },
    });
  };

  const handleClearData = () => {
    confirm({
      title: '清空所有数据',
      message: '⚠️ 此操作不可撤销！所有账户、交易、投资数据将被清空。确定继续吗？',
      confirmText: '清空全部',
      confirmColor: 'error',
      onConfirm: async () => {
        await db.transaction('rw', db.accounts, db.transactions, db.investments, async () => {
          await db.accounts.clear();
          await db.transactions.clear();
          await db.investments.clear();
        });
        await fetchAccounts();
      },
    });
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        设置
      </Typography>

      {/* 账户管理 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountCircleIcon fontSize="small" color="primary" />
              账户管理
            </Typography>
            <Button size="small" startIcon={<AccountCircleIcon />} onClick={() => { setEditAccount(null); setAccountFormOpen(true); }}>
              添加
            </Button>
          </Box>
          <List sx={{ p: 0 }}>
            <AccountList
              accounts={accounts}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
              onCardClick={(acc) => setDetailAccount(acc)}
            />
          </List>
        </CardContent>
      </Card>

      {/* CORS代理配置 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CloudIcon fontSize="small" color="primary" />
            CORS代理配置
          </Typography>
          <TextField
            select
            label="代理源"
            value={proxyValue}
            onChange={(e) => setProxyValue(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 1 }}
          >
            {CORS_PROXIES.map((proxy) => (
              <MenuItem key={proxy} value={proxy}>
                {proxy}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" size="small" onClick={handleSaveProxy} fullWidth>
            保存代理设置
          </Button>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <StorageIcon fontSize="small" color="primary" />
            数据管理
          </Typography>
          <List sx={{ p: 0 }}>
            <SettingsItem
              icon={<RestartAltIcon />}
              title="恢复默认账户与分类"
              subtitle="应用最新默认账户与分类（不影响已有余额与流水）"
              onClick={handleResetDefaults}
            />
            <SettingsItem
              icon={<DownloadIcon />}
              title="导出数据"
              subtitle="导出所有数据为JSON备份文件"
              onClick={handleExportData}
            />
            <SettingsItem
              icon={<DeleteForeverIcon color="error" />}
              title="清空所有数据"
              subtitle="删除所有账户、交易和投资数据"
              onClick={handleClearData}
            />
          </List>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            关于
          </Typography>
          <Typography variant="body2" color="text.secondary">
            智能记账 v1.0.0
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            个人智能记账APP · PWA移动应用
          </Typography>
        </CardContent>
      </Card>

      {/* 账户表单弹窗 */}
      <AccountForm
        open={accountFormOpen}
        account={editAccount}
        onClose={() => {
          setAccountFormOpen(false);
          setEditAccount(null);
        }}
        onSubmit={async (data: CreateAccountDTO | UpdateAccountDTO) => {
          if (editAccount) {
            await updateAccount(editAccount.id, data);
          } else {
            await createAccount(data as CreateAccountDTO);
          }
          await fetchAccounts();
        }}
      />

      {/* 账户明细（资产汇总 + 录入） */}
      <AccountDetailDialog
        open={Boolean(detailAccount)}
        account={detailAccount}
        accounts={accounts}
        onClose={() => setDetailAccount(null)}
      />

      {dialog}
    </Box>
  );
};

export default SettingsPage;

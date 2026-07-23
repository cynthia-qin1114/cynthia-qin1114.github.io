import React, { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { useAccount } from '../hooks/useAccount';
import { useTransaction } from '../hooks/useTransaction';
import { transactionRepository } from '../db/repositories/transactionRepository';
import AccountList from '../components/account/AccountList';
import AccountForm from '../components/account/AccountForm';
import TransactionList from '../components/transaction/TransactionList';
import Loading from '../components/common/Loading';
import { formatCurrency } from '../utils/format';
import { COLORS } from '../config/constants';
import type { Account, Transaction, CreateAccountDTO, UpdateAccountDTO } from '../types';

/**
 * OverviewPage — 概览页
 * 总资产卡片 + 本月收支 + 账户列表 + 最近交易
 */
const OverviewPage: React.FC = () => {
  const { accounts, totalAssets, totalLiabilities, netAssets, fetchAccounts, createAccount, refreshTotalAssets } = useAccount();
  const { fetchTransactions } = useTransaction();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accountFormOpen, setAccountFormOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAccounts();
      await fetchTransactions();

      // 获取最近交易
      const recent = await transactionRepository.getRecent(5);
      setRecentTransactions(recent);

      // 获取当月收支
      const now = new Date();
      const summary = await transactionRepository.getMonthlySummary(now.getFullYear(), now.getMonth() + 1);
      setMonthlyIncome(summary.income);
      setMonthlyExpense(summary.expense);

      setLoading(false);
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc: Account) => map.set(acc.id, acc.name));
    return map;
  }, [accounts]);

  if (loading && accounts.length === 0) {
    return <Loading fullScreen message="加载概览数据..." />;
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* 总资产卡片 */}
      <Card
        sx={{
          mb: 2,
          background: `linear-gradient(135deg, ${COLORS.PRIMARY} 0%, ${COLORS.PRIMARY_DARK} 100%)`,
          color: 'white',
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            净资产
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}>
            {formatCurrency(netAssets)}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>总资产</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatCurrency(totalAssets)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>总负债</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatCurrency(totalLiabilities)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 本月收支 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            本月收支
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">收入</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.INCOME }}>
                  {formatCurrency(monthlyIncome)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">支出</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.EXPENSE }}>
                  {formatCurrency(monthlyExpense)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 账户列表 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1, px: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          我的账户
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAccountFormOpen(true)}
        >
          添加账户
        </Button>
      </Box>
      {accounts.length > 0 ? (
        <AccountList accounts={accounts} />
      ) : (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center" sx={{ mb: 1.5 }}>
              暂无账户，请先添加账户
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAccountFormOpen(true)}
              >
                添加账户
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 最近交易 */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1, px: 0.5 }}>
        最近交易
      </Typography>
      <Card>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <TransactionList transactions={recentTransactions} accountMap={accountMap} />
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              暂无交易记录
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 添加账户表单弹窗 */}
      <AccountForm
        open={accountFormOpen}
        account={null}
        onClose={() => setAccountFormOpen(false)}
        onSubmit={async (data: CreateAccountDTO | UpdateAccountDTO) => {
          await createAccount(data as CreateAccountDTO);
          await fetchAccounts();
          await refreshTotalAssets();
        }}
      />
    </Box>
  );
};

export default OverviewPage;

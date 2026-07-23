import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useReport } from '../hooks/useReport';
import AssetOverviewChart from '../components/report/AssetOverviewChart';
import IncomeExpenseTrendChart from '../components/report/IncomeExpenseTrendChart';
import CategoryPieChart from '../components/report/CategoryPieChart';
import AssetTrendChart from '../components/report/AssetTrendChart';
import AccountDistributionChart from '../components/report/AccountDistributionChart';
import MonthlyComparisonChart from '../components/report/MonthlyComparisonChart';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { HoldingTypeLabels } from '../config/constants';
import { HoldingType } from '../types';
import type { AccountDistribution, CategorySummary } from '../types';
import Loading from '../components/common/Loading';

/**
 * ReportPage — 报表页
 * 6种图表Tab切换
 */
const ReportPage: React.FC = () => {
  const {
    loading,
    monthlySummaries,
    incomeCategorySummary,
    expenseCategorySummary,
    accountDistribution,
    assetOverview,
    assetTrend,
    fetchAll,
  } = useReport();
  const [tabIndex, setTabIndex] = useState(0);
  const [drillAccount, setDrillAccount] = useState<AccountDistribution | null>(null);
  const [drillData, setDrillData] = useState<CategorySummary[]>([]);

  const handleTabChange = (_e: React.SyntheticEvent, val: number) => {
    setTabIndex(val);
  };

  /** 资产概览：点击某账户下钻其各类资产分布 */
  const handleAccountDrill = async (item: AccountDistribution) => {
    setDrillAccount(item);
    if (!item.accountId) {
      setDrillData([]);
      return;
    }
    const list = await investmentRepository.getByAccountId(item.accountId);
    const totals: Record<string, number> = {};
    let total = 0;
    list.forEach((h) => {
      const v = h.marketValue ?? 0;
      totals[h.holdingType] = (totals[h.holdingType] ?? 0) + v;
      total += v;
    });
    const data: CategorySummary[] = Object.entries(totals).map(([k, v]) => ({
      category: HoldingTypeLabels[k as HoldingType] ?? k,
      amount: v,
      percentage: total > 0 ? (v / total) * 100 : 0,
      count: list.filter((h) => h.holdingType === k).length,
    }));
    setDrillData(data);
  };

  const tabLabels = ['资产概览', '收支趋势', '分类占比', '资产趋势', '账户分布', '月度对比'];

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        报表
      </Typography>

      {/* Tab切换 */}
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          '& .MuiTab-root': { minWidth: 'auto', fontSize: '0.8rem' },
        }}
      >
        {tabLabels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {loading ? (
        <Loading message="加载报表数据..." />
      ) : (
        <Card>
          <CardContent>
            {/* 资产概览 */}
            {tabIndex === 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  资产概览
                </Typography>
                <AssetOverviewChart data={assetOverview} />

                <Box sx={{ mt: 3 }}>
                  {drillAccount ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {drillAccount.accountName} · 各类资产分布
                        </Typography>
                        <Button size="small" onClick={() => setDrillAccount(null)}>← 全部账户</Button>
                      </Box>
                      <CategoryPieChart data={drillData} />
                    </>
                  ) : (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        不同账户资产分布（点击查看类别）
                      </Typography>
                      <AccountDistributionChart data={accountDistribution} onSliceClick={handleAccountDrill} />
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* 收支趋势 */}
            {tabIndex === 1 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  近6月收支趋势
                </Typography>
                <IncomeExpenseTrendChart data={monthlySummaries} />
              </Box>
            )}

            {/* 分类占比 */}
            {tabIndex === 2 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  支出分类占比
                </Typography>
                <CategoryPieChart data={expenseCategorySummary} />
                {incomeCategorySummary.length > 0 && (
                  <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
                      收入分类占比
                    </Typography>
                    <CategoryPieChart data={incomeCategorySummary} />
                  </>
                )}
              </Box>
            )}

            {/* 资产趋势 */}
            {tabIndex === 3 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  资产趋势
                </Typography>
                <AssetTrendChart data={assetTrend} />
              </Box>
            )}

            {/* 账户分布 */}
            {tabIndex === 4 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  账户分布
                </Typography>
                <AccountDistributionChart data={accountDistribution} />
              </Box>
            )}

            {/* 月度对比 */}
            {tabIndex === 5 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  月度收支对比
                </Typography>
                <MonthlyComparisonChart data={monthlySummaries} />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={fetchAll}>
          点击刷新数据
        </Typography>
      </Box>
    </Box>
  );
};

export default ReportPage;

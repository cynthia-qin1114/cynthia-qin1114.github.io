import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency } from '../../utils/format';
import { CHART_COLORS, AccountTypeLabels } from '../../config/constants';
import type { AccountDistribution } from '../../types';

/**
 * AccountDistributionChart — 账户分布饼图
 */
interface AccountDistributionChartProps {
  data: AccountDistribution[];
  /** 点击某个账户分片时下钻 */
  onSliceClick?: (item: AccountDistribution) => void;
}

const AccountDistributionChart: React.FC<AccountDistributionChartProps> = ({ data, onSliceClick }) => {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = data.map((item) => ({
    name: item.accountName,
    value: Math.round(Math.abs(item.balance) * 100) / 100,
    type: AccountTypeLabels[item.accountType] ?? '其他',
    percentage: item.percentage,
    raw: item,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }: { name: string; percentage: number }) =>
            percentage > 5 ? `${name} ${percentage.toFixed(0)}%` : ''
          }
          outerRadius={90}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
          onClick={(slice: { payload?: { raw?: AccountDistribution } }) => {
            if (onSliceClick && slice?.payload?.raw) onSliceClick(slice.payload.raw);
          }}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name: string, props: { payload?: { type?: string } }) => [
            formatCurrency(value),
            props?.payload?.type ?? '',
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AccountDistributionChart;

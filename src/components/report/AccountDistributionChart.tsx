import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency } from '../../utils/format';
import { CHART_TECH_COLORS, AccountTypeLabels } from '../../config/constants';
import { techTooltipStyle } from '../common/chartTheme';
import type { AccountDistribution } from '../../types';

/**
 * AccountDistributionChart — 账户分布环图（科技统一色板）
 */
interface AccountDistributionChartProps {
  data: AccountDistribution[];
  /** 点击某个账户分片时下钻 */
  onSliceClick?: (item: AccountDistribution) => void;
}

const RAD = Math.PI / 180;

/** 环外标签：账户名 + 占比（淡灰、小号，仅展示 >5%） */
const renderLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, name, percentage } = props;
  if (!percentage || percentage <= 5) return null;
  const radius = outerRadius + 16;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#CBD5E1"
      fontSize={11}
      fontWeight={600}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {`${name} ${percentage.toFixed(0)}%`}
    </text>
  );
};

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
          label={renderLabel}
          outerRadius={88}
          innerRadius={42}
          fill="#8884d8"
          dataKey="value"
          paddingAngle={1.5}
          stroke="#FFFFFF"
          strokeWidth={2}
          onClick={(slice: any) => {
            if (onSliceClick && slice?.payload?.raw) onSliceClick(slice.payload.raw);
          }}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_TECH_COLORS[index % CHART_TECH_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={techTooltipStyle}
          formatter={(value: number, _name: string, props: any) => [
            formatCurrency(value),
            props?.payload?.type ?? '',
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AccountDistributionChart;

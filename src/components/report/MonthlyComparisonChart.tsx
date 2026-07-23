import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency, formatMonth } from '../../utils/format';
import { COLORS } from '../../config/constants';
import type { MonthlySummary } from '../../types';

/**
 * MonthlyComparisonChart — 月度同比图
 * 展示近N个月的收入、支出、结余对比
 */
interface MonthlyComparisonChartProps {
  data: MonthlySummary[];
}

const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = data.map((item) => ({
    name: formatMonth(`${item.month}-01`),
    收入: Math.round(item.income * 100) / 100,
    支出: Math.round(item.expense * 100) / 100,
    结余: Math.round(item.net * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" style={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} style={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="收入" fill={COLORS.INCOME} radius={[4, 4, 0, 0]} />
        <Bar dataKey="支出" fill={COLORS.EXPENSE} radius={[4, 4, 0, 0]} />
        <Bar dataKey="结余" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.结余 >= 0 ? COLORS.PRIMARY : COLORS.EXPENSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyComparisonChart;

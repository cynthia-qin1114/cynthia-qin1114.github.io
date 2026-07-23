import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency, formatMonth } from '../../utils/format';
import { COLORS } from '../../config/constants';
import type { MonthlySummary } from '../../types';

/**
 * IncomeExpenseTrendChart — 近6月收支趋势柱状图
 */
interface IncomeExpenseTrendChartProps {
  data: MonthlySummary[];
}

const IncomeExpenseTrendChart: React.FC<IncomeExpenseTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = data.map((item) => ({
    name: formatMonth(`${item.month}-01`),
    收入: item.income,
    支出: item.expense,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" style={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} style={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="收入" fill={COLORS.INCOME} radius={[4, 4, 0, 0]} />
        <Bar dataKey="支出" fill={COLORS.EXPENSE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseTrendChart;

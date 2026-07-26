import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency, formatMonth } from '../../utils/format';
import { COLORS } from '../../config/constants';
import { techTooltipStyle, techAxisTick, techGridStroke } from '../common/chartTheme';
import type { MonthlySummary } from '../../types';

/**
 * MonthlyComparisonChart — 月度同比图（科技简约风）
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
      <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={techGridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={techAxisTick} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          tick={techAxisTick}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip contentStyle={techTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar dataKey="收入" fill={COLORS.INCOME} radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar dataKey="支出" fill={COLORS.EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar dataKey="结余" radius={[4, 4, 0, 0]} maxBarSize={16}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.结余 >= 0 ? COLORS.PRIMARY : COLORS.EXPENSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyComparisonChart;

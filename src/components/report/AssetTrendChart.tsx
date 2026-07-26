import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency, formatMonth } from '../../utils/format';
import { COLORS } from '../../config/constants';
import { techTooltipStyle, techAxisTick, techGridStroke } from '../common/chartTheme';
import type { AssetTrendPoint } from '../../types';

/**
 * AssetTrendChart — 资产趋势面积图（科技简约风）
 */
interface AssetTrendChartProps {
  data: AssetTrendPoint[];
}

const AssetTrendChart: React.FC<AssetTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = data.map((item) => ({
    name: formatMonth(item.date),
    总资产: Math.round(item.totalAssets * 100) / 100,
    投资资产: Math.round(item.investmentValue * 100) / 100,
    现金资产: Math.round(item.cashAssets * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.PRIMARY} stopOpacity={0.28} />
            <stop offset="95%" stopColor={COLORS.PRIMARY} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.INVEST} stopOpacity={0.28} />
            <stop offset="95%" stopColor={COLORS.INVEST} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={techGridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={techAxisTick} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
          tick={techAxisTick}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip contentStyle={techTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Area
          type="monotone"
          dataKey="总资产"
          stroke={COLORS.PRIMARY}
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="url(#gradTotal)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="投资资产"
          stroke={COLORS.INVEST}
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="url(#gradInvest)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AssetTrendChart;

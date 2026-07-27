import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency } from '../../utils/format';
import { CHART_TECH_COLORS } from '../../config/constants';
import { techTooltipStyle } from '../common/chartTheme';
import type { CategorySummary } from '../../types';

/**
 * CategoryPieChart — 分类支出占比环图（科技统一色板）
 */
interface CategoryPieChartProps {
  data: CategorySummary[];
  title?: string;
}

const RAD = Math.PI / 180;

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
      {`${name} ${percentage.toFixed(1)}%`}
    </text>
  );
};

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = data.map((item) => ({
    name: item.category,
    value: Math.round(item.amount * 100) / 100,
    percentage: item.percentage,
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
          fill="#8884d8"
          dataKey="value"
          paddingAngle={1.5}
          stroke="#FFFFFF"
          strokeWidth={2}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_TECH_COLORS[index % CHART_TECH_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={techTooltipStyle}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, maxHeight: 80, overflow: 'auto' }}
          iconType="circle"
          formatter={(value: string) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;

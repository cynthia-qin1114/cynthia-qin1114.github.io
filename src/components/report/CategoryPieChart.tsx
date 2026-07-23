import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import { formatCurrency } from '../../utils/format';
import { CHART_COLORS } from '../../config/constants';
import type { CategorySummary } from '../../types';

/**
 * CategoryPieChart — 分类支出占比饼图
 */
interface CategoryPieChartProps {
  data: CategorySummary[];
  title?: string;
}

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
          label={({ name, percentage }: { name: string; percentage: number }) =>
            percentage > 5 ? `${name} ${percentage.toFixed(1)}%` : ''
          }
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend
          wrapperStyle={{ fontSize: 11, maxHeight: 80, overflow: 'auto' }}
          formatter={(value: string) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;

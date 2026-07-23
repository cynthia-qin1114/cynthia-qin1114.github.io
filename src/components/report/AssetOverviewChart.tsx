import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { formatCurrency } from '../../utils/format';
import { COLORS } from '../../config/constants';
import type { AssetOverview } from '../../types';

/**
 * AssetOverviewChart — 资产概览图（总资产+负债+净值）
 */
interface AssetOverviewChartProps {
  data: AssetOverview | null;
}

const AssetOverviewChart: React.FC<AssetOverviewChartProps> = ({ data }) => {
  if (!data) {
    return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无数据</Typography>;
  }

  const chartData = [
    { name: '总资产', value: data.totalAssets, color: COLORS.PRIMARY },
    { name: '总负债', value: data.totalLiabilities, color: COLORS.EXPENSE },
    { name: '净资', value: data.netAssets, color: COLORS.INCOME },
    { name: '投资', value: data.investmentValue, color: COLORS.INVEST },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {chartData.map((item) => (
          <Box key={item.name} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{item.name}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: item.color }}>
              {formatCurrency(item.value)}
            </Typography>
          </Box>
        ))}
      </Box>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`} style={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={60} style={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AssetOverviewChart;

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Switch from '@mui/material/Switch';
import { formatCurrency } from '../../utils/format';
import { COLORS, DcaPlanTypeLabels, DcaFrequencyLabels } from '../../config/constants';
import type { DcaPlan } from '../../types';

/**
 * DcaPlanCard — 单条定投计划卡片
 * 展示：基金名 / 每期金额 / 频度 / 下一扣款日 / 启用 Switch / 累计投入(P1-4)，
 * 点击卡片进入编辑（复用 T03/T04 录入组件）。
 */
interface DcaPlanCardProps {
  plan: DcaPlan;
  /** 累计投入 = Σ 本计划 DcaRecord.amount */
  investedAmount: number;
  onEdit: (plan: DcaPlan) => void;
  onToggleEnabled: (plan: DcaPlan, enabled: boolean) => void;
}

const DcaPlanCard: React.FC<DcaPlanCardProps> = ({ plan, investedAmount, onEdit, onToggleEnabled }) => {
  return (
    <Card
      onClick={() => onEdit(plan)}
      sx={{
        mb: 1,
        cursor: 'pointer',
        borderLeft: `4px solid ${COLORS.INVEST}`,
        opacity: plan.enabled ? 1 : 0.6,
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {plan.fundName || '未命名基金'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {DcaPlanTypeLabels[plan.type]} · {DcaFrequencyLabels[plan.frequency]}
            </Typography>
          </Box>
          <Switch
            checked={plan.enabled}
            onChange={(e) => onToggleEnabled(plan, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            color="warning"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              每期
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {formatCurrency(plan.amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              下一扣款日
            </Typography>
            <Typography variant="body1">{plan.nextDeductionDate}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              累计投入
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {formatCurrency(investedAmount)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DcaPlanCard;

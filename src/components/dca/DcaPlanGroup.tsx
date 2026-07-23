import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatCurrency } from '../../utils/format';
import { COLORS } from '../../config/constants';
import type { DcaPlan } from '../../types';

/**
 * DcaPlanGroup — 定投计划分组折叠容器（对齐需求③ CategoryGroup）
 * 组头：标题 + 条数 Chip + 下期扣款合计小计 + ExpandMore 折叠（默认展开）。
 * 视觉主色用 COLORS.INVEST(#FF9800)。
 */
interface DcaPlanGroupProps {
  title: string;
  plans: DcaPlan[];
  /** 渲染单条卡片的回调（已包含 key） */
  renderCard: (plan: DcaPlan) => React.ReactNode;
}

const DcaPlanGroup: React.FC<DcaPlanGroupProps> = ({ title, plans, renderCard }) => {
  const [expanded, setExpanded] = useState(true);

  // 下期扣款合计 = Σ 本组计划每期扣款额
  const subtotal = plans.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={toggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 1,
          mb: 1,
          borderRadius: 1,
          cursor: 'pointer',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.INVEST }} noWrap>
            {title}
          </Typography>
          <Chip label={plans.length} size="small" sx={{ height: 20, fontSize: 11 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            下期 {formatCurrency(subtotal)}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-label={expanded ? '收起分组' : '展开分组'}
          >
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box>{plans.map(renderCard)}</Box>
      </Collapse>
    </Box>
  );
};

export default DcaPlanGroup;

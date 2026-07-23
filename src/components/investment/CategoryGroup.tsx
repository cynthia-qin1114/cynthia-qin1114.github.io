import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatCurrency } from '../../utils/format';
import { CATEGORY_COLORS } from '../../config/constants';
import { HoldingType } from '../../types';
import type { Investment } from '../../types';

/**
 * CategoryGroup — 单个资产类别组（基金 / 理财 / 黄金 / 现金）
 *
 * 组头：类别标题 + 条数徽标 + 市值小计（Σ组内 marketValue，formatCurrency）+ 折叠 chevron。
 * 组内：渲染每条 InvestmentCard。默认全部展开；折叠态仍显示标题 / 条数 / 小计。
 *
 * 视觉区分（需求③ T05）：
 *   - 现金（CASH）组：淡灰底 + 非收益色，明确不计入顶部「投资市值」。
 *   - 黄金（GOLD）组：标题橙金强调（数据到达后自动出现）。
 */
interface CategoryGroupProps {
  /** 资产类别（HoldingType） */
  type: HoldingType;
  /** 组标题（来自 HoldingTypeLabels） */
  title: string;
  /** 组内持仓（已按 marketValue 降序） */
  items: Investment[];
  /** 渲染单条卡片的回调（由 InvestmentList 透传，已包含 key 与账户名映射） */
  renderCard: (inv: Investment) => React.ReactNode;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({ type, title, items, renderCard }) => {
  const [expanded, setExpanded] = React.useState<boolean>(true);

  // 组内市值小计
  const subtotal = items.reduce((sum, inv) => sum + (inv.marketValue ?? 0), 0);

  const isCash = type === HoldingType.CASH;
  const isGold = type === HoldingType.GOLD;

  // 视觉区分：现金组淡灰底/非收益色；黄金组橙金标题
  const headerBg = isCash ? 'action.hover' : 'transparent';
  const titleColor = isCash ? 'text.secondary' : isGold ? CATEGORY_COLORS.GOLD : 'text.primary';
  const subtotalColor = isCash ? 'text.secondary' : 'text.primary';

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <Box sx={{ mb: 2 }}>
      {/* 组头：点击整行切换折叠；折叠态仍显示标题 / 条数 / 小计 */}
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
          bgcolor: headerBg,
          cursor: 'pointer',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: titleColor }} noWrap>
            {title}
          </Typography>
          <Chip label={items.length} size="small" sx={{ height: 20, fontSize: 11 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: subtotalColor }} noWrap>
            {formatCurrency(subtotal)}
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

      {/* 组内卡片列表：折叠态收起（Collapse），展开态显示全部 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box>{items.map(renderCard)}</Box>
      </Collapse>
    </Box>
  );
};

export default CategoryGroup;

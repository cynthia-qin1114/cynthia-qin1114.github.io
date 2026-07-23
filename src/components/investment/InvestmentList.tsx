import React from 'react';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import InvestmentCard from './InvestmentCard';
import CategoryGroup from './CategoryGroup';
import EmptyState from '../common/EmptyState';
import { HoldingType } from '../../types';
import type { Account, Investment } from '../../types';
import { CATEGORY_GROUP_ORDER, HoldingTypeLabels } from '../../config/constants';

/**
 * InvestmentList — 投资持仓列表
 *
 * - 过滤 CASH（活期）记录，不进投资列表（活期只计入账户余额）；该口径用于平铺 / 按账户路径。
 * - 可按账户分组展示（groupByAccount）。
 * - 可按资产类别（基金/理财/黄金/现金）分组展示（groupByCategory）；该路径基于完整 investments（含 CASH）。
 * - 通过 accounts 映射把 accountId → 账户名传给卡片。
 *
 * 两条分组路径口径隔离：
 *   - groupByCategory 使用完整 investments（含 CASH），按 CATEGORY_GROUP_ORDER 固定顺序分组；
 *   - groupByAccount / 平铺路径沿用 visible（过滤 CASH）。
 */
interface InvestmentListProps {
  investments: Investment[];
  accounts?: Account[];
  /** 是否按账户分组（既有，保留） */
  groupByAccount?: boolean;
  /** 是否按资产类别（基金/理财/黄金/现金）分组（新增） */
  groupByCategory?: boolean;
  onEdit?: (investment: Investment) => void;
  onDelete?: (investment: Investment) => void;
  onRefreshPrice?: (investment: Investment) => void;
}

const InvestmentList: React.FC<InvestmentListProps> = ({
  investments,
  accounts = [],
  groupByAccount = false,
  groupByCategory = false,
  onEdit,
  onDelete,
  onRefreshPrice,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [selected, setSelected] = React.useState<Investment | null>(null);

  const accountNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  // 过滤掉活期（CASH）记录，并按市值（marketValue）降序排序（平铺 / 按账户路径口径）
  const visible = React.useMemo(
    () =>
      investments
        .filter((inv) => inv.holdingType !== HoldingType.CASH)
        .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)),
    [investments],
  );

  // 按资产类别分组（含 CASH）：固定顺序 + 组内 marketValue 降序 + 空组隐藏
  const categoryGroups = React.useMemo(
    () =>
      CATEGORY_GROUP_ORDER.map((type) => ({
        type,
        title: HoldingTypeLabels[type],
        items: investments
          .filter((inv) => inv.holdingType === type)
          .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)),
      })).filter((g) => g.items.length > 0),
    [investments],
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, investment: Investment) => {
    setMenuAnchor(event.currentTarget);
    setSelected(investment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelected(null);
  };

  const renderCard = (investment: Investment) => (
    <InvestmentCard
      key={investment.id}
      investment={investment}
      accountName={accountNameMap.get(investment.accountId)}
      onMenuClick={(e) => handleMenuClick(e, investment)}
      onRefreshPrice={onRefreshPrice}
    />
  );

  // 分组渲染（按账户）
  const renderGrouped = () => {
    const groups = new Map<string, Investment[]>();
    for (const inv of visible) {
      const list = groups.get(inv.accountId) ?? [];
      list.push(inv);
      groups.set(inv.accountId, list);
    }
    return [...groups.entries()].map(([accountId, list]) => (
      <Box key={accountId} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
          {accountNameMap.get(accountId) ?? '未归属账户'} ({list.length})
        </Typography>
        {list.map(renderCard)}
      </Box>
    ));
  };

  // 空态判定：category 模式看 categoryGroups.length，其它看 visible.length
  if (groupByCategory ? categoryGroups.length === 0 : visible.length === 0) {
    return (
      <EmptyState
        title="暂无投资持仓"
        description="点击「同步资产」截图识别，或右下角按钮手动添加"
      />
    );
  }

  return (
    <Box>
      {groupByCategory
        ? categoryGroups.map((g) => (
            <CategoryGroup
              key={g.type}
              type={g.type}
              title={g.title}
              items={g.items}
              renderCard={renderCard}
            />
          ))
        : groupByAccount
          ? renderGrouped()
          : visible.map(renderCard)}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {onRefreshPrice && selected && (selected.holdingType === HoldingType.FUND || selected.holdingType === HoldingType.GOLD) && (
          <MenuItem
            onClick={() => {
              onRefreshPrice(selected);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{selected?.holdingType === HoldingType.GOLD ? '刷新金价' : '刷新净值'}</ListItemText>
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem
            onClick={() => {
              if (selected) onEdit(selected);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>编辑</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem
            onClick={() => {
              if (selected) onDelete(selected);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>删除</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default InvestmentList;

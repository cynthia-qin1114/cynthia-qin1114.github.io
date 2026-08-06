import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { formatCurrency, formatPercentValue, formatDate } from '../../utils/format';
import { profitColor } from '../../utils/profitColor';
import { CASH_DISPLAY_LABEL } from '../../config/constants';
import { HoldingType } from '../../types';
import type { Investment } from '../../types';

/**
 * InvestmentCard — 持仓分条卡片（暗色科技风）
 * 顶部 3px 渐变 accent 条（primary → cyan）；hover 上浮 + 霓虹辉光。
 *
 * 按产品分条展示：产品名 · 所属账户 · 持有市值 · 当日收益(额+率) · 持有收益(额+率)。
 * 区分 FUND / WEALTH / GOLD / CASH 视图：
 *   - FUND：展示份额/成本价/当前净值。
 *   - WEALTH：理财-like 视图（机构·账户 + 市值/收益）。
 *   - GOLD：黄金专属视图（当前金价 + 克重 + 刷新；徽章「黄金」）。
 *   - CASH：简化视图，仅展示名称与持有市值，整体淡灰、非收益色（避免把活期当基金渲染）。
 * 颜色统一走 profitColor()（涨红跌绿）。
 */
interface InvestmentCardProps {
  investment: Investment;
  /** 所属账户名称（由父层按 accountId 映射传入） */
  accountName?: string;
  onMenuClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onClick?: () => void;
  /** GOLD/FUND 刷新净值回调（来自列表透传） */
  onRefreshPrice?: (investment: Investment) => void;
}

/** 展示一个「金额 + 比例」的收益块（涨红跌绿；undefined 显示「—」） */
const ProfitBlock: React.FC<{ label: string; amount?: number; rate?: number }> = ({
  label,
  amount,
  rate,
}) => {
  const color = profitColor(amount);
  const hasAmount = amount !== undefined && !Number.isNaN(amount);
  const sign = hasAmount && (amount as number) > 0 ? '+' : '';
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, color }}>
        {hasAmount ? `${sign}${formatCurrency(amount as number, false)}` : '—'}
      </Typography>
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {rate !== undefined && !Number.isNaN(rate) ? formatPercentValue(rate) : '—'}
      </Typography>
    </Box>
  );
};

const InvestmentCard: React.FC<InvestmentCardProps> = ({
  investment,
  accountName,
  onMenuClick,
  onClick,
  onRefreshPrice,
}) => {
  const isCash = investment.holdingType === HoldingType.CASH;
  const isGold = investment.holdingType === HoldingType.GOLD;
  const isWealth = investment.holdingType === HoldingType.WEALTH;
  const isFund = investment.holdingType === HoldingType.FUND;

  const holdingProfit = investment.holdingProfit ?? investment.profitLoss;
  const holdingProfitRate = investment.holdingProfitRate ?? investment.profitLossRate;

  // 副标题：WEALTH=机构·账户；FUND=基金代码·账户；CASH=账户
  const subtitleParts: string[] = [];
  if (isWealth && investment.institution) subtitleParts.push(investment.institution);
  if (isFund && investment.fundCode) subtitleParts.push(investment.fundCode);
  if (accountName) subtitleParts.push(accountName);

  // 类型徽章
  const badgeLabel = isCash ? '现金' : isGold ? '黄金' : isWealth ? '理财' : '基金';
  const badgeColor: 'default' | 'secondary' | 'primary' | 'warning' = isCash
    ? 'default'
    : isGold
      ? 'warning'
      : isWealth
        ? 'secondary'
        : 'primary';

  // CASH 卡片：淡灰底、非收益色，与现金组视觉一致（T05）
  const cardBg = isCash ? 'action.hover' : 'background.paper';
  const titleColor = isCash ? 'text.secondary' : 'text.primary';

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        mb: 1.5,
        bgcolor: cardBg,
        overflow: 'hidden',
        '&:hover': onClick
          ? {
              boxShadow:
                '0 1px 2px rgba(33,31,26,0.05), 0 10px 26px rgba(33,31,26,0.10)',
              transform: 'translateY(-2px)',
            }
          : {},
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* 顶部渐变 accent 条 */}
      <Box
        sx={{
          height: 3,
          background: 'linear-gradient(90deg,#B8894A 0%,#9C6B2E 100%)',
        }}
      />
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        {/* 头部：产品名 + 类型徽章 + 菜单 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: titleColor }} noWrap>
                {isCash ? CASH_DISPLAY_LABEL : investment.fundName}
              </Typography>
              <Chip
                label={badgeLabel}
                size="small"
                color={badgeColor}
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: 11,
                  ...(isGold ? { color: 'warning.main', borderColor: 'warning.main' } : {}),
                }}
              />
            </Box>
            {subtitleParts.length > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {subtitleParts.join(' · ')}
              </Typography>
            )}
          </Box>
          {onMenuClick && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick(e);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* GOLD 视图专属：当前金价（元/克）+ 刷新 */}
        {isGold && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>当前金价（近似）</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {investment.currentPrice && investment.currentPrice > 0
                  ? `¥${investment.currentPrice.toFixed(2)}/g · ${investment.shares?.toFixed(2) ?? '0.00'} g`
                  : '金价未录入 · 可在录入时补充'}
              </Typography>
            </Box>
            {onRefreshPrice && (
              <Button
                size="small"
                variant="contained"
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshPrice(investment);
                }}
                sx={{ bgcolor: 'rgba(0,0,0,0.12)', '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              >
                刷新金价
              </Button>
            )}
          </Box>
        )}

        {/* FUND 视图专属：份额/成本价/当前净值 */}
        {isFund && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
            <Box sx={{ flex: '1 1 30%' }}>
              <Typography variant="caption" color="text.secondary">持仓份额</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {investment.shares.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 30%' }}>
              <Typography variant="caption" color="text.secondary">成本价</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ¥{investment.costPrice.toFixed(4)}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 30%' }}>
              <Typography variant="caption" color="text.secondary">当前净值</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ¥{investment.currentPrice.toFixed(4)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* 市值 + 当日收益 + 持有收益（CASH 简化：仅持有市值，不混入投资收益字段） */}
        {isCash ? (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor }}>
              {formatCurrency(investment.marketValue)}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">持有市值</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {formatCurrency(investment.marketValue)}
              </Typography>
            </Box>
            <ProfitBlock label="当日收益" amount={investment.dailyProfit} rate={investment.dailyProfitRate} />
            <ProfitBlock label="持有收益" amount={holdingProfit} rate={holdingProfitRate} />
          </Box>
        )}

        {/* WEALTH / GOLD 展示「更新于」 */}
        {isWealth && investment.lastSyncAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            更新于 {formatDate(investment.lastSyncAt)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default InvestmentCard;

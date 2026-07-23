import React, { useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import { goldPriceService } from '../../services/goldPriceService';
import { investmentRepository } from '../../db/repositories/investmentRepository';
import { HoldingType } from '../../types';
import { formatDate } from '../../utils/format';

/**
 * GoldPriceBoard — 轻量金价看板（黄金专区顶部）
 *
 * 展示：当前金价（元/克，近似）/ 来源 / 更新时间；提供「手动刷新」按钮。
 * 刷新：goldPriceService.getGoldPrice(true) 强制拉取 → 同步到所有 GOLD 持仓
 * （仅更新 currentPrice 展示参考，持仓金额以用户录入市值为准，绝不重算）→ onSynced 回调刷新列表。
 *
 * ⚠️ 近似实时：ETF 净值代理，UI 已标注「近似」。
 */
interface GoldPriceBoardProps {
  /** 同步完成回调（刷新持仓列表） */
  onSynced?: () => void;
}

const GoldPriceBoard: React.FC<GoldPriceBoardProps> = ({ onSynced }) => {
  const [price, setPrice] = useState<number | null>(null);
  const [source, setSource] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const p = await goldPriceService.getGoldPrice(force);
      if (p) {
        setPrice(p.price);
        setSource(p.source);
        setUpdatedAt(p.updatedAt);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(false);
  }, [load]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const p = await goldPriceService.getGoldPrice(true);
      if (p) {
        setPrice(p.price);
        setSource(p.source);
        setUpdatedAt(p.updatedAt);
        // 持仓金额以用户录入市值为准，金价同步仅更新展示参考，绝不重算覆盖
        const revalue = false;
        const all = await investmentRepository.getAll();
        for (const inv of all) {
          if (inv.holdingType === HoldingType.GOLD) {
            await investmentRepository.applyGoldPrice(inv.id, p.price, revalue);
          }
        }
        if (onSynced) onSynced();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        background: 'linear-gradient(135deg, #FFB300 0%, #FB8C00 100%)',
        color: 'white',
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>当前金价（近似实时）</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {loading ? '同步中...' : price !== null ? `¥${price.toFixed(2)} / g` : '—'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {source || '来源：黄金ETF净值(518880)'}
              {updatedAt ? ` · 更新于 ${formatDate(updatedAt)}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {loading && <CircularProgress size={18} sx={{ color: 'white' }} />}
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.12)', '&:hover': { bgcolor: 'rgba(0,0,0,0.22)' } }}
              aria-label="刷新金价"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          onClick={handleRefresh}
          disabled={loading}
          sx={{ mt: 1, bgcolor: 'rgba(0,0,0,0.18)', '&:hover': { bgcolor: 'rgba(0,0,0,0.28)' }, color: 'white' }}
        >
          {loading ? '同步中...' : '手动同步金价'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoldPriceBoard;

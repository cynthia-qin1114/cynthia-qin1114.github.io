import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useInvestment } from '../hooks/useInvestment';
import { useAccountStore } from '../store/useAccountStore';
import { useNavigate } from 'react-router-dom';
import InvestmentList from '../components/investment/InvestmentList';
import InvestmentForm from '../components/investment/InvestmentForm';
import WealthSyncOcrButton from '../components/investment/WealthSyncOcrButton';
import WealthConfirmDialog from '../components/investment/WealthConfirmDialog';
import type { WealthSyncOcrPayload } from '../components/investment/WealthSyncOcrButton';
import Loading from '../components/common/Loading';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import GoldEntry from '../components/gold/GoldEntry';
import { formatCurrency, formatPercentValue } from '../utils/format';
import { COLORS, ROUTES } from '../config/constants';
import { goldPriceService } from '../services/goldPriceService';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { HoldingType } from '../types';
import type { Investment, CreateInvestmentDTO } from '../types';

/**
 * InvestPage — 投资页
 * 持仓分条列表 + 收益概览（含当日收益）+ 资产同步向导 + 理财批量确认
 */
const InvestPage: React.FC = () => {
  const {
    investments,
    loading,
    summary,
    refreshing,
    fetchInvestments,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    batchUpsertWealth,
    refreshPrices,
    refreshSinglePrice,
  } = useInvestment();

  const { accounts, fetchAccounts } = useAccountStore();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<CreateInvestmentDTO> | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [wealthConfirmOpen, setWealthConfirmOpen] = useState(false);
  const [wealthPayload, setWealthPayload] = useState<WealthSyncOcrPayload | null>(null);
  const [goldEntryOpen, setGoldEntryOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenCreate = () => {
    setEditInvestment(null);
    setPrefillData(null);
    setFormOpen(true);
  };

  /** 向导完成回调：按类型分流 */
  const handleWizardResult = async (payload: WealthSyncOcrPayload) => {
    const { ocrType, account, prefills, matched } = payload;

    if (ocrType === 'WEALTH') {
      setWealthPayload(payload);
      setWealthConfirmOpen(true);
      setOcrHint(matched ? `识别到 ${prefills.length} 条理财，请确认` : '未识别到理财条目，请手动添加');
      return;
    }

    if (ocrType === 'ASSET') {
      if (prefills.length > 0) {
        await batchUpsertWealth(prefills as CreateInvestmentDTO[]);
        await fetchInvestments();
        await fetchAccounts();
        const total = prefills.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
        setOcrHint(
          `已更新「${account.name}」资产 ${prefills.length} 项，合计 ${formatCurrency(total)}`,
        );
      } else {
        setOcrHint('未识别到资产金额，请重试');
      }
      return;
    }

    // FUND
    setEditInvestment(null);
    setPrefillData(matched ? prefills[0] : { holdingType: HoldingType.FUND, accountId: account.id, fundName: '' });
    setOcrHint(matched ? '已自动识别，请确认或补充信息' : '未能自动识别，请手动填写');
    setFormOpen(true);
  };

  const handleWealthConfirm = async (dtos: CreateInvestmentDTO[]) => {
    await batchUpsertWealth(dtos);
    await fetchInvestments();
    await fetchAccounts();
    setOcrHint(`已保存 ${dtos.length} 条理财持仓`);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditInvestment(null);
    setPrefillData(null);
  };

  const handleEdit = (investment: Investment) => {
    setEditInvestment(investment);
    setPrefillData(null);
    setFormOpen(true);
  };

  const handleDelete = (investment: Investment) => {
    confirm({
      title: '删除持仓',
      message: `确定删除 ${investment.fundName} 持仓吗？`,
      confirmText: '删除',
      confirmColor: 'error',
      onConfirm: () => deleteInvestment(investment.id),
    });
  };

  const handleRefreshPrice = async (investment: Investment) => {
    if (investment.holdingType === HoldingType.GOLD) {
      // 黄金：强制拉取金价并同步到该 GOLD 持仓（按策略决定是否重算市值）
      const p = await goldPriceService.getGoldPrice(true);
      if (p) {
        // 持仓金额以用户录入市值为准，金价同步仅更新展示参考，绝不重算覆盖
        const revalue = false;
        await investmentRepository.applyGoldPrice(investment.id, p.price, revalue);
        await fetchInvestments();
        await fetchAccounts();
      }
      return;
    }
    await refreshSinglePrice(investment.id, investment.fundCode);
  };

  const totalProfitLoss = summary?.totalProfitLoss ?? 0;
  const totalDailyProfit = summary?.totalDailyProfit ?? 0;

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          投资
        </Typography>
        <IconButton onClick={refreshPrices} disabled={refreshing || investments.length === 0}>
          {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
        </IconButton>
      </Box>

      {/* 收益概览卡片 */}
      {summary && (
        <Card
          sx={{
            mb: 2,
            background: `linear-gradient(135deg, ${COLORS.INVEST} 0%, #F57C00 100%)`,
            color: 'white',
          }}
        >
          <CardContent sx={{ py: 3 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>投资市值</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}>
              {formatCurrency(summary.totalMarketValue)}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>当日收益</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {totalDailyProfit > 0 ? '+' : ''}{formatCurrency(totalDailyProfit, false)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>持有收益</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {totalProfitLoss > 0 ? '+' : ''}{formatCurrency(totalProfitLoss, false)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>收益率</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {formatPercentValue(summary.totalProfitLossRate)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 定投计划入口（需求⑤） */}
      <Card
        sx={{ mb: 2, cursor: 'pointer', borderLeft: `4px solid ${COLORS.INVEST}` }}
        onClick={() => navigate(ROUTES.DCA)}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              我的定投计划
            </Typography>
            <Typography variant="caption" color="text.secondary">
              基金定投自动扣款与历史
            </Typography>
          </Box>
          <Typography sx={{ color: COLORS.INVEST, fontWeight: 700 }}>→</Typography>
        </CardContent>
      </Card>

      {/* 黄金录入入口（需求④） */}
      <Card
        sx={{ mb: 2, cursor: 'pointer', borderLeft: '4px solid #FFB300' }}
        onClick={() => setGoldEntryOpen(true)}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              录入黄金持仓
            </Typography>
            <Typography variant="caption" color="text.secondary">
              招行黄金 OCR 识别 + 金价近似同步
            </Typography>
          </Box>
          <Typography sx={{ color: '#FFB300', fontWeight: 700 }}>→</Typography>
        </CardContent>
      </Card>

      {/* 资产同步向导 */}
      <Box sx={{ mb: 2 }}>
        <WealthSyncOcrButton accounts={accounts} onResult={handleWizardResult} />
      </Box>

      {/* 持仓列表 */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        持仓列表
      </Typography>

      {loading ? (
        <Loading message="加载持仓数据..." />
      ) : (
        <InvestmentList
          investments={investments}
          accounts={accounts}
          groupByCategory
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefreshPrice={handleRefreshPrice}
        />
      )}

      <Fab
        color="primary"
        onClick={handleOpenCreate}
        sx={{
          position: 'fixed',
          bottom: 70,
          right: '50%',
          transform: 'translateX(215px)',
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>

      <InvestmentForm
        open={formOpen}
        investment={editInvestment}
        accounts={accounts}
        prefillData={prefillData}
        onClose={handleCloseForm}
        onSubmit={async (data: CreateInvestmentDTO) => {
          if (editInvestment) {
            await updateInvestment(editInvestment.id, data);
          } else {
            await createInvestment(data);
          }
          await fetchInvestments();
          await fetchAccounts();
        }}
      />

      <WealthConfirmDialog
        open={wealthConfirmOpen}
        account={wealthPayload?.account ?? null}
        prefills={wealthPayload?.prefills ?? []}
        onClose={() => {
          setWealthConfirmOpen(false);
          setWealthPayload(null);
        }}
        onConfirm={handleWealthConfirm}
      />

      <GoldEntry
        open={goldEntryOpen}
        onClose={() => setGoldEntryOpen(false)}
        onSaved={() => {
          setGoldEntryOpen(false);
          void fetchInvestments();
          void fetchAccounts();
        }}
      />

      <Snackbar
        open={Boolean(ocrHint)}
        autoHideDuration={3000}
        onClose={() => setOcrHint(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setOcrHint(null)} sx={{ width: '100%' }}>
          {ocrHint}
        </Alert>
      </Snackbar>

      {dialog}
    </Box>
  );
};

export default InvestPage;
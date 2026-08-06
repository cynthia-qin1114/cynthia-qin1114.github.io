import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useInvestment } from '../../hooks/useInvestment';
import { useAccountStore } from '../../store/useAccountStore';
import WealthSyncOcrButton from '../investment/WealthSyncOcrButton';
import type { WealthSyncOcrPayload } from '../investment/WealthSyncOcrButton';
import WealthConfirmDialog from '../investment/WealthConfirmDialog';
import InvestmentForm from '../investment/InvestmentForm';
import InstitutionLogo from '../common/InstitutionLogo';
import { investmentRepository } from '../../db/repositories/investmentRepository';
import { formatCurrency } from '../../utils/format';
import {
  COLORS,
  SERIF_FONT,
  CATEGORY_GROUP_ORDER,
  HoldingTypeLabels,
  CASH_DISPLAY_LABEL,
} from '../../config/constants';
import { HoldingType } from '../../types';
import type { Account, Investment, CreateInvestmentDTO } from '../../types';

/**
 * 分区标题（左黄铜竖条签名元素）
 */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 2.5 }}>
    <Box
      sx={{
        width: 3,
        height: 16,
        borderRadius: 2,
        background: `linear-gradient(180deg, ${COLORS.BRASS}, ${COLORS.PRIMARY})`,
      }}
    />
    <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
      {children}
    </Typography>
  </Box>
);

/** 持仓展示名：CASH 用中性「活期」文案，其余用产品名 */
const displayName = (h: Investment): string =>
  h.holdingType === HoldingType.CASH ? CASH_DISPLAY_LABEL : h.fundName;

/** 资产类别对应的暖调强调色 */
const categoryAccent = (type: HoldingType): string => {
  switch (type) {
    case HoldingType.GOLD:
      return COLORS.GOLD;
    case HoldingType.CASH:
      return '#8A8478';
    default:
      return COLORS.INVEST;
  }
};

/**
 * AccountDetailDialog — 账户明细（需求②可编辑 + 需求③ Impeccable 重做）
 *
 * 从「设置-账户管理」点击账户卡片打开：
 * - 顶部：机构标志 + 账户名 + 类型副标
 * - 余额 Hero：账户余额大号衬线数字（私人银行签名感）
 * - 资产分布：活期/基金/理财/黄金 四类市值小计（2×2 暖纸瓦片）
 * - 录入入口：①「截图识别」复用 WealthSyncOcrButton ②「手动录入」打开 InvestmentForm
 * - 持仓明细：可逐项「编辑 / 删除」（编辑复用 InvestmentForm 编辑态）
 */
interface AccountDetailDialogProps {
  open: boolean;
  account: Account | null;
  accounts: Account[];
  onClose: () => void;
}

const AccountDetailDialog: React.FC<AccountDetailDialogProps> = ({
  open,
  account,
  accounts,
  onClose,
}) => {
  const {
    createInvestment,
    updateInvestment,
    deleteInvestment,
    batchUpsertWealth,
    fetchInvestments,
  } = useInvestment();
  const { fetchAccounts } = useAccountStore();

  const [holdings, setHoldings] = useState<Investment[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);
  const [wealthConfirmOpen, setWealthConfirmOpen] = useState(false);
  const [wealthPayload, setWealthPayload] = useState<WealthSyncOcrPayload | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!account) return;
    const list = await investmentRepository.getByAccountId(account.id);
    setHoldings(list);
  }, [account]);

  useEffect(() => {
    if (open && account) {
      void fetchHoldings();
      setManualOpen(false);
      setEditing(null);
      setDeleteTarget(null);
      setWealthConfirmOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account]);

  // 四类资产市值小计
  const categoryTotals: Record<HoldingType, number> = {
    [HoldingType.FUND]: 0,
    [HoldingType.WEALTH]: 0,
    [HoldingType.GOLD]: 0,
    [HoldingType.CASH]: 0,
  };
  holdings.forEach((h) => {
    categoryTotals[h.holdingType] = (categoryTotals[h.holdingType] ?? 0) + (h.marketValue ?? 0);
  });

  const handleWizardResult = async (payload: WealthSyncOcrPayload) => {
    const { ocrType, account: acc, prefills, matched } = payload;
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
        await fetchHoldings();
        const total = prefills.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
        setOcrHint(`已更新「${acc.name}」资产 ${prefills.length} 项，合计 ${formatCurrency(total)}`);
      } else {
        setOcrHint('未识别到资产金额，请重试');
      }
      return;
    }
    // FUND
    setManualOpen(true);
    setOcrHint(matched ? '已自动识别，请确认或补充信息' : '未能自动识别，请手动填写');
  };

  const handleWealthConfirm = async (dtos: CreateInvestmentDTO[]) => {
    await batchUpsertWealth(dtos);
    await fetchInvestments();
    await fetchAccounts();
    await fetchHoldings();
    setOcrHint(`已保存 ${dtos.length} 条理财持仓`);
  };

  // 表单统一提交：编辑态走 update，新增态走 create
  const handleFormSubmit = async (data: CreateInvestmentDTO) => {
    if (editing) {
      await updateInvestment(editing.id, data);
      setOcrHint(`已更新「${displayName(editing)}」`);
    } else {
      await createInvestment({ ...data, accountId: account?.id ?? data.accountId });
      setOcrHint('已新增一条持仓');
    }
    setManualOpen(false);
    setEditing(null);
    await fetchInvestments();
    await fetchAccounts();
    await fetchHoldings();
  };

  const handleFormClose = () => {
    setManualOpen(false);
    setEditing(null);
  };

  const handleEdit = (h: Investment) => {
    setEditing(h);
  };

  const handleDeleteClick = (h: Investment) => {
    setDeleteTarget(h);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const name = displayName(deleteTarget);
    await deleteInvestment(deleteTarget.id);
    setDeleteTarget(null);
    await fetchInvestments();
    await fetchAccounts();
    await fetchHoldings();
    setOcrHint(`已删除「${name}」`);
  };

  if (!account) return null;

  const formOpen = manualOpen || Boolean(editing);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <InstitutionLogo name={account.name} size={40} shape="circle" />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              sx={{ lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {account.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              共 {holdings.length} 项持仓
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* 余额 Hero（衬线大数字签名） */}
        <Box sx={{ pb: 2, mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ letterSpacing: '0.1em', color: COLORS.PRIMARY_DARK, fontWeight: 600 }}
          >
            账户余额
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF_FONT,
              fontSize: 36,
              fontWeight: 600,
              color: COLORS.TEXT_PRIMARY,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
              mt: 0.5,
            }}
          >
            {formatCurrency(account.balance)}
          </Typography>
        </Box>

        {/* 资产分布：2×2 暖纸瓦片 */}
        <SectionTitle>资产分布</SectionTitle>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 0.5 }}>
          {CATEGORY_GROUP_ORDER.map((type) => {
            const amount = categoryTotals[type] ?? 0;
            const accent = categoryAccent(type);
            return (
              <Box
                key={type}
                sx={{
                  background: '#F5F0E6',
                  border: `1px solid ${COLORS.DIVIDER}`,
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                  <Typography variant="caption" color="text.secondary">
                    {HoldingTypeLabels[type]}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF_FONT,
                    fontSize: 19,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: amount > 0 ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
                  }}
                >
                  {formatCurrency(amount)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* 录入入口 */}
        <SectionTitle>录入资产</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <WealthSyncOcrButton
            presetAccount={account}
            accounts={accounts}
            onResult={handleWizardResult}
          />
          <Button
            variant="outlined"
            onClick={() => setManualOpen(true)}
            fullWidth
            sx={{ justifyContent: 'flex-start', py: 1.5, px: 2 }}
          >
            手动录入（活期 / 理财 / 基金 / 黄金）
          </Button>
        </Box>

        {/* 持仓明细（可编辑） */}
        <SectionTitle>持仓明细（{holdings.length}）</SectionTitle>
        {holdings.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            暂无持仓，使用上方方式录入。
          </Typography>
        ) : (
          <Box>
            {holdings.map((h) => (
              <Box
                key={h.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.25,
                  borderBottom: `1px solid ${COLORS.DIVIDER}`,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                    {displayName(h)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {h.holdingType === HoldingType.CASH
                      ? '活期'
                      : h.institution
                        ? `${HoldingTypeLabels[h.holdingType]} · ${h.institution}`
                        : HoldingTypeLabels[h.holdingType]}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                >
                  {formatCurrency(h.marketValue ?? 0)}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`编辑 ${displayName(h)}`}
                  onClick={() => handleEdit(h)}
                  sx={{ color: COLORS.PRIMARY_DARK, width: 40, height: 40 }}
                >
                  <EditOutlined fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`删除 ${displayName(h)}`}
                  onClick={() => handleDeleteClick(h)}
                  sx={{ color: COLORS.EXPENSE, width: 40, height: 40 }}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth>
          关闭
        </Button>
      </DialogActions>

      {/* 理财批量确认 */}
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

      {/* 手动录入 / 编辑表单 */}
      <InvestmentForm
        open={formOpen}
        investment={editing}
        accounts={accounts}
        prefillData={
          account && !editing ? { accountId: account.id, holdingType: HoldingType.WEALTH } : null
        }
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />

      {/* 删除确认 */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>删除持仓</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定删除「{deleteTarget ? displayName(deleteTarget) : ''}」这条持仓吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" fullWidth>
            取消
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" fullWidth>
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(ocrHint)}
        autoHideDuration={3000}
        onClose={() => setOcrHint(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setOcrHint(null)}
          sx={{ width: '100%' }}
        >
          {ocrHint}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default AccountDetailDialog;

import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useInvestment } from '../../hooks/useInvestment';
import { useAccountStore } from '../../store/useAccountStore';
import WealthSyncOcrButton from '../investment/WealthSyncOcrButton';
import type { WealthSyncOcrPayload } from '../investment/WealthSyncOcrButton';
import WealthConfirmDialog from '../investment/WealthConfirmDialog';
import InvestmentForm from '../investment/InvestmentForm';
import { investmentRepository } from '../../db/repositories/investmentRepository';
import { formatCurrency } from '../../utils/format';
import { CATEGORY_GROUP_ORDER, HoldingTypeLabels } from '../../config/constants';
import { HoldingType } from '../../types';
import type { Account, Investment, CreateInvestmentDTO } from '../../types';

/**
 * AccountDetailDialog — 账户明细（需求①）
 *
 * 从「设置-账户管理」点击账户卡片打开：
 * - 顶部：账户名 + 余额
 * - 资产汇总：活期 / 理财 / 基金 / 黄金 四类市值小计（按该账户下持仓聚合）
 * - 录入入口：①「截图识别」复用 WealthSyncOcrButton（presetAccount 直接归本账户）
 *            ②「手动录入」打开 InvestmentForm（预置本账户）
 * - 持仓清单（简要）
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
  const { createInvestment, batchUpsertWealth, fetchInvestments } = useInvestment();
  const { fetchAccounts } = useAccountStore();

  const [holdings, setHoldings] = useState<Investment[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
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
    // FUND 走 InvestmentForm 确认（预置账户 + 识别字段）
    setOcrHint(matched ? '已自动识别，请确认或补充信息' : '未能自动识别，请手动填写');
  };

  const handleWealthConfirm = async (dtos: CreateInvestmentDTO[]) => {
    await batchUpsertWealth(dtos);
    await fetchInvestments();
    await fetchAccounts();
    await fetchHoldings();
    setOcrHint(`已保存 ${dtos.length} 条理财持仓`);
  };

  const handleManualSubmit = async (data: CreateInvestmentDTO) => {
    await createInvestment({ ...data, accountId: account?.id ?? data.accountId });
    setManualOpen(false);
    await fetchInvestments();
    await fetchAccounts();
    await fetchHoldings();
  };

  if (!account) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{account.name}</span>
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {formatCurrency(account.balance)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {/* 资产汇总：四类 */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          资产汇总
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {CATEGORY_GROUP_ORDER.map((type) => {
            const amount = categoryTotals[type] ?? 0;
            return (
              <Chip
                key={type}
                label={`${HoldingTypeLabels[type]} ${formatCurrency(amount)}`}
                variant={amount > 0 ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Box>

        {/* 录入入口 */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          录入资产
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
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

        {/* 持仓清单 */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          持仓明细（{holdings.length}）
        </Typography>
        {holdings.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            暂无持仓，使用上方方式录入。
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {holdings.map((h) => (
              <Box
                key={h.id}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}
              >
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {h.fundName}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {HoldingTypeLabels[h.holdingType]}
                  </Typography>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(h.marketValue ?? 0)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
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

      {/* 手动录入表单 */}
      <InvestmentForm
        open={manualOpen}
        investment={null}
        accounts={accounts}
        prefillData={account ? { accountId: account.id, holdingType: HoldingType.WEALTH } : null}
        onClose={() => setManualOpen(false)}
        onSubmit={handleManualSubmit}
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
    </Dialog>
  );
};

export default AccountDetailDialog;

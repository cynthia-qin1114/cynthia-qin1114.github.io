import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { fundApiService } from '../../services/fundApiService';
import { HoldingType } from '../../types';
import type { Account, Investment, CreateInvestmentDTO } from '../../types';

/**
 * InvestmentForm — 添加/编辑持仓表单
 *
 * 按 holdingType 动态渲染：
 * - FUND：基金代码/名称/份额/成本价/当前净值/买入日 + 账户选择
 * - WEALTH：产品名/机构/市值/当日收益/持有收益 + 账户选择
 * 编辑已有持仓时锁定类型（不允许 FUND↔WEALTH 互转）。
 */
interface InvestmentFormProps {
  open: boolean;
  investment?: Investment | null;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (data: CreateInvestmentDTO) => Promise<void>;
  /** OCR 识别后的预填数据（仅在新增场景、无 investment 时生效） */
  prefillData?: Partial<CreateInvestmentDTO> | null;
}

const DEFAULT_ACCOUNT_ID = 'acc_citic_securities';

const InvestmentForm: React.FC<InvestmentFormProps> = ({
  open,
  investment,
  accounts,
  onClose,
  onSubmit,
  prefillData,
}) => {
  const [holdingType, setHoldingType] = useState<HoldingType>(HoldingType.FUND);
  const [accountId, setAccountId] = useState<string>(DEFAULT_ACCOUNT_ID);
  const [fundCode, setFundCode] = useState('');
  const [fundName, setFundName] = useState('');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [institution, setInstitution] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [dailyProfit, setDailyProfit] = useState('');
  const [holdingProfit, setHoldingProfit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetchingFund, setFetchingFund] = useState(false);

  useEffect(() => {
    if (investment) {
      setHoldingType(investment.holdingType);
      setAccountId(investment.accountId || DEFAULT_ACCOUNT_ID);
      setFundCode(investment.fundCode);
      setFundName(investment.fundName);
      setShares(String(investment.shares));
      setCostPrice(String(investment.costPrice));
      setCurrentPrice(String(investment.currentPrice));
      setBuyDate(investment.buyDate.split('T')[0]);
      setInstitution(investment.institution ?? '');
      setMarketValue(String(investment.marketValue));
      setDailyProfit(investment.dailyProfit !== undefined ? String(investment.dailyProfit) : '');
      setHoldingProfit(
        investment.holdingProfit !== undefined
          ? String(investment.holdingProfit)
          : String(investment.profitLoss),
      );
    } else if (prefillData) {
      setHoldingType(prefillData.holdingType ?? HoldingType.FUND);
      setAccountId(prefillData.accountId || DEFAULT_ACCOUNT_ID);
      setFundCode(prefillData.fundCode ?? '');
      setFundName(prefillData.fundName ?? '');
      setShares(prefillData.shares !== undefined ? String(prefillData.shares) : '');
      setCostPrice(prefillData.costPrice !== undefined ? String(prefillData.costPrice) : '');
      setCurrentPrice(prefillData.currentPrice !== undefined ? String(prefillData.currentPrice) : '');
      setBuyDate(
        prefillData.buyDate ? prefillData.buyDate.split('T')[0] : new Date().toISOString().split('T')[0],
      );
      setInstitution(prefillData.institution ?? '');
      setMarketValue(prefillData.marketValue !== undefined ? String(prefillData.marketValue) : '');
      setDailyProfit(prefillData.dailyProfit !== undefined ? String(prefillData.dailyProfit) : '');
      setHoldingProfit(prefillData.holdingProfit !== undefined ? String(prefillData.holdingProfit) : '');
      if ((prefillData.holdingType ?? HoldingType.FUND) === HoldingType.FUND && prefillData.fundCode?.trim()) {
        void handleFetchFund(prefillData.fundCode.trim());
      }
    } else {
      setHoldingType(HoldingType.FUND);
      setAccountId(DEFAULT_ACCOUNT_ID);
      setFundCode('');
      setFundName('');
      setShares('');
      setCostPrice('');
      setCurrentPrice('');
      setBuyDate(new Date().toISOString().split('T')[0]);
      setInstitution('');
      setMarketValue('');
      setDailyProfit('');
      setHoldingProfit('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investment, prefillData, open]);

  const handleFetchFund = async (codeOverride?: string) => {
    const code = (codeOverride ?? fundCode).trim();
    if (!code) return;
    setFetchingFund(true);
    try {
      const nav = await fundApiService.getFundNav(code);
      if (nav) {
        setFundName((prev) => prev.trim() || nav.fundName);
        const gszz = parseFloat(nav.gszz);
        const dwjz = parseFloat(String(nav.nav));
        if (!isNaN(gszz) && gszz > 0) {
          setCurrentPrice(String(gszz));
        } else if (!isNaN(dwjz) && dwjz > 0) {
          setCurrentPrice(String(dwjz));
        }
      }
    } catch (error) {
      console.error('Failed to fetch fund info:', error);
    } finally {
      setFetchingFund(false);
    }
  };

  const isFund = holdingType === HoldingType.FUND;
  const canSubmit = isFund
    ? Boolean(fundCode.trim() && shares && costPrice)
    : Boolean(fundName.trim() && marketValue);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let data: CreateInvestmentDTO;
      if (isFund) {
        data = {
          holdingType: HoldingType.FUND,
          accountId,
          fundCode: fundCode.trim(),
          fundName: fundName.trim() || `基金${fundCode.trim()}`,
          shares: parseFloat(shares),
          costPrice: parseFloat(costPrice),
          currentPrice: parseFloat(currentPrice) || parseFloat(costPrice),
          buyDate,
        };
      } else if (holdingType === HoldingType.GOLD) {
        data = {
          holdingType: HoldingType.GOLD,
          accountId,
          fundName: fundName.trim(),
          shares: shares.trim() === '' ? 0 : parseFloat(shares),
          marketValue: parseFloat(marketValue),
          dailyProfit: dailyProfit.trim() === '' ? undefined : parseFloat(dailyProfit),
          holdingProfit: holdingProfit.trim() === '' ? undefined : parseFloat(holdingProfit),
          currentPrice: currentPrice.trim() === '' ? 0 : parseFloat(currentPrice),
          buyDate,
        };
      } else if (holdingType === HoldingType.CASH) {
        data = {
          holdingType: HoldingType.CASH,
          accountId,
          fundName: fundName.trim(),
          marketValue: parseFloat(marketValue),
          dailyProfit: dailyProfit.trim() === '' ? undefined : parseFloat(dailyProfit),
          buyDate,
        };
      } else {
        data = {
          holdingType: HoldingType.WEALTH,
          accountId,
          fundName: fundName.trim(),
          institution: institution.trim() || undefined,
          marketValue: parseFloat(marketValue),
          dailyProfit: dailyProfit.trim() === '' ? undefined : parseFloat(dailyProfit),
          holdingProfit: holdingProfit.trim() === '' ? undefined : parseFloat(holdingProfit),
          buyDate,
        };
      }
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Investment form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{investment ? '编辑持仓' : '添加持仓'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* FORM_FIELDS_PLACEHOLDER */}
          <ToggleButtonGroup
            value={holdingType}
            exclusive
            fullWidth
            size="small"
            onChange={(_, val) => {
              if (val && !investment) setHoldingType(val as HoldingType);
            }}
            disabled={Boolean(investment)}
          >
            <ToggleButton value={HoldingType.FUND}>基金</ToggleButton>
            <ToggleButton value={HoldingType.WEALTH}>理财</ToggleButton>
            <ToggleButton value={HoldingType.CASH}>活期</ToggleButton>
            <ToggleButton value={HoldingType.GOLD}>黄金</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            select
            label="归属账户"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.icon} {acc.name}
              </MenuItem>
            ))}
          </TextField>

          {isFund ? (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="基金代码"
                  value={fundCode}
                  onChange={(e) => setFundCode(e.target.value)}
                  placeholder="如：161725"
                  required
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => handleFetchFund()}
                  disabled={fetchingFund || !fundCode.trim()}
                  sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                >
                  {fetchingFund ? <CircularProgress size={20} /> : '查询'}
                </Button>
              </Box>
              <TextField
                label="基金名称"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="如：招商中证白酒指数"
              />
              <TextField
                label="持有份额"
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="如：1000"
                required
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="成本价"
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="如：1.2345"
                required
                InputProps={{ inputProps: { step: '0.0001' } }}
              />
              <TextField
                label="当前净值"
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="如：1.3456"
                InputProps={{ inputProps: { step: '0.0001' } }}
                helperText="留空则使用成本价"
              />
              <TextField
                label="买入日期"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          ) : holdingType === HoldingType.GOLD ? (
            <>
              <TextField
                label="产品名称"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="如：招银黄金积存金"
                required
              />
              <TextField
                label="克重 (g)"
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="如：10.5"
                InputProps={{ inputProps: { step: '0.0001' } }}
                helperText="持仓金额以您填写的市值为准"
              />
              <TextField
                label="持有市值"
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="如：5200"
                required
                InputProps={{ inputProps: { step: '0.01' } }}
                helperText="单位：元（万元请自行换算）"
              />
              <TextField
                label="当日收益"
                type="number"
                value={dailyProfit}
                onChange={(e) => setDailyProfit(e.target.value)}
                placeholder="正为盈，负为亏，可留空"
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="持有收益"
                type="number"
                value={holdingProfit}
                onChange={(e) => setHoldingProfit(e.target.value)}
                placeholder="正为盈，负为亏，可留空"
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="金价参考 (元/克，可选)"
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="如：550"
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="持有起始日"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          ) : holdingType === HoldingType.CASH ? (
            <>
              <TextField
                label="产品名称"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="如：余额宝 / 零钱通"
                required
              />
              <TextField
                label="持有市值"
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="如：1295.23"
                required
                InputProps={{ inputProps: { step: '0.01' } }}
                helperText="单位：元（活期 / 余额类资产金额）"
              />
              <TextField
                label="持有起始日"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          ) : (
            <>
              <TextField
                label="产品名称"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="如：慧盈象固收增利"
                required
              />
              <TextField
                label="发行机构"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="如：信银理财"
              />
              <TextField
                label="持有市值"
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="如：30200"
                required
                InputProps={{ inputProps: { step: '0.01' } }}
                helperText="单位：元（万元请自行换算）"
              />
              <TextField
                label="当日收益"
                type="number"
                value={dailyProfit}
                onChange={(e) => setDailyProfit(e.target.value)}
                placeholder="正为盈，负为亏，可留空"
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="持有收益"
                type="number"
                value={holdingProfit}
                onChange={(e) => setHoldingProfit(e.target.value)}
                placeholder="正为盈，负为亏，可留空"
                InputProps={{ inputProps: { step: '0.01' } }}
              />
              <TextField
                label="持有起始日"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" fullWidth disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={submitting || !canSubmit}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvestmentForm;

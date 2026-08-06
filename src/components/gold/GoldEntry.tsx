import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useInvestment } from '../../hooks/useInvestment';
import { useAccountStore } from '../../store/useAccountStore';
import { HoldingType } from '../../types';
import type { CreateInvestmentDTO } from '../../types';
import GoldOcrButton from './GoldOcrButton';

/**
 * GoldEntry — 招行黄金持仓录入弹层
 * 上传/拍照 → OCR 预填（可逐项手改）→ 选账户 + 产品名 + 克重/市值/收益/金价 → 保存 GOLD。
 * 对齐 DcaSmartEntry 交互；GOLD 以 shares=克重、currentPrice=金价参考 落库。
 */
interface GoldEntryProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const GoldEntry: React.FC<GoldEntryProps> = ({ open, onClose, onSaved }) => {
  const { createInvestment } = useInvestment();
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  const [accountId, setAccountId] = useState('');
  const [fundName, setFundName] = useState('');
  const [grams, setGrams] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [holdingProfit, setHoldingProfit] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [cumulativeProfit, setCumulativeProfit] = useState('');
  const [goldPriceRef, setGoldPriceRef] = useState('');
  const [ocrMatched, setOcrMatched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (open) {
      setAccountId('');
      setFundName('');
      setGrams('');
      setMarketValue('');
      setHoldingProfit('');
      setCostPrice('');
      setCumulativeProfit('');
      setGoldPriceRef('');
      setOcrMatched(false);
      setError(null);
    }
  }, [open]);

  const handleOcr = (prefill: Partial<CreateInvestmentDTO>, matched: boolean) => {
    setOcrMatched(matched);
    if (prefill.fundName) setFundName(prefill.fundName);
    if (prefill.shares !== undefined) setGrams(String(prefill.shares));
    if (prefill.marketValue !== undefined) setMarketValue(String(prefill.marketValue));
    if (prefill.holdingProfit !== undefined) setHoldingProfit(String(prefill.holdingProfit));
    if (prefill.costPrice !== undefined) setCostPrice(String(prefill.costPrice));
    if (prefill.cumulativeProfit !== undefined) setCumulativeProfit(String(prefill.cumulativeProfit));
    if (prefill.currentPrice !== undefined) setGoldPriceRef(String(prefill.currentPrice));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!accountId) {
        setError('请选择归属账户');
        setSaving(false);
        return;
      }
      if (!fundName.trim()) {
        setError('请填写产品名称');
        setSaving(false);
        return;
      }
      const dto: CreateInvestmentDTO = {
        holdingType: HoldingType.GOLD,
        accountId,
        fundName: fundName.trim(),
        shares: grams ? Number(grams) : 0,
        marketValue: marketValue ? Number(marketValue) : 0,
        holdingProfit: holdingProfit ? Number(holdingProfit) : 0,
        costPrice: costPrice ? Number(costPrice) : 0,
        cumulativeProfit: cumulativeProfit ? Number(cumulativeProfit) : undefined,
        currentPrice: goldPriceRef ? Number(goldPriceRef) : 0,
      };
      await createInvestment(dto);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>录入黄金持仓</DialogTitle>
      <DialogContent>
        <GoldOcrButton onResult={handleOcr} />

        {ocrMatched && (
          <Alert severity="info" sx={{ mt: 2 }}>
            已识别以下字段（可逐项修改）：
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {grams && <li>克重：{grams} g</li>}
              {marketValue && <li>市值：¥{marketValue}</li>}
              {goldPriceRef && <li>金价参考：¥{goldPriceRef}/g</li>}
            </Box>
          </Alert>
        )}

        <FormControl fullWidth size="small" sx={{ mt: 2, mb: 1 }}>
          <InputLabel id="gold-account-label">归属账户</InputLabel>
          <Select
            labelId="gold-account-label"
            label="归属账户"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.icon} {acc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="产品名称（如 招银黄金积存金）"
          size="small"
          value={fundName}
          onChange={(e) => setFundName(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
        />
        <TextField label="克重 (g)" type="number" size="small" value={grams} onChange={(e) => setGrams(e.target.value)} fullWidth sx={{ mb: 1 }} />
        <TextField
          label="市值 (元)"
          type="number"
          size="small"
          value={marketValue}
          onChange={(e) => setMarketValue(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          helperText="持仓金额以您填写的市值为准，金价仅作展示参考"
        />
        <TextField label="持有收益 (元)" type="number" size="small" value={holdingProfit} onChange={(e) => setHoldingProfit(e.target.value)} fullWidth sx={{ mb: 1 }} />
        <TextField
          label="累计收益 (元)"
          type="number"
          size="small"
          value={cumulativeProfit}
          onChange={(e) => setCumulativeProfit(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          placeholder="可留空"
          InputProps={{ inputProps: { step: '0.01' } }}
        />
        <TextField
          label="成本均价 (元/克)"
          type="number"
          size="small"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          placeholder="如：450.00"
          required
          InputProps={{ inputProps: { step: '0.01' } }}
          helperText="用于金价同步时自动重算持有收益"
        />
        <TextField label="金价参考 (元/克，可选)" type="number" size="small" value={goldPriceRef} onChange={(e) => setGoldPriceRef(e.target.value)} fullWidth sx={{ mb: 1 }} />

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoldEntry;

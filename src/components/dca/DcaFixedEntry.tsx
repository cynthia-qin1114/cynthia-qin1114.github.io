import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Alert from '@mui/material/Alert';
import { format } from 'date-fns';

import { useDcaStore } from '../../store/useDcaStore';
import { useAccountStore } from '../../store/useAccountStore';
import { useInvestmentStore } from '../../store/useInvestmentStore';
import { DcaPlanType, DcaFrequency, DcaDeductionMode, HoldingType } from '../../types';
import type { DcaPlan, CreateDcaPlanDTO } from '../../types';
import { DcaFrequencyLabels } from '../../config/constants';

interface DcaFixedEntryProps {
  /** 编辑模式：传入既有计划则预填并走 updatePlan */
  initialPlan?: DcaPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * DcaFixedEntry — 定额定投录入页
 * 选标的（下拉既有 FUND 持仓 → 取 id 绑 targetInvestmentId；或手填 fundCode+name 建档后绑 id）
 * → 填 amount(>0) → 频度单选（每天/每周/每月）→ 首扣日 → 保存 type=FIXED。
 */
const DcaFixedEntry: React.FC<DcaFixedEntryProps> = ({ initialPlan, onClose, onSaved }) => {
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const investments = useInvestmentStore((s) => s.investments);
  const fetchInvestments = useInvestmentStore((s) => s.fetchInvestments);
  const createPlan = useDcaStore((s) => s.createPlan);
  const updatePlan = useDcaStore((s) => s.updatePlan);

  const funds = investments.filter((inv) => inv.holdingType === HoldingType.FUND);

  const [accountId, setAccountId] = useState('');
  const [targetMode, setTargetMode] = useState<'existing' | 'manual'>('existing');
  const [selectedFundId, setSelectedFundId] = useState('');
  const [manualFundCode, setManualFundCode] = useState('');
  const [manualFundName, setManualFundName] = useState('');

  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<DcaFrequency>(DcaFrequency.MONTHLY);
  const [nextDeductionDate, setNextDeductionDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAccounts();
    void fetchInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialPlan) {
      setNextDeductionDate(format(new Date(), 'yyyy-MM-dd'));
      return;
    }
    setAccountId(initialPlan.accountId);
    setAmount(String(initialPlan.amount));
    setFrequency(initialPlan.frequency);
    setNextDeductionDate(initialPlan.nextDeductionDate);
    const hit = funds.find((f) => f.id === initialPlan.targetInvestmentId);
    if (hit) {
      setTargetMode('existing');
      setSelectedFundId(hit.id);
    } else {
      setTargetMode('manual');
      setManualFundCode(initialPlan.fundCode);
      setManualFundName(initialPlan.fundName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlan]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const amountNum = Number(amount);
      if (!amountNum || amountNum <= 0) {
        setError('请输入有效的每期扣款金额（需大于 0）');
        setSaving(false);
        return;
      }
      if (!frequency) {
        setError('请选择扣款频率');
        setSaving(false);
        return;
      }
      if (!nextDeductionDate) {
        setError('请选择首扣日');
        setSaving(false);
        return;
      }

      let resolvedAccountId = accountId;
      let targetInvestmentId = '';
      let fundCode = '';
      let fundName = '';

      if (targetMode === 'existing') {
        const inv = funds.find((f) => f.id === selectedFundId);
        if (!inv) {
          setError('请选择目标基金持仓');
          setSaving(false);
          return;
        }
        targetInvestmentId = inv.id;
        fundCode = inv.fundCode;
        fundName = inv.fundName;
        resolvedAccountId = inv.accountId;
      } else {
        fundName = manualFundName.trim();
        fundCode = manualFundCode.trim();
        if (!fundName) {
          setError('请填写基金名称');
          setSaving(false);
          return;
        }
        if (!resolvedAccountId) {
          setError('请选择扣款账户');
          setSaving(false);
          return;
        }
      }

      const dto: CreateDcaPlanDTO = {
        type: DcaPlanType.FIXED,
        accountId: resolvedAccountId,
        targetInvestmentId,
        fundCode,
        fundName,
        amount: amountNum,
        frequency,
        nextDeductionDate,
        enabled: true,
        deductionMode: DcaDeductionMode.AUTO,
      };

      if (initialPlan) {
        await updatePlan(initialPlan.id, dto);
      } else {
        await createPlan(dto);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {initialPlan ? '编辑定额定投' : '新建定额定投'}
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel id="dca-fixed-account-label">扣款账户</InputLabel>
        <Select
          labelId="dca-fixed-account-label"
          label="扣款账户"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={targetMode === 'existing' && Boolean(selectedFundId)}
        >
          {accounts.map((acc) => (
            <MenuItem key={acc.id} value={acc.id}>
              {acc.icon} {acc.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel id="dca-fixed-target-label">目标基金</InputLabel>
        <Select
          labelId="dca-fixed-target-label"
          label="目标基金"
          value={targetMode === 'existing' ? selectedFundId : '__manual__'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__manual__') {
              setTargetMode('manual');
            } else {
              setTargetMode('existing');
              setSelectedFundId(v);
              const inv = funds.find((f) => f.id === v);
              if (inv) setAccountId(inv.accountId);
            }
          }}
        >
          {funds.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.fundName}（{f.fundCode || '—'}）
            </MenuItem>
          ))}
          <MenuItem value="__manual__">＋ 手填新建基金</MenuItem>
        </Select>
      </FormControl>

      {targetMode === 'manual' && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="基金代码"
            size="small"
            value={manualFundCode}
            onChange={(e) => setManualFundCode(e.target.value)}
            fullWidth
          />
          <TextField
            label="基金名称"
            size="small"
            value={manualFundName}
            onChange={(e) => setManualFundName(e.target.value)}
            fullWidth
          />
        </Box>
      )}

      <TextField
        label="每期扣款金额（元）"
        type="number"
        size="small"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        error={Boolean(amount) && Number(amount) <= 0}
      />

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          扣款频率
        </Typography>
        <RadioGroup
          row
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
        >
          {Object.values(DcaFrequency).map((f) => (
            <FormControlLabel key={f} value={f} control={<Radio size="small" />} label={DcaFrequencyLabels[f]} />
          ))}
        </RadioGroup>
      </FormControl>

      <TextField
        label="首扣日"
        type="date"
        size="small"
        value={nextDeductionDate}
        onChange={(e) => setNextDeductionDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button variant="outlined" onClick={onClose} fullWidth disabled={saving}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSave} fullWidth disabled={saving}>
          {saving ? '保存中...' : '保存计划'}
        </Button>
      </Box>
    </Box>
  );
};

export default DcaFixedEntry;

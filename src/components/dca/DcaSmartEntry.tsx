import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { format } from 'date-fns';

import DcaOcrButton from './DcaOcrButton';
import DeductionRuleCard from './DeductionRuleCard';
import { useDcaStore } from '../../store/useDcaStore';
import { useAccountStore } from '../../store/useAccountStore';
import { useInvestmentStore } from '../../store/useInvestmentStore';
import { DcaPlanType, DcaFrequency, DcaDeductionMode, HoldingType } from '../../types';
import type { DcaPlan, CreateDcaPlanDTO } from '../../types';
import { DcaFrequencyLabels } from '../../config/constants';
import { formatCurrency } from '../../utils/format';

interface DcaSmartEntryProps {
  /** 编辑模式：传入既有计划则预填并走 updatePlan */
  initialPlan?: DcaPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_RULE = '对标均线动态扣款（规则见下方，本期固定按基准金额）';

/**
 * DcaSmartEntry — 聪明定投录入页
 * 上传/拍照 → OCR 预填（展示「识别值」并逐项可改）→ 选账户 + 标的
 * （下拉 FUND 或手填 code+name，手填时建档并绑 targetInvestmentId）
 * → P1-1 规则卡 → 保存 type=SMART。
 */
const DcaSmartEntry: React.FC<DcaSmartEntryProps> = ({ initialPlan, onClose, onSaved }) => {
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
  const [frequency, setFrequency] = useState<DcaFrequency | ''>('');
  const [nextDeductionDate, setNextDeductionDate] = useState('');
  const [benchmarkIndex, setBenchmarkIndex] = useState('');
  const [benchmarkMa, setBenchmarkMa] = useState('');
  const [investedPeriods, setInvestedPeriods] = useState('');

  const [ocrPrefill, setOcrPrefill] = useState<Partial<CreateDcaPlanDTO> | null>(null);
  const [ocrMatched, setOcrMatched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 挂载拉取账户 / 持仓；编辑模式预填
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
    setBenchmarkIndex(initialPlan.benchmarkIndex ?? '');
    setBenchmarkMa(initialPlan.benchmarkMa ?? '');
    setInvestedPeriods(initialPlan.investedPeriods ? String(initialPlan.investedPeriods) : '');
    // 目标持仓若命中现有 FUND，则走「下拉选择」模式
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

  const handleOcrResult = (prefill: Partial<CreateDcaPlanDTO>, matched: boolean) => {
    setOcrPrefill(prefill);
    setOcrMatched(matched);
    if (prefill.amount !== undefined) setAmount(String(prefill.amount));
    if (prefill.frequency !== undefined) setFrequency(prefill.frequency);
    if (prefill.nextDeductionDate) setNextDeductionDate(prefill.nextDeductionDate);
    if (prefill.benchmarkIndex) setBenchmarkIndex(prefill.benchmarkIndex);
    if (prefill.benchmarkMa) setBenchmarkMa(prefill.benchmarkMa);
    if (prefill.investedPeriods !== undefined) setInvestedPeriods(String(prefill.investedPeriods));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const amountNum = Number(amount);
      if (!amountNum || amountNum <= 0) {
        setError('请输入有效的每期扣款金额（基准金额）');
        setSaving(false);
        return;
      }
      if (!frequency) {
        setError('请选择扣款频率');
        setSaving(false);
        return;
      }
      if (!nextDeductionDate) {
        setError('请选择下一扣款日');
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
        // 手填时 targetInvestmentId 留空，由 dcaService.savePlan 解析建档
      }

      const dto: CreateDcaPlanDTO = {
        type: DcaPlanType.SMART,
        accountId: resolvedAccountId,
        targetInvestmentId,
        fundCode,
        fundName,
        amount: amountNum,
        frequency,
        nextDeductionDate,
        enabled: true,
        deductionMode: DcaDeductionMode.AUTO,
        benchmarkIndex: benchmarkIndex.trim() || undefined,
        benchmarkMa: benchmarkMa.trim() || undefined,
        investedPeriods: investedPeriods ? Number(investedPeriods) : 0,
        deductionRule: DEFAULT_RULE,
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
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {initialPlan ? '编辑聪明定投' : '新建聪明定投'}
      </Typography>

      <DcaOcrButton onResult={handleOcrResult} />

      {ocrPrefill && (
        <Alert severity={ocrMatched ? 'info' : 'warning'} sx={{ mt: 2, mb: 1 }}>
          {ocrMatched ? '已识别以下字段（可逐项修改）：' : '未能识别到关键字段，请手动填写：'}
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {ocrPrefill.amount !== undefined && <li>基准金额：{formatCurrency(ocrPrefill.amount)}</li>}
            {ocrPrefill.frequency && <li>扣款频率：{DcaFrequencyLabels[ocrPrefill.frequency]}</li>}
            {ocrPrefill.nextDeductionDate && <li>下一扣款日：{ocrPrefill.nextDeductionDate}</li>}
            {ocrPrefill.benchmarkIndex && <li>对标指数：{ocrPrefill.benchmarkIndex}</li>}
            {ocrPrefill.benchmarkMa && <li>对标均线：{ocrPrefill.benchmarkMa}</li>}
            {ocrPrefill.investedPeriods !== undefined && <li>已投期数：{ocrPrefill.investedPeriods}</li>}
          </Box>
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 账户 */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel id="dca-smart-account-label">扣款账户</InputLabel>
        <Select
          labelId="dca-smart-account-label"
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

      {/* 目标基金：下拉 或 手填 */}
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel id="dca-smart-target-label">目标基金</InputLabel>
        <Select
          labelId="dca-smart-target-label"
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
        label="每期扣款金额（基准金额，元）"
        type="number"
        size="small"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        error={Boolean(amount) && Number(amount) <= 0}
      />

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel id="dca-smart-freq-label">扣款频率</InputLabel>
        <Select
          labelId="dca-smart-freq-label"
          label="扣款频率"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
        >
          {Object.values(DcaFrequency).map((f) => (
            <MenuItem key={f} value={f}>
              {DcaFrequencyLabels[f]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="下一扣款日"
        type="date"
        size="small"
        value={nextDeductionDate}
        onChange={(e) => setNextDeductionDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="对标指数"
          size="small"
          value={benchmarkIndex}
          onChange={(e) => setBenchmarkIndex(e.target.value)}
          fullWidth
          placeholder="如 沪深300"
        />
        <TextField
          label="对标均线"
          size="small"
          value={benchmarkMa}
          onChange={(e) => setBenchmarkMa(e.target.value)}
          fullWidth
          placeholder="如 250日均线"
        />
      </Box>

      <TextField
        label="已投期数"
        type="number"
        size="small"
        value={investedPeriods}
        onChange={(e) => setInvestedPeriods(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <DeductionRuleCard rule={DEFAULT_RULE} />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
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

export default DcaSmartEntry;

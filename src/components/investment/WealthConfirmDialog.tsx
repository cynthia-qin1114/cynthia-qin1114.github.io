import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { HoldingType } from '../../types';
import type { Account, CreateInvestmentDTO } from '../../types';

/**
 * WealthConfirmDialog — 理财持仓多条解析结果批量确认/修正
 *
 * 展示 OCR 解析出的多条理财，允许用户逐条修正 产品名/机构/市值/当日收益/持有收益，
 * 或删除误识别条目，确认后批量 upsert（同 accountId + 归一化产品名覆盖更新）。
 */
interface WealthConfirmDialogProps {
  open: boolean;
  account: Account | null;
  prefills: Partial<CreateInvestmentDTO>[];
  onClose: () => void;
  onConfirm: (dtos: CreateInvestmentDTO[]) => Promise<void>;
}

/** 单条可编辑行的本地字符串状态 */
interface EditableRow {
  fundName: string;
  institution: string;
  marketValue: string;
  dailyProfit: string;
  holdingProfit: string;
}

/** 将 number 转为输入框字符串（undefined → 空串） */
const numToStr = (v?: number): string => (v === undefined || Number.isNaN(v) ? '' : String(v));

/** 将输入框字符串转为 number（空串 → undefined） */
const strToNum = (s: string): number | undefined => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = parseFloat(t);
  return Number.isNaN(n) ? undefined : n;
};

const WealthConfirmDialog: React.FC<WealthConfirmDialogProps> = ({
  open,
  account,
  prefills,
  onClose,
  onConfirm,
}) => {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(
        prefills.map((p) => ({
          fundName: p.fundName ?? '',
          institution: p.institution ?? '',
          marketValue: numToStr(p.marketValue),
          dailyProfit: numToStr(p.dailyProfit),
          holdingProfit: numToStr(p.holdingProfit),
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefills]);

  const updateRow = (index: number, field: keyof EditableRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!account) return;
    // 过滤掉产品名与市值都为空的无效行
    const valid = rows.filter(
      (r) => r.fundName.trim() !== '' || strToNum(r.marketValue) !== undefined,
    );
    const dtos: CreateInvestmentDTO[] = valid.map((r) => ({
      holdingType: HoldingType.WEALTH,
      accountId: account.id,
      fundName: r.fundName.trim() || '未命名理财',
      institution: r.institution.trim() || undefined,
      marketValue: strToNum(r.marketValue) ?? 0,
      dailyProfit: strToNum(r.dailyProfit),
      holdingProfit: strToNum(r.holdingProfit),
    }));

    setSubmitting(true);
    try {
      await onConfirm(dtos);
      onClose();
    } catch (error) {
      console.error('WealthConfirmDialog confirm error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        确认理财持仓
        {account && <Chip size="small" label={account.name} sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent dividers>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            未识别到理财条目，请返回重试或手动添加。
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              共识别 {rows.length} 条，请核对后确认。金额单位：元。
            </Typography>
            {rows.map((row, index) => (
              <Card key={index} variant="outlined">
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      第 {index + 1} 条
                    </Typography>
                    <IconButton size="small" onClick={() => removeRow(index)}>
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      label="产品名称"
                      size="small"
                      value={row.fundName}
                      onChange={(e) => updateRow(index, 'fundName', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="发行机构"
                      size="small"
                      value={row.institution}
                      onChange={(e) => updateRow(index, 'institution', e.target.value)}
                      placeholder="如：信银理财"
                      fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        label="持有市值"
                        size="small"
                        type="number"
                        value={row.marketValue}
                        onChange={(e) => updateRow(index, 'marketValue', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="当日收益"
                        size="small"
                        type="number"
                        value={row.dailyProfit}
                        onChange={(e) => updateRow(index, 'dailyProfit', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="持有收益"
                        size="small"
                        type="number"
                        value={row.holdingProfit}
                        onChange={(e) => updateRow(index, 'holdingProfit', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" fullWidth disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          fullWidth
          disabled={submitting || rows.length === 0}
        >
          {submitting ? '保存中...' : `确认保存 (${rows.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WealthConfirmDialog;

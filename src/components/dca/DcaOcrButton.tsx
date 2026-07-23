import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ocrService } from '../../services/ocrService';
import { parseDcaOcrText, toDcaPrefill } from '../../services/dcaOcrParser';
import type { CreateDcaPlanDTO } from '../../types';

/**
 * DcaOcrButton — 聪明定投 OCR 识别按钮（对齐 InvestmentOcrButton）
 *
 * 提供「拍照识别」与「截图识别」两个入口，内部自管理 loading / error，
 * 识别成功后经 parseDcaOcrText + toDcaPrefill 解析，通过 onResult 回调传出。
 */
interface DcaOcrButtonProps {
  /** 识别完成回调：prefill（识别到的部分字段）+ matched（是否识别到关键字段） */
  onResult: (prefill: Partial<CreateDcaPlanDTO>, matched: boolean) => void;
}

const DcaOcrButton: React.FC<DcaOcrButtonProps> = ({ onResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 重置，保证同文件可重复选
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const text = await ocrService.recognize(file);
      const parsed = parseDcaOcrText(text);
      const prefill = toDcaPrefill(parsed);

      const matched =
        parsed.amount !== undefined ||
        parsed.frequency !== undefined ||
        Boolean(parsed.nextDeductionDate) ||
        parsed.investedPeriods !== undefined;

      onResult(prefill, matched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR识别失败，请重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <CameraAltIcon />}
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
          fullWidth
        >
          {loading ? '识别中...' : '拍照识别'}
        </Button>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          fullWidth
        >
          {loading ? '识别中...' : '截图识别'}
        </Button>
      </Box>

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default DcaOcrButton;

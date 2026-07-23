import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ocrService } from '../../services/ocrService';
import { parseFundOcrText, toInvestmentPrefill } from '../../services/fundOcrParser';
import type { CreateInvestmentDTO } from '../../types';

/**
 * InvestmentOcrButton — 投资持仓 OCR 识别按钮
 *
 * 参考 transaction/OcrButton，提供"拍照识别持仓"和"截图识别"两个入口。
 * 内部自管理 loading / error 状态（不依赖 useTransaction），
 * 识别成功后调用 ocrService.recognize + fundOcrParser 解析，
 * 通过 onResult 回调把预填数据与是否识别到关键字段传出。
 */
interface InvestmentOcrButtonProps {
  /**
   * 识别完成回调
   * @param prefill  可用于表单预填的部分字段
   * @param matched  是否识别到至少一个关键字段（代码/份额/成本价）
   */
  onResult: (
    prefill: Partial<CreateInvestmentDTO>,
    matched: boolean,
  ) => void;
}

const InvestmentOcrButton: React.FC<InvestmentOcrButtonProps> = ({ onResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 先重置 input，保证同一文件可重复选择
    e.target.value = '';
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const text = await ocrService.recognize(file);
      const parsed = parseFundOcrText(text);
      const prefillNums = toInvestmentPrefill(parsed);

      // 组装部分 CreateInvestmentDTO（仅包含识别到的字段）
      const prefill: Partial<CreateInvestmentDTO> = {};
      if (prefillNums.fundCode) prefill.fundCode = prefillNums.fundCode;
      if (prefillNums.fundName) prefill.fundName = prefillNums.fundName;
      if (prefillNums.shares !== undefined) prefill.shares = prefillNums.shares;
      if (prefillNums.costPrice !== undefined) prefill.costPrice = prefillNums.costPrice;

      const matched =
        Boolean(prefillNums.fundCode) ||
        prefillNums.shares !== undefined ||
        prefillNums.costPrice !== undefined;

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
          {loading ? '识别中...' : '拍照识别持仓'}
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

export default InvestmentOcrButton;

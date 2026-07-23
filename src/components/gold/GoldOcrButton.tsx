import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ocrService } from '../../services/ocrService';
import { parseCmbGoldOcrText, toGoldPrefills } from '../../services/wealthOcrParser';
import { HoldingType } from '../../types';
import type { CreateInvestmentDTO } from '../../types';

/**
 * GoldOcrButton — 招行黄金 OCR 识别按钮（对齐 InvestmentOcrButton / DcaOcrButton）
 * 拍照/截图 → Tesseract 识别 → parseCmbGoldOcrText + toGoldPrefills → onResult 回传。
 */
interface GoldOcrButtonProps {
  onResult: (prefill: Partial<CreateInvestmentDTO>, matched: boolean) => void;
}

const GoldOcrButton: React.FC<GoldOcrButtonProps> = ({ onResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const text = await ocrService.recognize(file);
      const parsed = parseCmbGoldOcrText(text);
      const prefills = toGoldPrefills(parsed, '');
      const first = parsed.items[0];
      const prefill: Partial<CreateInvestmentDTO> =
        prefills[0] ?? { holdingType: HoldingType.GOLD, fundName: '' };
      const matched =
        first?.grams !== undefined ||
        first?.marketValue !== undefined ||
        first?.goldPriceRef !== undefined;
      onResult(prefill, matched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR识别失败，请重试');
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

export default GoldOcrButton;

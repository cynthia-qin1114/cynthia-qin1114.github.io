import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTransaction } from '../../hooks/useTransaction';

/**
 * OcrButton — OCR拍照按钮 + 识别流程
 * 支持拍照和上传图片两种方式
 */
interface OcrButtonProps {
  onResult?: (result: {
    text: string;
    amounts: number[];
    date: string | null;
    classification: { platform: string; category: string } | null;
  }) => void;
}

const OcrButton: React.FC<OcrButtonProps> = ({ onResult }) => {
  const { ocr, ocrLoading, ocrError } = useTransaction();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await ocr(file);
    if (onResult) {
      onResult(result);
    }
    // 重置input以便重复选择同一文件
    e.target.value = '';
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
          startIcon={ocrLoading ? <CircularProgress size={18} /> : <CameraAltIcon />}
          onClick={() => cameraInputRef.current?.click()}
          disabled={ocrLoading}
          fullWidth
        >
          {ocrLoading ? '识别中...' : '拍照记账'}
        </Button>
        <Button
          variant="outlined"
          startIcon={ocrLoading ? <CircularProgress size={18} /> : <UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          fullWidth
        >
          {ocrLoading ? '识别中...' : '图片记账'}
        </Button>
      </Box>

      {ocrError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {ocrError}
        </Typography>
      )}
    </Box>
  );
};

export default OcrButton;

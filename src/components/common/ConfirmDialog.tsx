import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/**
 * ConfirmDialog — 确认对话框组件
 */
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ padding: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" fullWidth>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          fullWidth
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * 使用确认对话框的Hook
 */
export const useConfirmDialog = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<{
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  const confirm = (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
  }) => {
    setConfig(options);
    setOpen(true);
  };

  const handleConfirm = () => {
    config?.onConfirm();
    setOpen(false);
    setConfig(null);
  };

  const handleCancel = () => {
    setOpen(false);
    setConfig(null);
  };

  const dialog = (
    <ConfirmDialog
      open={open}
      title={config?.title}
      message={config?.message ?? ''}
      confirmText={config?.confirmText}
      cancelText={config?.cancelText}
      confirmColor={config?.confirmColor}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
};

export default ConfirmDialog;

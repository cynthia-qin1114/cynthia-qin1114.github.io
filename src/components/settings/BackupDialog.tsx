/**
 * BackupDialog.tsx — 本地加密备份 / 恢复对话框
 *
 * 受 `mode` 控制两种模式：
 * - backup：两个密码输入框（密码 / 确认密码），校验一致且非空后调用 downloadEncryptedBackup。
 * - restore：文件选择器 + 密码输入框，调用 restoreEncryptedBackup。
 *
 * 错误处理：密码错误 / 文件损坏时在 Dialog 内显示红色提示，不崩溃。
 * 完成后 onClose()，并可选 onDone(message) 回调提示成功。
 */

import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { downloadEncryptedBackup, restoreEncryptedBackup } from '../../services/backupService';

/** 对话框模式 */
export type BackupMode = 'backup' | 'restore';

/** 组件属性 */
interface BackupDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 当前模式 */
  mode: BackupMode;
  /** 关闭回调 */
  onClose: () => void;
  /** 成功回调（可选） */
  onDone?: (message: string) => void;
}

/**
 * BackupDialog — 加密备份 / 恢复对话框
 */
const BackupDialog: React.FC<BackupDialogProps> = ({ open, mode, onClose, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // 每次打开或切换模式时重置表单
  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setFile(null);
      setError('');
      setProcessing(false);
    }
  }, [open, mode]);

  const handleClose = () => {
    if (processing) return; // 处理中不允许关闭
    onClose();
  };

  const handleBackup = async () => {
    if (!password) {
      setError('请输入加密密码');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      await downloadEncryptedBackup(password);
      onDone?.('加密备份已生成并下载到本机');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '备份失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!file) {
      setError('请选择备份文件');
      return;
    }
    if (!password) {
      setError('请输入解密密码');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      await restoreEncryptedBackup(file, password);
      onDone?.('数据已成功恢复');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '恢复失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {mode === 'backup' ? '加密备份数据' : '恢复备份数据'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          {mode === 'restore' && (
            <Alert severity="warning">
              恢复将<strong>覆盖</strong>当前全部数据，且不可撤销。请确保已选择正确的备份文件与正确密码。
            </Alert>
          )}
          {mode === 'backup' && (
            <Typography variant="body2" color="text.secondary">
              备份文件将使用密码（AES-256-GCM）加密后下载到本机，数据不会上传到任何服务器。
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </Alert>
          )}

          {mode === 'restore' && (
            <Button variant="outlined" component="label" fullWidth>
              选择备份文件 (.sfe)
              <input
                type="file"
                accept=".sfe,application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setError('');
                }}
              />
            </Button>
          )}
          {mode === 'restore' && file && (
            <Typography variant="caption" color="text.secondary">
              已选择：{file.name}
            </Typography>
          )}

          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            autoComplete="new-password"
          />
          {mode === 'backup' && (
            <TextField
              label="确认密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              autoComplete="new-password"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" fullWidth disabled={processing}>
          取消
        </Button>
        <Button
          onClick={mode === 'backup' ? handleBackup : handleRestore}
          variant="contained"
          fullWidth
          disabled={processing}
        >
          {processing ? '处理中…' : mode === 'backup' ? '加密备份' : '恢复'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BackupDialog;

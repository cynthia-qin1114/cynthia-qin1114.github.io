import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * EmptyState — 空状态组件
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无数据',
  description = '',
  action,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        gap: 1.5,
        minHeight: 240,
      }}
    >
      <Box sx={{ fontSize: 48, opacity: 0.3 }}>
        {icon ?? '📭'}
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 280 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
};

export default EmptyState;

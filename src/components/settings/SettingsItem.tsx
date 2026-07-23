import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import { SxProps, Theme } from '@mui/material/styles';

/**
 * SettingsItem — 设置项组件
 */
interface SettingsItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  sx?: SxProps<Theme>;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onClick,
  rightElement,
  sx,
}) => {
  return (
    <ListItem
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        py: 1.5,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': onClick ? { backgroundColor: 'rgba(0,0,0,0.02)' } : {},
        ...sx,
      }}
    >
      {icon && (
        <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
          {icon}
        </ListItemIcon>
      )}
      <ListItemText
        primary={title}
        secondary={subtitle}
        primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }}
        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
      />
      {rightElement && (
        <Box sx={{ ml: 1 }}>
          {rightElement}
        </Box>
      )}
    </ListItem>
  );
};

export default SettingsItem;

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { ROUTES } from '../../config/constants';

/**
 * BottomNav — 底部5Tab导航
 * 概览 | 记账 | 投资 | 报表 | 设置
 */
const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentValue = (): number => {
    const path = location.pathname;
    if (path === ROUTES.OVERVIEW) return 0;
    if (path === ROUTES.RECORD) return 1;
    if (path === ROUTES.INVEST) return 2;
    if (path === ROUTES.REPORT) return 3;
    if (path === ROUTES.SETTINGS) return 4;
    return 0;
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: number): void => {
    const routes = [ROUTES.OVERVIEW, ROUTES.RECORD, ROUTES.INVEST, ROUTES.REPORT, ROUTES.SETTINGS];
    navigate(routes[newValue]);
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        zIndex: 1100,
        elevation: 3,
      }}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels
        sx={{
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
          },
          '& .MuiBottomNavigationAction-root': {
            color: 'rgba(33,31,26,0.45)',
            position: 'relative',
            transition: 'color 0.2s ease, transform 0.2s ease',
          },
          '& .Mui-selected': {
            color: '#9C6B2E',
          },
          '& .Mui-selected .MuiBottomNavigationAction-label': {
            color: '#9C6B2E',
            fontWeight: 700,
          },
          '& .Mui-selected .MuiSvgIcon-root': {
            transform: 'scale(1.15)',
            transition: 'transform 0.2s ease',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected::after': {
            content: '""',
            position: 'absolute',
            top: 7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 22,
            height: 3,
            borderRadius: 2,
            background: '#9C6B2E',
            boxShadow: 'none',
          },
        }}
      >
        <BottomNavigationAction label="概览" icon={<HomeIcon />} />
        <BottomNavigationAction label="记账" icon={<EditNoteIcon />} />
        <BottomNavigationAction label="投资" icon={<TrendingUpIcon />} />
        <BottomNavigationAction label="报表" icon={<BarChartIcon />} />
        <BottomNavigationAction label="设置" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import BottomNav from './BottomNav';

/**
 * Layout — 主布局容器
 * 移动端居中，最大宽度430px，顶部毛玻璃框架栏，底部固定导航
 */
const TITLE_MAP: Record<string, string> = {
  '/': '资产概览',
  '/record': '记一笔',
  '/invest': '投资理财',
  '/invest/dca': '定投计划',
  '/report': '数据报表',
  '/settings': '设置',
};

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const title = TITLE_MAP[location.pathname] ?? '智能记账';

  return (
    <div className="app-container">
      <header className="app-header">
        <Box className="app-header__brand">
          <span className="app-header__dot" />
          <Typography className="app-header__title" component="span">
            智能记账
          </Typography>
        </Box>
        <Box className="app-header__status">
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#B8894A',
              boxShadow: '0 0 0 3px rgba(184,137,74,0.18)',
            }}
          />
          <Typography component="span" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {title}
          </Typography>
        </Box>
      </header>
      <div className="page-content fade-in">
        {children ?? <Outlet />}
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;

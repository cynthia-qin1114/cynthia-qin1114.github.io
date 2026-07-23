import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

/**
 * Layout — 主布局容器
 * 移动端居中，最大宽度430px，底部固定导航
 */
const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-container">
      <div className="page-content fade-in">
        {children ?? <Outlet />}
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;

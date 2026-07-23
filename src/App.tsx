import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Layout from './components/common/Layout';
import OverviewPage from './pages/OverviewPage';
import RecordPage from './pages/RecordPage';
import InvestPage from './pages/InvestPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import DcaOverviewPage from './pages/DcaOverviewPage';
import { useDcaScheduler } from './hooks/useDcaScheduler';
import { useInvestment } from './hooks/useInvestment';
import { useGoldPriceScheduler } from './hooks/useGoldPriceScheduler';
import { useDcaStore } from './store/useDcaStore';
import { formatCurrency } from './utils/format';

/**
 * ErrorBoundary — 捕获子组件渲染错误，展示降级UI
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error | null } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', marginTop: 60 }}>
          <h2>应用出现错误</h2>
          <p style={{ color: '#757575', marginTop: 8 }}>{this.state.error?.message ?? '未知错误'}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#1976D2',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * DcaScheduler — 顶层挂载的定投调度 + 提醒组件
 * 运行 useDcaScheduler（APP 启动 / 切回前台触发扣款），并依据
 * useDcaStore.lastDeductions 渲染「X 基金 定投 ¥amount 已记录」提醒 Snackbar。
 */
const DcaScheduler: React.FC = () => {
  useDcaScheduler();
  const lastDeductions = useDcaStore((state) => state.lastDeductions);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    if (lastDeductions.length > 0) {
      const msg = lastDeductions
        .map((d) => `${d.fundName} 基金 定投 ${formatCurrency(d.amount)} 已记录`)
        .join('；');
      setSnack(msg);
    }
  }, [lastDeductions]);

  return (
    <Snackbar
      open={Boolean(snack)}
      autoHideDuration={4000}
      onClose={() => setSnack(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="success" variant="filled" onClose={() => setSnack(null)} sx={{ width: '100%' }}>
        {snack}
      </Alert>
    </Snackbar>
  );
};

/**
 * GoldPriceScheduler — 顶层挂载的金价同步组件
 * 运行 useGoldPriceScheduler（APP 启动 / 切回前台刷新金价并同步 GOLD 持仓），
 * 同步完成后刷新投资 store 以更新 UI。
 */
const GoldPriceScheduler: React.FC = () => {
  const { fetchInvestments } = useInvestment();
  useGoldPriceScheduler(fetchInvestments);
  return null;
};

/**
 * App 根组件
 * 包含路由配置和全局Provider集成
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/invest" element={<InvestPage />} />
          <Route path="/invest/dca" element={<DcaOverviewPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <DcaScheduler />
        <GoldPriceScheduler />
      </Layout>
    </ErrorBoundary>
  );
};

export default App;

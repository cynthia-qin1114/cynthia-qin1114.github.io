import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import theme from './config/theme';
import { initializeDefaultData } from './db/database';
import './styles/index.css';

/** PWA Service Worker 注册 */
const registerSW = async (): Promise<void> => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const { registerSW: registerViteSW } = await import('virtual:pwa-register');
      registerViteSW({
        onRegistered(registration: ServiceWorkerRegistration | undefined) {
          if (registration) {
            console.log('PWA Service Worker registered:', registration.scope);
          }
        },
        onRegisterError(error: unknown) {
          console.error('PWA Service Worker registration failed:', error);
        },
      });
    } catch (error) {
      console.error('Failed to load PWA register:', error);
    }
  }
};

const root = ReactDOM.createRoot(document.getElementById('root')!);

/**
 * 初始化默认数据（分类/账户/平台规则），完成后再渲染应用。
 * 幂等：仅在对应表为空时写入，不影响老用户已有数据。
 */
const bootstrap = async (): Promise<void> => {
  try {
    await initializeDefaultData();
  } catch (error) {
    console.error('initializeDefaultData failed:', error);
  }

  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );

  // 注册 Service Worker
  registerSW();
};

bootstrap();

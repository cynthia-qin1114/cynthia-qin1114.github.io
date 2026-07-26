import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          light: '#60A5FA',
          dark: '#1D4ED8',
        },
        income: '#4CAF50',
        expense: '#F44336',
        invest: '#FF9800',
        surface: '#FFFFFF',
        background: '#F8FAFC',
      },
      maxWidth: {
        mobile: '430px',
      },
      spacing: {
        'bottom-nav': '56px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

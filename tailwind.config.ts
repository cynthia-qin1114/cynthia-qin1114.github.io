import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          light: '#42A5F5',
          dark: '#0D47A1',
        },
        income: '#4CAF50',
        expense: '#F44336',
        invest: '#FF9800',
        surface: '#FFFFFF',
        background: '#F5F5F5',
      },
      maxWidth: {
        mobile: '430px',
      },
      spacing: {
        'bottom-nav': '56px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

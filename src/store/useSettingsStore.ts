import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CORS_PROXY } from '../config/constants';
import { GoldPriceSource, GoldRecalcStrategy } from '../types';

/**
 * useSettingsStore — 设置 Zustand Store
 * 持久化存储用户设置（CORS代理、默认货币、OCR语言、金价偏好）
 */
interface SettingsStore {
  corsProxy: string;
  defaultCurrency: string;
  ocrLanguage: string;
  goldPriceSource: GoldPriceSource;
  goldRecalcStrategy: GoldRecalcStrategy;
  setCorsProxy: (url: string) => void;
  setDefaultCurrency: (currency: string) => void;
  setOcrLanguage: (lang: string) => void;
  setGoldPriceSource: (s: GoldPriceSource) => void;
  setGoldRecalcStrategy: (s: GoldRecalcStrategy) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      corsProxy: DEFAULT_CORS_PROXY,
      defaultCurrency: 'CNY',
      ocrLanguage: 'chi_sim+eng',
      goldPriceSource: GoldPriceSource.AUTO_ETF,
      goldRecalcStrategy: GoldRecalcStrategy.REFERENCE_ONLY,

      setCorsProxy: (url: string) => set({ corsProxy: url }),
      setDefaultCurrency: (currency: string) => set({ defaultCurrency: currency }),
      setOcrLanguage: (lang: string) => set({ ocrLanguage: lang }),
      setGoldPriceSource: (s: GoldPriceSource) => set({ goldPriceSource: s }),
      setGoldRecalcStrategy: (s: GoldRecalcStrategy) => set({ goldRecalcStrategy: s }),
    }),
    {
      name: 'smart-finance-settings',
    }
  )
);

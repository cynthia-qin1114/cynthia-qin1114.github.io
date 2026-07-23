import { fundApiService } from './fundApiService';
import {
  GOLD_GOLD_CODE,
  GOLD_ETF_TO_GRAM_FACTOR,
  GOLD_PRICE_TTL,
  GOLD_PRICE_CACHE_KEY,
} from '../config/constants';
import type { GoldPrice } from '../types';
import { now } from '../utils/id';

const SOURCE_LABEL = '黄金ETF净值(518880)';

/**
 * GoldPriceService — 近似实时金价获取
 *
 * 默认方案 A：复用 fundApiService（corsProxy + 天天基金）查黄金 ETF(518880)
 * 估算净值，换算 元/克 = ETF净值 × GOLD_ETF_TO_GRAM_FACTOR（近似，1 份≈0.01g）。
 * 缓存：localStorage（TTL 5min，对齐 corsProxy）+ 内存缓存；失败时降级返回旧缓存。
 *
 * ⚠️ 近似实时：ETF 净值与 Au99.99 有微小偏差，UI 须标注「近似」。
 * P1 预留方案 B（外部金价 API），届时读取 useSettingsStore.goldPriceSource 切换源。
 */
class GoldPriceService {
  private memoryCache: GoldPrice | null = null;

  async getGoldPrice(forceRefresh = false): Promise<GoldPrice | null> {
    const cached = this.readCache();
    if (!forceRefresh && cached && Date.now() - new Date(cached.updatedAt).getTime() < GOLD_PRICE_TTL) {
      return cached;
    }
    try {
      const nav = await fundApiService.getCurrentPrice(GOLD_GOLD_CODE);
      if (nav && nav > 0) {
        const price = nav * GOLD_ETF_TO_GRAM_FACTOR;
        const result: GoldPrice = { price, source: SOURCE_LABEL, updatedAt: now() };
        this.writeCache(result);
        return result;
      }
    } catch (e) {
      console.warn('GoldPrice: fetch failed, fallback cache', e);
    }
    return cached;
  }

  private readCache(): GoldPrice | null {
    if (this.memoryCache) return this.memoryCache;
    try {
      const raw = localStorage.getItem(GOLD_PRICE_CACHE_KEY);
      if (raw) this.memoryCache = JSON.parse(raw) as GoldPrice;
    } catch {
      /* ignore parse error */
    }
    return this.memoryCache;
  }

  private writeCache(p: GoldPrice): void {
    this.memoryCache = p;
    try {
      localStorage.setItem(GOLD_PRICE_CACHE_KEY, JSON.stringify(p));
    } catch {
      /* ignore quota error */
    }
  }
}

/** 金价服务单例 */
export const goldPriceService = new GoldPriceService();

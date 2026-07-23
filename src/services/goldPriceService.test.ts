/**
 * goldPriceService.test.ts — 需求④ 金价服务单元测试
 *
 * 覆盖：
 * - ETF 净值 → 元/克 换算（× GOLD_ETF_TO_GRAM_FACTOR）
 * - localStorage 缓存写入 + TTL 命中直接返回缓存（不重复拉取）
 * - 拉取失败降级返回旧缓存；无任何缓存且失败返回 null
 *
 * 说明：goldPriceService 为单例且持有内存缓存，每个用例用 vi.resetModules()
 * + 动态 import 重建实例，避免内存缓存在用例间串扰。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GoldPrice } from '../types';

const mockGetCurrentPrice = vi.fn();

vi.mock('./fundApiService', () => ({
  fundApiService: {
    getCurrentPrice: (...args: unknown[]) => mockGetCurrentPrice(...args),
  },
}));

// 注入 GOLD 常量（避免依赖真实 constants 的网络/代理逻辑）
vi.mock('../config/constants', () => ({
  GOLD_GOLD_CODE: '518880',
  GOLD_ETF_TO_GRAM_FACTOR: 100,
  GOLD_PRICE_TTL: 5 * 60 * 1000,
  GOLD_PRICE_CACHE_KEY: 'goldPriceCache',
  DEFAULT_CORS_PROXY: '',
}));

// 内存版 localStorage
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
};
vi.stubGlobal('localStorage', localStorageMock);

// 每用例重建单例，清空内存缓存 + localStorage
let goldPriceService: { getGoldPrice: (force?: boolean) => Promise<GoldPrice | null> };

beforeEach(async () => {
  store.clear();
  mockGetCurrentPrice.mockReset();
  vi.resetModules();
  ({ goldPriceService } = await import('./goldPriceService'));
});

describe('goldPriceService', () => {
  it('ETF 净值 × 因子换算为元/克', async () => {
    mockGetCurrentPrice.mockResolvedValue(4.7);
    const p = await goldPriceService.getGoldPrice(true);
    expect(p).not.toBeNull();
    expect(p!.price).toBeCloseTo(470, 4); // 4.7 × 100
    expect(p!.source).toContain('518880');
  });

  it('写入 localStorage 缓存', async () => {
    mockGetCurrentPrice.mockResolvedValue(4.7);
    await goldPriceService.getGoldPrice(true);
    const raw = store.get('goldPriceCache');
    expect(raw).toBeTruthy();
    const cached = JSON.parse(raw!);
    expect(cached.price).toBeCloseTo(470, 4);
  });

  it('TTL 内不重复拉取（命中缓存）', async () => {
    mockGetCurrentPrice.mockResolvedValue(4.7);
    await goldPriceService.getGoldPrice(true); // 写入缓存
    mockGetCurrentPrice.mockClear();
    const p = await goldPriceService.getGoldPrice(false); // TTL 内
    expect(mockGetCurrentPrice).not.toHaveBeenCalled();
    expect(p!.price).toBeCloseTo(470, 4);
  });

  it('拉取失败降级返回旧缓存', async () => {
    mockGetCurrentPrice.mockResolvedValue(4.8);
    await goldPriceService.getGoldPrice(true); // 写入有效缓存
    mockGetCurrentPrice.mockRejectedValue(new Error('network'));
    const p = await goldPriceService.getGoldPrice(true); // 失败 → 旧缓存
    expect(p).not.toBeNull();
    expect(p!.price).toBeCloseTo(480, 4);
  });

  it('无任何缓存且拉取失败时返回 null', async () => {
    mockGetCurrentPrice.mockRejectedValue(new Error('network'));
    const p = await goldPriceService.getGoldPrice(true);
    expect(p).toBeNull();
  });
});

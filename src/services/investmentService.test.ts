/**
 * investmentService.test.ts — 投资服务单元测试
 *
 * 覆盖：
 * - calcWealthMetrics 反推 costAmount = marketValue - holdingProfit 及率的数学正确性
 * - refreshAllPrices 仅刷 FUND，WEALTH/CASH 跳过
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { investmentService } from './investmentService';
import { HoldingType } from '../types';
import type { Investment } from '../types';

// mock fundApiService，避免真实网络请求
vi.mock('./fundApiService', () => ({
  fundApiService: {
    batchGetFundNavs: vi.fn(async (codes: string[]) => {
      const map = new Map<string, { gszz: string; nav: number; fundName: string }>();
      for (const c of codes) {
        map.set(c, { gszz: '2.0000', nav: 2, fundName: `基金${c}` });
      }
      return map;
    }),
  },
}));

// mock repositories：refreshAllPrices 内部会调用 updatePrice/getById/recalc
vi.mock('../db/repositories/investmentRepository', () => ({
  investmentRepository: {
    updatePrice: vi.fn(async () => {}),
    getById: vi.fn(async (id: string) => ({
      id,
      holdingType: 'FUND',
      accountId: 'acc_x',
      marketValue: 200,
      currentPrice: 2,
    })),
    getSummary: vi.fn(),
  },
}));

vi.mock('../db/repositories/accountRepository', () => ({
  accountRepository: {
    recalcBalanceFromHoldings: vi.fn(async () => {}),
  },
}));

const makeInv = (over: Partial<Investment>): Investment => ({
  id: 'i1',
  holdingType: HoldingType.FUND,
  accountId: 'acc_x',
  fundCode: '000001',
  fundName: 'x',
  shares: 100,
  costPrice: 1,
  currentPrice: 1,
  costAmount: 100,
  marketValue: 100,
  profitLoss: 0,
  profitLossRate: 0,
  buyDate: '2024-01-01',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ...over,
});

describe('calcWealthMetrics', () => {
  it('反推成本：costAmount = marketValue - holdingProfit', () => {
    // 产品①：市值30200，持有收益810.80 → 成本=29389.20
    const m = investmentService.calcWealthMetrics({ marketValue: 30200, holdingProfit: 810.8 });
    expect(m.costAmount).toBeCloseTo(29389.2, 2);
    expect(m.marketValue).toBe(30200);
    expect(m.holdingProfit).toBeCloseTo(810.8, 2);
    expect(m.profitLoss).toBeCloseTo(810.8, 2); // profitLoss === holdingProfit
  });

  it('率缺失时反推：holdingProfitRate = holdingProfit / costAmount * 100', () => {
    const m = investmentService.calcWealthMetrics({ marketValue: 30200, holdingProfit: 810.8 });
    const expectedRate = (810.8 / (30200 - 810.8)) * 100;
    expect(m.holdingProfitRate).toBeCloseTo(expectedRate, 4);
    expect(m.profitLossRate).toBeCloseTo(expectedRate, 4); // profitLossRate === holdingProfitRate
  });

  it('入参提供 holdingProfitRate 时优先采用', () => {
    const m = investmentService.calcWealthMetrics({
      marketValue: 30200,
      holdingProfit: 810.8,
      holdingProfitRate: 2.75,
    });
    expect(m.holdingProfitRate).toBe(2.75);
  });

  it('成本 <=0 时率为 0', () => {
    // 市值100 收益150 → 成本=-50，率兜底 0
    const m = investmentService.calcWealthMetrics({ marketValue: 100, holdingProfit: 150 });
    expect(m.costAmount).toBeCloseTo(-50, 6);
    expect(m.holdingProfitRate).toBe(0);
  });

  it('负收益（当日亏损）：产品② 市值159900 持有14800', () => {
    const m = investmentService.calcWealthMetrics({
      marketValue: 159900,
      holdingProfit: 14800,
      dailyProfit: -246.36,
    });
    expect(m.costAmount).toBeCloseTo(145100, 2);
    // dailyProfitRate 由 dailyProfit/(marketValue-dailyProfit)*100 反推
    const base = 159900 - -246.36;
    expect(m.dailyProfitRate).toBeCloseTo((-246.36 / base) * 100, 4);
  });

  it('无 dailyProfit 时 dailyProfit/dailyProfitRate 均为 undefined', () => {
    const m = investmentService.calcWealthMetrics({ marketValue: 30200, holdingProfit: 810.8 });
    expect(m.dailyProfit).toBeUndefined();
    expect(m.dailyProfitRate).toBeUndefined();
  });

  it('marketValue 缺省视为 0', () => {
    const m = investmentService.calcWealthMetrics({ holdingProfit: 0 });
    expect(m.marketValue).toBe(0);
    expect(m.costAmount).toBe(0);
    expect(m.holdingProfitRate).toBe(0);
  });
});

describe('refreshAllPrices（仅刷 FUND）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无基金持仓时原样返回，不调用 batchGetFundNavs', async () => {
    const wealth = makeInv({ id: 'w1', holdingType: HoldingType.WEALTH, fundCode: '', marketValue: 30200 });
    const cash = makeInv({ id: 'c1', holdingType: HoldingType.CASH, fundCode: '', marketValue: 116.59 });
    const result = await investmentService.refreshAllPrices([wealth, cash]);
    expect(result).toEqual([wealth, cash]);
  });

  it('WEALTH/CASH 在混合列表中保持原样，仅 FUND 被刷新', async () => {
    const fund = makeInv({ id: 'f1', holdingType: HoldingType.FUND, fundCode: '000001' });
    const wealth = makeInv({ id: 'w1', holdingType: HoldingType.WEALTH, fundCode: '', marketValue: 30200 });
    const result = await investmentService.refreshAllPrices([fund, wealth]);
    const outWealth = result.find((r) => r.id === 'w1');
    expect(outWealth).toEqual(wealth); // 理财原样
    const outFund = result.find((r) => r.id === 'f1');
    expect(outFund?.id).toBe('f1'); // 基金被替换为最新
  });
});

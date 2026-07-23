/**
 * wealthOcrParser.test.ts — 理财/资产分布 OCR 解析器单元测试
 *
 * 用真实截图文案（中国银行 boc-assets.jpg / boc-wealth.jpg）构造输入，
 * 覆盖：parseCnyAmount 万元换算/千分位/正负号/破折号/undefined、
 * parseAssetDistributionOcrText 图1四金额、parseWealthOcrText 多条切分与合计、
 * toWealthPrefills accountId 注入、toAssetDistributionPrefill CASH 生成。
 */

import { describe, it, expect } from 'vitest';
import {
  parseCnyAmount,
  parseAssetDistributionOcrText,
  parseWealthOcrText,
  parseBocWealthOcrText,
  parseCmbWealthOcrText,
  parseAlipayFundOcrText,
  toWealthPrefills,
  toAssetDistributionPrefill,
} from './wealthOcrParser';
import {
  BOC_WEALTH,
  CMB_WEALTH_LIST,
  ALIPAY_FUND_LIST,
} from './__fixtures__/realOcrSamples';
import { HoldingType } from '../types';

// ==================== parseCnyAmount ====================

describe('parseCnyAmount', () => {
  it('解析普通千分位金额', () => {
    expect(parseCnyAmount('190,221.08')).toBe(190221.08);
    expect(parseCnyAmount('116.59')).toBe(116.59);
  });

  it('万元换算：3.02万 → 30200', () => {
    expect(parseCnyAmount('3.02万')).toBeCloseTo(30200, 6);
  });

  it('万元换算：15.99万 → 159900', () => {
    expect(parseCnyAmount('15.99万')).toBeCloseTo(159900, 6);
  });

  it('万元换算：1.48万 → 14800（带¥符号）', () => {
    expect(parseCnyAmount('¥1.48万')).toBeCloseTo(14800, 6);
  });

  it('「万元」后缀也应换算', () => {
    expect(parseCnyAmount('2.5万元')).toBeCloseTo(25000, 6);
  });

  it('正号金额', () => {
    expect(parseCnyAmount('+810.80')).toBeCloseTo(810.8, 6);
  });

  it('普通减号为负', () => {
    expect(parseCnyAmount('-8.82')).toBeCloseTo(-8.82, 6);
  });

  it('全角破折号 － 视为负号', () => {
    expect(parseCnyAmount('－246.36')).toBeCloseTo(-246.36, 6);
  });

  it('长破折号 — 视为负号', () => {
    expect(parseCnyAmount('—246.36')).toBeCloseTo(-246.36, 6);
  });

  it('负号 + 万元组合', () => {
    expect(parseCnyAmount('-1.2万')).toBeCloseTo(-12000, 6);
  });

  it('识别不到数字返回 undefined', () => {
    expect(parseCnyAmount('无金额文字')).toBeUndefined();
    expect(parseCnyAmount('')).toBeUndefined();
  });

  it('零值可正常解析', () => {
    expect(parseCnyAmount('0')).toBe(0);
    expect(parseCnyAmount('0.00')).toBe(0);
  });
});

// ==================== parseAssetDistributionOcrText（图1） ====================

describe('parseAssetDistributionOcrText', () => {
  // 图1 资产分布真实文案：总资产190,337.67 / 理财190,221.08 / 活期116.59 / 基金0
  const assetText = [
    '资产分布',
    '总资产(元)',
    '190,337.67',
    '理财 190,221.08',
    '活期 116.59',
    '基金 0.00',
  ].join('\n');

  it('解析总资产', () => {
    const r = parseAssetDistributionOcrText(assetText);
    expect(r.totalAssets).toBeCloseTo(190337.67, 2);
  });

  it('解析理财金额', () => {
    const r = parseAssetDistributionOcrText(assetText);
    expect(r.wealthAmount).toBeCloseTo(190221.08, 2);
  });

  it('解析活期金额', () => {
    const r = parseAssetDistributionOcrText(assetText);
    expect(r.cashAmount).toBeCloseTo(116.59, 2);
  });

  it('基金为 0 时应保留 0（allowZero）', () => {
    const r = parseAssetDistributionOcrText(assetText);
    expect(r.fundAmount).toBe(0);
  });

  it('保留原始文本', () => {
    const r = parseAssetDistributionOcrText(assetText);
    expect(r.raw).toBe(assetText);
  });

  it('空输入不抛异常', () => {
    const r = parseAssetDistributionOcrText('');
    expect(r.raw).toBe('');
    expect(r.totalAssets).toBeUndefined();
  });
});

// ==================== parseWealthOcrText（图2） ====================

describe('parseWealthOcrText', () => {
  // 图2 理财持仓真实文案：
  // 持仓市值190,221.08 / 累计收益+15,610.84
  // 产品① 代销信银理财·慧盈象固收增利蔚蓝智享 市值3.02万 当日-8.82 持有+810.80
  // 产品② 代销中银理财·(7个月)最短持有期固收增强A 市值15.99万 当日-246.36 持有+1.48万
  const wealthText = [
    '持仓市值 190,221.08',
    '累计收益 +15,610.84',
    '代销信银理财·慧盈象固收增利蔚蓝智享',
    '持仓市值 3.02万',
    '当日收益 -8.82',
    '持有收益 +810.80',
    '代销中银理财·(7个月)最短持有期固收增强A',
    '持仓市值 15.99万',
    '当日收益 -246.36',
    '持有收益 +1.48万',
  ].join('\n');

  it('解析持仓市值合计', () => {
    const r = parseWealthOcrText(wealthText);
    expect(r.totalMarketValue).toBeCloseTo(190221.08, 2);
  });

  it('解析累计收益合计', () => {
    const r = parseWealthOcrText(wealthText);
    expect(r.totalHoldingProfit).toBeCloseTo(15610.84, 2);
  });

  it('切分出 2 条理财产品', () => {
    const r = parseWealthOcrText(wealthText);
    expect(r.items.length).toBe(2);
  });

  it('第①条：信银理财 市值3.02万=30200 当日-8.82 持有+810.80', () => {
    const r = parseWealthOcrText(wealthText);
    const item = r.items[0];
    expect(item.institution).toBe('信银理财');
    expect(item.marketValue).toBeCloseTo(30200, 2);
    expect(item.dailyProfit).toBeCloseTo(-8.82, 2);
    expect(item.holdingProfit).toBeCloseTo(810.8, 2);
    expect(item.productName).toBeDefined();
    expect(item.productName).toContain('慧盈象');
  });

  it('第②条：中银理财 市值15.99万=159900 当日-246.36 持有+1.48万=14800', () => {
    const r = parseWealthOcrText(wealthText);
    const item = r.items[1];
    expect(item.institution).toBe('中银理财');
    expect(item.marketValue).toBeCloseTo(159900, 2);
    expect(item.dailyProfit).toBeCloseTo(-246.36, 2);
    expect(item.holdingProfit).toBeCloseTo(14800, 2);
    expect(item.productName).toBeDefined();
  });

  it('空输入返回空 items', () => {
    const r = parseWealthOcrText('');
    expect(r.items).toEqual([]);
  });
});

// ==================== toWealthPrefills ====================

describe('toWealthPrefills', () => {
  const wealthText = [
    '持仓市值 190,221.08',
    '累计收益 +15,610.84',
    '代销信银理财·慧盈象固收增利蔚蓝智享',
    '持仓市值 3.02万',
    '当日收益 -8.82',
    '持有收益 +810.80',
    '代销中银理财·(7个月)最短持有期固收增强A',
    '持仓市值 15.99万',
    '当日收益 -246.36',
    '持有收益 +1.48万',
  ].join('\n');

  it('每条 prefill 注入 accountId 与 WEALTH 类型', () => {
    const parsed = parseWealthOcrText(wealthText);
    const prefills = toWealthPrefills(parsed, 'acc_boc_debit');
    expect(prefills.length).toBe(2);
    for (const p of prefills) {
      expect(p.accountId).toBe('acc_boc_debit');
      expect(p.holdingType).toBe(HoldingType.WEALTH);
    }
  });

  it('保留 marketValue / institution / 收益字段', () => {
    const parsed = parseWealthOcrText(wealthText);
    const prefills = toWealthPrefills(parsed, 'acc_boc_debit');
    expect(prefills[0].institution).toBe('信银理财');
    expect(prefills[0].marketValue).toBeCloseTo(30200, 2);
    expect(prefills[0].holdingProfit).toBeCloseTo(810.8, 2);
    expect(prefills[1].marketValue).toBeCloseTo(159900, 2);
  });
});

// ==================== toAssetDistributionPrefill ====================

describe('toAssetDistributionPrefill', () => {
  it('有活期金额时生成 CASH DTO 并注入 accountId', () => {
    const parsed = parseAssetDistributionOcrText('活期 116.59');
    const r = toAssetDistributionPrefill(parsed, 'acc_boc_debit');
    expect(r.cash).toBeDefined();
    expect(r.cash?.holdingType).toBe(HoldingType.CASH);
    expect(r.cash?.accountId).toBe('acc_boc_debit');
    expect(r.cash?.marketValue).toBeCloseTo(116.59, 2);
    expect(r.cash?.fundName).toBe('活期存款');
  });

  it('活期为 0 时仍生成 CASH DTO（allowZero）', () => {
    const parsed = parseAssetDistributionOcrText('活期 0.00');
    const r = toAssetDistributionPrefill(parsed, 'acc_boc_debit');
    expect(r.cash).toBeDefined();
    expect(r.cash?.marketValue).toBe(0);
  });

  it('识别不到活期金额返回空对象', () => {
    const parsed = parseAssetDistributionOcrText('没有活期字段');
    const r = toAssetDistributionPrefill(parsed, 'acc_boc_debit');
    expect(r.cash).toBeUndefined();
  });
});

// ==================== 三平台真实 OCR fixture 回归 ====================
// 用 Tesseract 对用户真实截图的原始输出（含汉字间空格）回归三个专用解析器。

describe('parseBocWealthOcrText — 中国银行理财列表（真实 OCR）', () => {
  it('切分出 2 条，市值/当日收益/持仓收益均正确', () => {
    const r = parseBocWealthOcrText(BOC_WEALTH);
    expect(r.items.length).toBe(2);

    // ① 信银理财 慧盈象… 市值3.02万=30200 当日-8.82 持有+810.80
    expect(r.items[0].institution).toBe('信银理财');
    expect(r.items[0].marketValue).toBeCloseTo(30200, 2);
    expect(r.items[0].dailyProfit).toBeCloseTo(-8.82, 2);
    expect(r.items[0].holdingProfit).toBeCloseTo(810.8, 2);
    expect(r.items[0].productName).toContain('慧盈象');

    // ② 中银理财 …固收增强A 市值15.99万=159900 当日-246.36 持有+1.48万=14800
    expect(r.items[1].institution).toBe('中银理财');
    expect(r.items[1].marketValue).toBeCloseTo(159900, 2);
    expect(r.items[1].dailyProfit).toBeCloseTo(-246.36, 2);
    expect(r.items[1].holdingProfit).toBeCloseTo(14800, 2);
  });
});

describe('parseCmbWealthOcrText — 招商银行理财列表（真实 OCR）', () => {
  it('切分出 3 条，市值/持仓收益正确', () => {
    const r = parseCmbWealthOcrText(CMB_WEALTH_LIST);
    expect(r.items.length).toBe(3);

    // ① 多宝理财半年宝 市值200,000 持仓收益0
    expect(r.items[0].marketValue).toBeCloseTo(200000, 2);
    expect(r.items[0].holdingProfit).toBeCloseTo(0, 2);

    // ② 招智价值增强 市值49,120.15 持仓收益-879.85
    expect(r.items[1].marketValue).toBeCloseTo(49120.15, 2);
    expect(r.items[1].holdingProfit).toBeCloseTo(-879.85, 2);

    // ③ 信银慧盈象固收增强 市值100,000 持仓收益0
    expect(r.items[2].marketValue).toBeCloseTo(100000, 2);
    expect(r.items[2].holdingProfit).toBeCloseTo(0, 2);
  });

  it('（需求⑤修复）从截图全文中识别「昨日收益」并归入当日收益', () => {
    const text = `我的持仓
总资产 350,000.00
昨日收益 +12.50
多宝理财半年宝
200,000.00 0.00 2027.01.18
持仓金额持仓收益可申赎
招智价值增强
49,120.15 -879.85 2027.03.20
持仓金额持仓收益可申赎`;
    const r = parseCmbWealthOcrText(text);
    expect(r.items.length).toBeGreaterThan(0);
    // 当日收益应从全文「昨日收益 +12.50」识别并归到各条（best-effort）
    expect(r.items[0].dailyProfit).toBeCloseTo(12.5, 2);
    expect(r.items[1].dailyProfit).toBeCloseTo(12.5, 2);
  });
});

describe('parseAlipayFundOcrText — 支付宝基金列表（真实 OCR）', () => {
  it('切分出 5 支基金，市值/当日收益/持有收益/收益率正确', () => {
    const r = parseAlipayFundOcrText(ALIPAY_FUND_LIST);
    expect(r.items.length).toBe(5);

    // ① 长城短债债券E 市值50,000 当日0 持有0
    expect(r.items[0].marketValue).toBeCloseTo(50000, 2);
    expect(r.items[0].dailyProfit).toBeCloseTo(0, 2);

    // ② 建信纳斯达克100 市值1,935.32 当日+0.33 持有+192.84 率+11.20%
    expect(r.items[1].marketValue).toBeCloseTo(1935.32, 2);
    expect(r.items[1].dailyProfit).toBeCloseTo(0.33, 2);
    expect(r.items[1].holdingProfit).toBeCloseTo(192.84, 2);
    expect(r.items[1].holdingProfitRate).toBeCloseTo(11.2, 2);

    // ③ 广发中证军工ETF联接C 市值863.25 当日25.91 持有-136.75 率-13.68%
    expect(r.items[2].marketValue).toBeCloseTo(863.25, 2);
    expect(r.items[2].holdingProfit).toBeCloseTo(-136.75, 2);
    expect(r.items[2].holdingProfitRate).toBeCloseTo(-13.68, 2);

    // ⑤ 嘉实中证稀土ETF联接C 市值182.40 当日+7.46 持有-17.60 率-8.80%
    expect(r.items[4].marketValue).toBeCloseTo(182.4, 2);
    expect(r.items[4].dailyProfit).toBeCloseTo(7.46, 2);
    expect(r.items[4].holdingProfit).toBeCloseTo(-17.6, 2);
    expect(r.items[4].holdingProfitRate).toBeCloseTo(-8.8, 2);
  });
});

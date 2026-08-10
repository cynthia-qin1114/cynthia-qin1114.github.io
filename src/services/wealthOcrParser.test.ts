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
  parseAlipayTotalAssetsOcrText,
  toAlipayTotalAssetsPrefills,
  isAlipayTotalAssetsPage,
  parseAlipayAdvancedFundOcrText,
  isAlipayAdvancedFundPage,
  // Bug① 中国银行「资产管理」
  isBocAssetsPage,
  parseBocAssetsOcrText,
  toBocAssetsPrefills,
  // Bug② 中信证券「我的资产」
  isCiticAssetsPage,
  parseCiticAssetsOcrText,
  toCiticAssetsPrefills,
  // Bug③/④ 基金持仓列表
  isCiticFundPage,
  parseCiticFundOcrText,
  isCmbFundPage,
  parseCmbFundOcrText,
  // Bug④ 招行基金「详情页」识别增强
  isCmbFundDetailPage,
  parseCmbFundDetailOcrText,
  toFundPrefills,
} from './wealthOcrParser';
import {
  BOC_WEALTH,
  BOC_WEALTH_WITH_ADS,
  CMB_WEALTH_LIST,
  ALIPAY_FUND_LIST,
  ALIPAY_TOTAL_ASSETS,
  ALIPAY_ADVANCED_FUND_LIST,
  BOC_ASSET_MANAGE,
  CITIC_MY_ASSETS,
  CITIC_FUND_LIST,
  CMB_FUND_HOLDING,
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

  it('中行「理财」页（仅 1 支 + 顶部 tab + 净值科普卡）——上下文噪声过滤后只剩 1 条真产品', () => {
    // 用户最新报告 Bug：之前会切出第 1 条假产品（"<all全区<理财,">" / 16/4/51）
    // 因为：顶部 tab「交易记录 账户管理 ... 风险测评」+ 科普卡「净值有波动...5 个问题」
    //   被 OCR 误识为含"参考市值"+"持仓收益"字样的伪标签行，构造出"假产品名+假标签+数字碎片"三行组。
    // 期望：contextNoiseRe 过滤掉该组，仅解析出真产品（中银理财固收增强A 16.05万 +86.19 +1.53万）。
    const r = parseBocWealthOcrText(BOC_WEALTH_WITH_ADS);
    expect(r.items.length).toBe(1);
    expect(r.items[0].institution).toBe('中银理财');
    expect(r.items[0].marketValue).toBeCloseTo(160500, 2);  // 16.05 万
    expect(r.items[0].dailyProfit).toBeCloseTo(86.19, 2);
    expect(r.items[0].holdingProfit).toBeCloseTo(15300, 2);  // 1.53 万
    expect(r.items[0].productName).toContain('固收增强');
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

    // ① 示例短债债券E 市值50,000 当日0 持有0
    expect(r.items[0].marketValue).toBeCloseTo(50000, 2);
    expect(r.items[0].dailyProfit).toBeCloseTo(0, 2);

    // ② 示例纳斯达克100 市值1,935.32 当日+0.33 持有+192.84 率+11.20%
    expect(r.items[1].marketValue).toBeCloseTo(1935.32, 2);
    expect(r.items[1].dailyProfit).toBeCloseTo(0.33, 2);
    expect(r.items[1].holdingProfit).toBeCloseTo(192.84, 2);
    expect(r.items[1].holdingProfitRate).toBeCloseTo(11.2, 2);

    // ③ 示例中证军工ETF联接C 市值863.25 当日25.91 持有-136.75 率-13.68%
    expect(r.items[2].marketValue).toBeCloseTo(863.25, 2);
    expect(r.items[2].holdingProfit).toBeCloseTo(-136.75, 2);
    expect(r.items[2].holdingProfitRate).toBeCloseTo(-13.68, 2);

    // ⑤ 示例中证稀土ETF联接C 市值182.40 当日+7.46 持有-17.60 率-8.80%
    expect(r.items[4].marketValue).toBeCloseTo(182.4, 2);
    expect(r.items[4].dailyProfit).toBeCloseTo(7.46, 2);
    expect(r.items[4].holdingProfit).toBeCloseTo(-17.6, 2);
    expect(r.items[4].holdingProfitRate).toBeCloseTo(-8.8, 2);
  });
});

// ==================== 支付宝「总资产」页（Bug 2） ====================

describe('isAlipayTotalAssetsPage', () => {
  it('识别支付宝总资产页（含「我的资产」）', () => {
    expect(isAlipayTotalAssetsPage(ALIPAY_TOTAL_ASSETS)).toBe(true);
  });
  it('非支付宝总资产页返回 false', () => {
    expect(isAlipayTotalAssetsPage(BOC_WEALTH)).toBe(false);
    expect(isAlipayTotalAssetsPage(ALIPAY_FUND_LIST)).toBe(false);
  });
});

describe('parseAlipayTotalAssetsOcrText — 支付宝总资产页（真实 OCR）', () => {
  it('解析我的资产（= 三栏之和）', () => {
    const r = parseAlipayTotalAssetsOcrText(ALIPAY_TOTAL_ASSETS);
    expect(r.totalAssets).toBeCloseTo(55941.56, 2);
  });

  it('解析昨日收益', () => {
    const r = parseAlipayTotalAssetsOcrText(ALIPAY_TOTAL_ASSETS);
    expect(r.yesterdayProfit).toBeCloseTo(-55.89, 2);
  });

  it('解析三栏资产分类：活期/稳健/进阶', () => {
    const r = parseAlipayTotalAssetsOcrText(ALIPAY_TOTAL_ASSETS);
    expect(r.cashAmount).toBeCloseTo(1295.23, 2);
    expect(r.cashDailyProfit).toBeCloseTo(0.03, 2);
    expect(r.stableWealthAmount).toBeCloseTo(50008.02, 2);
    expect(r.stableWealthDailyProfit).toBeCloseTo(4.01, 2);
    expect(r.advancedWealthAmount).toBeCloseTo(4638.31, 2);
    expect(r.advancedWealthDailyProfit).toBeCloseTo(-59.93, 2);
  });

  it('三栏金额之和 ≈ 我的资产（分类自洽）', () => {
    const r = parseAlipayTotalAssetsOcrText(ALIPAY_TOTAL_ASSETS);
    const sum = (r.cashAmount ?? 0) + (r.stableWealthAmount ?? 0) + (r.advancedWealthAmount ?? 0);
    expect(sum).toBeCloseTo(55941.56, 2);
  });

  it('toAlipayTotalAssetsPrefills 生成 CASH + 2 WEALTH，注入 accountId', () => {
    const r = parseAlipayTotalAssetsOcrText(ALIPAY_TOTAL_ASSETS);
    const prefills = toAlipayTotalAssetsPrefills(r, 'acc_alipay');
    expect(prefills.length).toBe(3);
    expect(prefills[0].holdingType).toBe(HoldingType.CASH);
    expect(prefills[0].accountId).toBe('acc_alipay');
    expect(prefills[0].fundName).toBe('余额宝');
    expect(prefills[0].marketValue).toBeCloseTo(1295.23, 2);
    expect(prefills[1].holdingType).toBe(HoldingType.WEALTH);
    expect(prefills[1].fundName).toBe('稳健理财');
    expect(prefills[1].marketValue).toBeCloseTo(50008.02, 2);
    expect(prefills[2].holdingType).toBe(HoldingType.WEALTH);
    expect(prefills[2].fundName).toBe('进阶理财');
    expect(prefills[2].marketValue).toBeCloseTo(4638.31, 2);
  });
});

// ==================== 支付宝「进阶理财」基金列表（Bug 3） ====================

describe('isAlipayAdvancedFundPage', () => {
  it('识别支付宝进阶理财基金列表', () => {
    expect(isAlipayAdvancedFundPage(ALIPAY_ADVANCED_FUND_LIST)).toBe(true);
  });
  it('总资产页 / 普通基金列表不被误判为进阶理财', () => {
    expect(isAlipayAdvancedFundPage(ALIPAY_TOTAL_ASSETS)).toBe(false);
    expect(isAlipayAdvancedFundPage(ALIPAY_FUND_LIST)).toBe(false);
  });
});

describe('parseAlipayAdvancedFundOcrText — 支付宝进阶理财基金列表（真实 OCR）', () => {
  it('切分出 6 支基金', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    expect(r.items.length).toBe(6);
  });

  it('① 示例纳斯达克100指数(QDII)A：金额1,981.17 昨日-7.62 持有+218.69', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    const it = r.items[0];
    expect(it.productName).toContain('示例纳斯达克');
    expect(it.productName).toContain('100指数');
    expect(it.marketValue).toBeCloseTo(1981.17, 2);
    expect(it.dailyProfit).toBeCloseTo(-7.62, 2);
    expect(it.holdingProfit).toBeCloseTo(218.69, 2);
  });

  it('② 示例中证军工ETF联接C：金额871.09 昨日+13.98 持有-128.91', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    const it = r.items[1];
    expect(it.productName).toContain('示例中证军工');
    expect(it.marketValue).toBeCloseTo(871.09, 2);
    expect(it.dailyProfit).toBeCloseTo(13.98, 2);
    expect(it.holdingProfit).toBeCloseTo(-128.91, 2);
  });

  it('⑥ 示例科创50联接C：金额400.32 昨日-14.67 持有+100.32', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    const it = r.items[5];
    expect(it.productName).toContain('示例科创50');
    expect(it.marketValue).toBeCloseTo(400.32, 2);
    expect(it.dailyProfit).toBeCloseTo(-14.67, 2);
    expect(it.holdingProfit).toBeCloseTo(100.32, 2);
  });

  it('toWealthPrefills 注入 WEALTH 类型与 accountId', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    const prefills = toWealthPrefills(r, 'acc_alipay');
    expect(prefills.length).toBe(6);
    for (const p of prefills) {
      expect(p.accountId).toBe('acc_alipay');
      expect(p.holdingType).toBe(HoldingType.WEALTH);
      expect(p.marketValue).toBeDefined();
    }
  });
});

// ==================== Bug 支付宝「进阶理财」OCR 残缺兜底 ====================
// 判别降级（持有收益 ≥ 1 或 三短词 ≥ 2）+ 解析器数字顺序兜底：
// 应对 Tesseract 把红字小字号「持有收益」识别成「持有 收益」/漏字的情况。

describe('isAlipayAdvancedFundPage — 判别降级', () => {
  it('持有收益 ≥ 1（原有主判据）：fixture 命中', () => {
    expect(isAlipayAdvancedFundPage(ALIPAY_ADVANCED_FUND_LIST)).toBe(true);
  });

  it('持有收益 = 0 但同时含「金额」+「持有」+「昨日」中至少 2 短词 → true（兜底）', () => {
    const t = `< 进阶 理财 客服
示 例 纳 斯 达 克 100 指 数 (QDII)A 基 金 定 投
金 额 1,981.17 昨 日 收 益 -7.62 持 有 收 益 +218.69
示 例 中 证 军 工 基 金
金 额 871.09 昨 日 -13.98`;
    // 命中「金额」+「昨日」+「持有」三个短词 → 命中数=3 → true
    expect(isAlipayAdvancedFundPage(t)).toBe(true);
  });

  it('持有收益 = 0 且只命中「昨日」+「持有」两短词 → true', () => {
    const t = `< 进阶 理财
昨 日 收 益 +31.56 持 有 收 益 +200.62
昨 日 收 益 +10.79 持 有 收 益 -113.30`;
    expect(isAlipayAdvancedFundPage(t)).toBe(true);
  });

  it('持有收益 = 0 仅命中一短词（如仅「金额」）→ false', () => {
    const t = `< 进阶 理财
金 额 1,981.17
金 额 871.09`;
    expect(isAlipayAdvancedFundPage(t)).toBe(false);
  });

  it('缺「进阶理财」标题 → false', () => {
    const t = `金 额 1,981.17 昨 日 收 益 -7.62 持 有 收 益 +218.69`;
    expect(isAlipayAdvancedFundPage(t)).toBe(false);
  });
});

describe('parseAlipayAdvancedFundOcrText — 解析鲁棒性', () => {
  it('残缺文本：把整串「持有收益」吞了，行内只剩 3 个数字 → 解析器仍按 numericLineRe 兜底提取（用于路由打分兜底场景）', () => {
    // 判别器 `isAlipayAdvancedFundPage` 此时应判 false（3 短词命中数=0），
    // 但路由 `WealthSyncOcrButton.WEALTH 分支` 已把 advanced 解析器加入五解析器打分池，
    // 此处验证解析器自身在「标签全失 + 仅数字」场景下仍能稳定输出 ——
    // 这是用户最新截图场景的最小可用兜底（判别降级不必扩太宽以免误判）。
    const t = `< 进阶 理财 客服
建 信 纳 斯 达 克 100 指 数 (QDII)A
基 金 定 投
1,981.17 -7.62 +218.69
广 发 中 证 军 工 ETF 联 接 C
基 金
871.09 +13.98 -128.91
银 华 集 成 电 路 混 合 C
基 金
788.71 -41.10 +388.71`;
    const r = parseAlipayAdvancedFundOcrText(t);
    expect(r.items.length).toBe(3);
    expect(r.items[0].productName).toContain('纳斯达克');
    expect(r.items[0].marketValue).toBeCloseTo(1981.17, 2);
    expect(r.items[0].dailyProfit).toBeCloseTo(-7.62, 2);
    expect(r.items[0].holdingProfit).toBeCloseTo(218.69, 2);
    expect(r.items[1].marketValue).toBeCloseTo(871.09, 2);
    expect(r.items[1].holdingProfit).toBeCloseTo(-128.91, 2);
    expect(r.items[2].holdingProfit).toBeCloseTo(388.71, 2);
  });

  it('只有「金额」+「持有」短词，无完整「持有收益」标签 → 仍能解析', () => {
    const t = `< 进阶 理财
建 信 A 基 金
金 额 1,000.00 持 有 +50.00`;
    const r = parseAlipayAdvancedFundOcrText(t);
    expect(r.items.length).toBe(1);
    expect(r.items[0].marketValue).toBeCloseTo(1000, 2);
    expect(r.items[0].holdingProfit).toBeCloseTo(50, 2);
  });

  it('完整 fixture 6 条全解析（回归）', () => {
    const r = parseAlipayAdvancedFundOcrText(ALIPAY_ADVANCED_FUND_LIST);
    expect(r.items.length).toBe(6);
  });
});

// ==================== Bug① 中国银行「资产管理」资产总览页 ====================

describe('isBocAssetsPage', () => {
  it('识别中行资产管理页', () => {
    expect(isBocAssetsPage(BOC_ASSET_MANAGE)).toBe(true);
  });
  it('中行理财列表 / 中信 / 支付宝不被误判', () => {
    expect(isBocAssetsPage(BOC_WEALTH)).toBe(false);
    expect(isBocAssetsPage(CITIC_MY_ASSETS)).toBe(false);
    expect(isBocAssetsPage(ALIPAY_TOTAL_ASSETS)).toBe(false);
  });
});

describe('parseBocAssetsOcrText — 中国银行资产管理页（真实 OCR）', () => {
  it('提取 总资产 / 理财(WEALTH) / 活期存款(CASH)', () => {
    const r = parseBocAssetsOcrText(BOC_ASSET_MANAGE);
    expect(r.totalAssets).toBeCloseTo(190584.67, 2);
    expect(r.wealthAmount).toBeCloseTo(160224.03, 2);
    expect(r.cashAmount).toBeCloseTo(30360.64, 2);
  });

  it('理财 + 活期 = 总资产（自洽校验）', () => {
    const r = parseBocAssetsOcrText(BOC_ASSET_MANAGE);
    const sum = (r.wealthAmount ?? 0) + (r.cashAmount ?? 0);
    expect(sum).toBeCloseTo(190584.67, 2);
  });

  it('toBocAssetsPrefills 生成 WEALTH + CASH，注入 accountId', () => {
    const r = parseBocAssetsOcrText(BOC_ASSET_MANAGE);
    const prefills = toBocAssetsPrefills(r, 'acc_boc_debit');
    expect(prefills.length).toBe(2);
    expect(prefills[0].holdingType).toBe(HoldingType.WEALTH);
    expect(prefills[0].fundName).toBe('理财');
    expect(prefills[0].marketValue).toBeCloseTo(160224.03, 2);
    expect(prefills[1].holdingType).toBe(HoldingType.CASH);
    expect(prefills[1].fundName).toBe('活期存款');
    expect(prefills[1].marketValue).toBeCloseTo(30360.64, 2);
  });
});

// ==================== Bug② 中信证券「我的资产」资产总览页 ====================

describe('isCiticAssetsPage', () => {
  it('识别中信证券我的资产页', () => {
    expect(isCiticAssetsPage(CITIC_MY_ASSETS)).toBe(true);
  });
  it('支付宝总资产页 / 中行 / 中信基金列表不被误判', () => {
    expect(isCiticAssetsPage(ALIPAY_TOTAL_ASSETS)).toBe(false);
    expect(isCiticAssetsPage(BOC_ASSET_MANAGE)).toBe(false);
    expect(isCiticAssetsPage(CITIC_FUND_LIST)).toBe(false);
  });
});

describe('parseCiticAssetsOcrText — 中信证券我的资产页（真实 OCR）', () => {
  it('提取 人民币总资产 / 理财(WEALTH) / 现金(CASH)', () => {
    const r = parseCiticAssetsOcrText(CITIC_MY_ASSETS);
    expect(r.totalAssets).toBeCloseTo(3055.09, 2);
    expect(r.wealthAmount).toBeCloseTo(2244.75, 2);
    expect(r.cashAmount).toBeCloseTo(810.34, 2);
  });

  it('理财 + 现金 = 人民币总资产（自洽校验）', () => {
    const r = parseCiticAssetsOcrText(CITIC_MY_ASSETS);
    const sum = (r.wealthAmount ?? 0) + (r.cashAmount ?? 0);
    expect(sum).toBeCloseTo(3055.09, 2);
  });

  it('toCiticAssetsPrefills 生成 WEALTH + CASH，注入 accountId', () => {
    const r = parseCiticAssetsOcrText(CITIC_MY_ASSETS);
    const prefills = toCiticAssetsPrefills(r, 'acc_citic_securities');
    expect(prefills.length).toBe(2);
    expect(prefills[0].holdingType).toBe(HoldingType.WEALTH);
    expect(prefills[0].fundName).toBe('理财');
    expect(prefills[0].marketValue).toBeCloseTo(2244.75, 2);
    expect(prefills[1].holdingType).toBe(HoldingType.CASH);
    expect(prefills[1].fundName).toBe('现金');
    expect(prefills[1].marketValue).toBeCloseTo(810.34, 2);
  });
});

// ==================== Bug③ 中信证券「公募基金持仓」列表页 ====================

describe('isCiticFundPage', () => {
  it('识别中信证券公募基金持仓页', () => {
    expect(isCiticFundPage(CITIC_FUND_LIST)).toBe(true);
  });
  it('我的资产页 / 支付宝基金列表 / 招行基金页不被误判', () => {
    expect(isCiticFundPage(CITIC_MY_ASSETS)).toBe(false);
    expect(isCiticFundPage(ALIPAY_FUND_LIST)).toBe(false);
    expect(isCiticFundPage(CMB_FUND_HOLDING)).toBe(false);
  });
});

describe('parseCiticFundOcrText — 中信证券公募基金持仓（真实 OCR）', () => {
  it('切分出 2 支基金，携带基金代码', () => {
    const r = parseCiticFundOcrText(CITIC_FUND_LIST);
    expect(r.items.length).toBe(2);
    expect(r.items[0].fundCode).toBe('006479');
    expect(r.items[1].fundCode).toBe('025857');
  });

  it('① 示例纳指100ETF联接(QDII)：市值1260.79 昨日-6.57 持有+70.79', () => {
    const r = parseCiticFundOcrText(CITIC_FUND_LIST);
    const it = r.items[0];
    expect(it.productName).toContain('示例纳指');
    expect(it.productName).toContain('100ETF');
    expect(it.productName).toContain('QDII');
    expect(it.marketValue).toBeCloseTo(1260.79, 2);
    expect(it.dailyProfit).toBeCloseTo(-6.57, 2);
    expect(it.holdingProfit).toBeCloseTo(70.79, 2);
  });

  it('② 示例中证电网设备主题ETF发起式：市值983.96 昨日+44.07 持有-16.04', () => {
    const r = parseCiticFundOcrText(CITIC_FUND_LIST);
    const it = r.items[1];
    expect(it.productName).toContain('示例中证电网');
    expect(it.marketValue).toBeCloseTo(983.96, 2);
    expect(it.dailyProfit).toBeCloseTo(44.07, 2);
    expect(it.holdingProfit).toBeCloseTo(-16.04, 2);
  });

  it('toFundPrefills 生成 FUND 类型并保留基金代码', () => {
    const r = parseCiticFundOcrText(CITIC_FUND_LIST);
    const prefills = toFundPrefills(r, 'acc_citic_securities');
    expect(prefills.length).toBe(2);
    for (const p of prefills) {
      expect(p.holdingType).toBe(HoldingType.FUND);
      expect(p.accountId).toBe('acc_citic_securities');
      expect(p.fundCode).toBeDefined();
      expect(p.marketValue).toBeDefined();
    }
    expect(prefills[0].fundCode).toBe('006479');
  });
});

// ==================== Bug④ 招商银行「基金持仓」页 ====================

describe('isCmbFundPage', () => {
  it('识别招商银行基金持仓页', () => {
    expect(isCmbFundPage(CMB_FUND_HOLDING)).toBe(true);
  });
  it('支付宝基金列表 / 中信基金列表 / 中行资产页不被误判', () => {
    expect(isCmbFundPage(ALIPAY_FUND_LIST)).toBe(false);
    expect(isCmbFundPage(CITIC_FUND_LIST)).toBe(false);
    expect(isCmbFundPage(BOC_ASSET_MANAGE)).toBe(false);
  });
});

describe('parseCmbFundOcrText — 招商银行基金持仓（真实 OCR）', () => {
  it('正确提取卡片基金，市值=991.80（绝非顶部总金额 29.52）', () => {
    const r = parseCmbFundOcrText(CMB_FUND_HOLDING);
    expect(r.items.length).toBe(1);
    const it = r.items[0];
    expect(it.marketValue).toBeCloseTo(991.8, 2);
    expect(it.marketValue).not.toBeCloseTo(29.52);
  });

  it('基金名 = 南方有色金属ETF联接E；昨日收益=29.52；持有收益率=-133.20 / -11.84%', () => {
    const r = parseCmbFundOcrText(CMB_FUND_HOLDING);
    const it = r.items[0];
    expect(it.productName).toContain('南方有色金属');
    expect(it.productName).toContain('ETF联接');
    // 顶部「总金额 29.52」是昨日收益汇总，不能串到 holdingProfit
    expect(it.dailyProfit).toBeCloseTo(29.52, 2);
    // holdingProfit / holdingProfitRate 必须分别取自「持有收益率 -133.20 / -11.84%」
    expect(it.holdingProfit).toBeCloseTo(-133.2, 2);
    expect(it.holdingProfitRate).toBeCloseTo(-11.84, 2);
  });

  it('toFundPrefills 生成 FUND 类型，市值/收益/收益率正确透传', () => {
    const r = parseCmbFundOcrText(CMB_FUND_HOLDING);
    const prefills = toFundPrefills(r, 'acc_cmb_fund');
    expect(prefills.length).toBe(1);
    expect(prefills[0].holdingType).toBe(HoldingType.FUND);
    expect(prefills[0].accountId).toBe('acc_cmb_fund');
    // marketValue 必须来自卡片「金额 991.80」，而非顶部「总金额 29.52」
    expect(prefills[0].marketValue).toBeCloseTo(991.8, 2);
    expect(prefills[0].dailyProfit).toBeCloseTo(29.52, 2);
    expect(prefills[0].holdingProfit).toBeCloseTo(-133.2, 2);
    expect(prefills[0].holdingProfitRate).toBeCloseTo(-11.84, 2);
    expect(prefills[0].fundName).toContain('南方有色金属');
  });
});

// ==================== Bug④ 招行基金「详情页」识别增强 ====================
// 合成样本（非真实持仓）：持有份额 / 当前净值 / 成本净值 / 基金代码 / 名称。

const CMB_FUND_DETAIL = [
  '示例ETF联接基金A',
  '基金代码 123456',
  '持有份额 1234.56 份',
  '当前净值 1.2345',
  '成本净值 1.0987',
  '持仓市值 1523.45',
  '昨日收益 12.34',
  '持有收益 -45.67',
  '持有收益率 -2.99%',
].join('\n');

// 列表页变体：单只卡片含「净值估算」+ 6 位代码 + 基金名（无 持有份额/当前净值/成本净值）。
// 用于守护 isCmbFundDetailPage 不把列表页误判为详情页（否则会贪心抓顶部「总金额」）。
const CMB_FUND_LIST_WITH_ESTIMATE = [
  '示例ETF联接基金A',
  '基金代码 123456',
  '金额 991.80',
  '净值估算 1.2345',
  '昨日收益 29.52',
  '持有收益率 -11.84%',
].join('\n');

// 列表页变体：单只卡片含「单位净值」+ 6 位代码 + 基金名（无 持有份额/成本净值/当前净值）。
// 守护「单位净值」单独不作为闸门放行（其也可能出现在列表页卡片）。
const CMB_FUND_LIST_WITH_UNIT_NAV = [
  '示例ETF联接基金A',
  '基金代码 123456',
  '金额 991.80',
  '单位净值 1.2345',
  '昨日收益 29.52',
  '持有收益率 -11.84%',
].join('\n');

describe('isCmbFundDetailPage', () => {
  it('详情页（含持有份额/当前净值 + 代码）命中', () => {
    expect(isCmbFundDetailPage(CMB_FUND_DETAIL)).toBe(true);
  });
  it('列表页（CMB_FUND_HOLDING）不误判为详情页', () => {
    expect(isCmbFundDetailPage(CMB_FUND_HOLDING)).toBe(false);
  });
  it('列表页变体（含「净值估算」+代码，无持有份额/当前净值）不误判为详情页', () => {
    expect(isCmbFundDetailPage(CMB_FUND_LIST_WITH_ESTIMATE)).toBe(false);
  });
  it('列表页变体（含「单位净值」+代码，无持有份额/当前净值/成本净值）不误判为详情页', () => {
    expect(isCmbFundDetailPage(CMB_FUND_LIST_WITH_UNIT_NAV)).toBe(false);
  });
});

describe('parseCmbFundDetailOcrText — 招行基金详情页', () => {
  it('识别 持有份额 / 当前净值 / 成本净值 / 代码 / 名称', () => {
    const r = parseCmbFundDetailOcrText(CMB_FUND_DETAIL);
    expect(r.items.length).toBe(1);
    const it = r.items[0];
    expect(it.fundCode).toBe('123456');
    expect(it.productName).toContain('示例ETF');
    expect(it.productName).toContain('ETF联接');
    expect(it.shares).toBeCloseTo(1234.56, 2);
    expect(it.currentPrice).toBeCloseTo(1.2345, 4);
    expect(it.costPrice).toBeCloseTo(1.0987, 4);
  });

  it('best-effort 金额/收益字段仍可用', () => {
    const r = parseCmbFundDetailOcrText(CMB_FUND_DETAIL);
    const it = r.items[0];
    expect(it.marketValue).toBeCloseTo(1523.45, 2);
    expect(it.dailyProfit).toBeCloseTo(12.34, 2);
    expect(it.holdingProfit).toBeCloseTo(-45.67, 2);
    expect(it.holdingProfitRate).toBeCloseTo(-2.99, 2);
  });
});

describe('toFundPrefills — 详情页 shares/costPrice/currentPrice 映射', () => {
  it('将详情页三字段透传到 FUND DTO', () => {
    const r = parseCmbFundDetailOcrText(CMB_FUND_DETAIL);
    const prefills = toFundPrefills(r, 'acc_cmb_fund');
    expect(prefills.length).toBe(1);
    expect(prefills[0].holdingType).toBe(HoldingType.FUND);
    expect(prefills[0].fundCode).toBe('123456');
    expect(prefills[0].shares).toBeCloseTo(1234.56, 2);
    expect(prefills[0].costPrice).toBeCloseTo(1.0987, 4);
    expect(prefills[0].currentPrice).toBeCloseTo(1.2345, 4);
  });
});

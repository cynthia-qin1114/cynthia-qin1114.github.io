/**
 * goldOcrParser.test.ts — 需求④ 招行黄金 OCR 解析器单元测试
 *
 * 覆盖：
 * - parseCmbGoldOcrText：克重/市值/收益/金价参考/产品名 容错解析
 * - toGoldPrefills：GOLD 类型映射（shares=克重、currentPrice=金价参考）+ accountId 注入
 * - parseAssetDistributionOcrText.goldAmount：资产分布里的「黄金」金额识别
 */

import { describe, it, expect } from 'vitest';
import {
  parseCmbGoldOcrText,
  toGoldPrefills,
  parseAssetDistributionOcrText,
} from './wealthOcrParser';
import { HoldingType } from '../types';

// 招行黄金专区近似文案（含汉字间空格噪声，模拟 Tesseract 输出）
const goldText = [
  '黄金专区',
  '招银黄金积存金',
  '持有克重 12.34 克',
  '持仓市值 5,800.00',
  '持有收益 +320.50',
  '金价 470.00 元/克',
].join('\n');

describe('parseCmbGoldOcrText', () => {
  it('识别克重（含「克」单位）', () => {
    const r = parseCmbGoldOcrText(goldText);
    expect(r.items[0].grams).toBeCloseTo(12.34, 4);
  });

  it('识别市值（千分位）', () => {
    const r = parseCmbGoldOcrText(goldText);
    expect(r.items[0].marketValue).toBeCloseTo(5800, 2);
  });

  it('识别持有收益（带正号）', () => {
    const r = parseCmbGoldOcrText(goldText);
    expect(r.items[0].holdingProfit).toBeCloseTo(320.5, 2);
  });

  it('识别金价参考（元/克）', () => {
    const r = parseCmbGoldOcrText(goldText);
    expect(r.items[0].goldPriceRef).toBeCloseTo(470, 2);
  });

  it('识别产品名（含「黄金」短语）', () => {
    const r = parseCmbGoldOcrText(goldText);
    expect(r.items[0].productName).toContain('黄金');
  });

  it('空输入不抛异常，返回单条空 items', () => {
    const r = parseCmbGoldOcrText('');
    expect(Array.isArray(r.items)).toBe(true);
    expect(r.items.length).toBe(1);
    expect(r.items[0].grams).toBeUndefined();
  });

  it('识别不到克重时返回 undefined（不误把市值当克重）', () => {
    const r = parseCmbGoldOcrText('持仓市值 5,800.00\n金价 470.00');
    expect(r.items[0].grams).toBeUndefined();
    expect(r.items[0].marketValue).toBeCloseTo(5800, 2);
  });
});

describe('toGoldPrefills', () => {
  it('映射 GOLD 类型，shares=克重，currentPrice=金价参考', () => {
    const parsed = parseCmbGoldOcrText(goldText);
    const prefills = toGoldPrefills(parsed, 'acc_cmb');
    expect(prefills.length).toBe(1);
    const p = prefills[0];
    expect(p.holdingType).toBe(HoldingType.GOLD);
    expect(p.accountId).toBe('acc_cmb');
    expect(p.shares).toBeCloseTo(12.34, 4);
    expect(p.currentPrice).toBeCloseTo(470, 2);
    expect(p.marketValue).toBeCloseTo(5800, 2);
    expect(p.holdingProfit).toBeCloseTo(320.5, 2);
  });

  it('金价参考缺失时 currentPrice 为 undefined（不污染库）', () => {
    const parsed = parseCmbGoldOcrText('招银黄金积存金\n持有克重 10 克\n持仓市值 4,700.00');
    const prefills = toGoldPrefills(parsed, 'acc_cmb');
    expect(prefills[0].currentPrice).toBeUndefined();
    expect(prefills[0].shares).toBeCloseTo(10, 4);
  });
});

describe('parseAssetDistributionOcrText.goldAmount', () => {
  it('资产分布里的「黄金市值」被单独识别', () => {
    const text = [
      '总资产 200,000.00',
      '理财 100,000.00',
      '黄金市值 50,000.00',
      '活期 50,000.00',
    ].join('\n');
    const r = parseAssetDistributionOcrText(text);
    expect(r.goldAmount).toBeCloseTo(50000, 2);
  });

  it('无黄金字段时 goldAmount 为 undefined', () => {
    const r = parseAssetDistributionOcrText('总资产 100.00\n理财 100.00');
    expect(r.goldAmount).toBeUndefined();
  });
});

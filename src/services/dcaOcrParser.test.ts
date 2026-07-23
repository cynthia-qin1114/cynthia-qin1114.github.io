/**
 * dcaOcrParser.test.ts — 聪明定投 OCR 文本解析 + 预填映射（需求⑤ DCA T03）
 *
 * 纯函数测试（Node 环境，无需 Dexie）。复用既有真实导出
 * normalizeOcrText / parseCnyAmount，覆盖六项字段解析与 toDcaPrefill 映射。
 */

import { describe, it, expect } from 'vitest';
import { parseDcaOcrText, toDcaPrefill } from './dcaOcrParser';
import { DcaFrequency } from '../types';

const SAMPLE = `智能定投计划
对标指数：沪深300
对标均线：250日均线
基准金额：¥500.00
每期扣款：500
扣款间隔：每月
下一扣款日：2024-05-01
已投期数：12`;

describe('parseDcaOcrText', () => {
  it('解析聪明定投截图六项字段', () => {
    const r = parseDcaOcrText(SAMPLE);
    expect(r.amount).toBe(500);
    expect(r.benchmarkIndex).toBe('沪深300');
    expect(r.benchmarkMa).toBe('250日均线');
    expect(r.frequency).toBe(DcaFrequency.MONTHLY);
    expect(r.nextDeductionDate).toBe('2024-05-01');
    expect(r.investedPeriods).toBe(12);
  });

  it('识别不到时相关字段返回 undefined（兜底留空）', () => {
    const r = parseDcaOcrText('这是一段无关文字，没有任何定投关键词。');
    expect(r.amount).toBeUndefined();
    expect(r.benchmarkIndex).toBeUndefined();
    expect(r.benchmarkMa).toBeUndefined();
    expect(r.frequency).toBeUndefined();
    expect(r.nextDeductionDate).toBeUndefined();
    expect(r.investedPeriods).toBeUndefined();
    // raw 为规范化后的原文
    expect(r.raw).toContain('这是一段无关文字');
  });

  it('频率归一：每天/每周/每月', () => {
    expect(parseDcaOcrText('扣款频率：每天').frequency).toBe(DcaFrequency.DAILY);
    expect(parseDcaOcrText('扣款频率：每周').frequency).toBe(DcaFrequency.WEEKLY);
    expect(parseDcaOcrText('扣款频率：每月').frequency).toBe(DcaFrequency.MONTHLY);
  });

  it('normalizeOcrText 容错：汉字间空格被去除后关键词仍可命中', () => {
    const messy = '基 准 金 额 ： ¥ 300 .00';
    expect(parseDcaOcrText(messy).amount).toBe(300);
  });

  it('金额支持万元换算', () => {
    const r = parseDcaOcrText('基准金额：1.5万');
    expect(r.amount).toBe(15000);
  });
});

describe('toDcaPrefill', () => {
  it('仅映射识别到的字段，无法从截图获得的字段不出现', () => {
    const r = parseDcaOcrText(SAMPLE);
    const prefill = toDcaPrefill(r);
    expect(prefill.amount).toBe(500);
    expect(prefill.frequency).toBe(DcaFrequency.MONTHLY);
    expect(prefill.benchmarkIndex).toBe('沪深300');
    expect(prefill.benchmarkMa).toBe('250日均线');
    expect(prefill.nextDeductionDate).toBe('2024-05-01');
    expect(prefill.investedPeriods).toBe(12);
    // 截图无法提供的字段：留待用户在表单选择
    expect(prefill.type).toBeUndefined();
    expect(prefill.accountId).toBeUndefined();
    expect(prefill.targetInvestmentId).toBeUndefined();
  });

  it('全部未识别时返回空对象', () => {
    const r = parseDcaOcrText('无关');
    const prefill = toDcaPrefill(r);
    expect(Object.keys(prefill).length).toBe(0);
  });
});

/**
 * dcaOcrParser — 聪明定投截图文本解析器
 *
 * 复用既有真实导出 `normalizeOcrText` / `parseCnyAmount`（来自 wealthOcrParser，
 * 注意并非 PRD 误写的 normalizeOcrAmount），解析定投截图中的：
 *   ① 基准金额 ② 对标指数 ③ 对标均线 ④ 扣款间隔 ⑤ 下一扣款日 ⑥ 已投期数
 * 并提供 `toDcaPrefill` 映射为 Partial<CreateDcaPlanDTO>（未识别字段留空）。
 */

import { normalizeOcrText, parseCnyAmount } from './wealthOcrParser';
import type { DcaOcrParseResult, CreateDcaPlanDTO } from '../types';
import { DcaFrequency } from '../types';

// ==================== 共享工具（对齐 wealthOcrParser 风格） ====================

/** 关键词后就近取金额（支持万元/正负/千分位），复用 parseCnyAmount。 */
function matchAmountAfterKeyword(
  text: string,
  keywords: string[],
  opts?: { max?: number; allowZero?: boolean },
): number | undefined {
  for (const kw of keywords) {
    const pattern = new RegExp(
      `${kw}[^0-9+\\-－—¥￥]{0,8}([+\\-－—]?\\s*[¥￥]?\\s*[0-9][0-9,]*(?:\\.[0-9]+)?\\s*(?:万元|万)?)`,
    );
    const match = text.match(pattern);
    if (match) {
      const value = parseCnyAmount(match[1]);
      if (value === undefined || Number.isNaN(value)) continue;
      if (!opts?.allowZero && value === 0) continue;
      if (opts?.max !== undefined && Math.abs(value) > opts.max) continue;
      return value;
    }
  }
  return undefined;
}

/** 关键词后就近取一段文本（如对标指数名 / 均线名）。 */
function matchTextAfterKeyword(text: string, keywords: string[], maxLen = 12): string | undefined {
  for (const kw of keywords) {
    const pattern = new RegExp(`${kw}[\\s:：]*([\\u4e00-\\u9fa5A-Za-z0-9.\\-]{1,${maxLen}})`);
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/** 解析扣款频率（每天/每周/每月 归一）。 */
function parseFrequency(text: string): DcaFrequency | undefined {
  if (/每天|每日|日定投|日扣/.test(text)) return DcaFrequency.DAILY;
  if (/每周|周定投|周扣/.test(text)) return DcaFrequency.WEEKLY;
  if (/每月|月定投|月度|月扣/.test(text)) return DcaFrequency.MONTHLY;
  return undefined;
}

/** 关键词后就近取日期（YYYY-MM-DD / YYYY/MM/DD）。 */
function matchDateAfterKeyword(text: string, keywords: string[]): string | undefined {
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx === -1) continue;
    const tail = text.slice(idx + kw.length);
    const m = tail.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      const date = new Date(y, mo - 1, d);
      if (!Number.isNaN(date.getTime())) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return undefined;
}

/** 关键词后就近取整数（已投期数）。 */
function matchIntAfterKeyword(text: string, keywords: string[]): number | undefined {
  for (const kw of keywords) {
    const pattern = new RegExp(`${kw}[\\s:：]*(\\d+)`);
    const match = text.match(pattern);
    if (match) {
      const v = parseInt(match[1], 10);
      if (!Number.isNaN(v)) return v;
    }
  }
  return undefined;
}

// ==================== 解析主入口 ====================

/**
 * 解析聪明定投 OCR 文本。
 * 任一字段未识别则留 undefined，由 UI 提示用户手填（兜底策略）。
 */
export function parseDcaOcrText(text: string): DcaOcrParseResult {
  const raw = normalizeOcrText(text ?? '');

  const amount = matchAmountAfterKeyword(raw, [
    '基准金额', '定投金额', '每期扣款', '扣款金额', '定投',
  ]);
  const benchmarkIndex = matchTextAfterKeyword(raw, [
    '对标指数', '跟踪指数', '指数',
  ], 16);
  const benchmarkMa = matchTextAfterKeyword(raw, [
    '对标均线', '250日均线', '60日均线', '20日均线', '均线', 'MA',
  ], 12);
  const frequency = parseFrequency(raw);
  const nextDeductionDate = matchDateAfterKeyword(raw, [
    '下一扣款日', '下次扣款', '下期扣款', '扣款日',
  ]);
  const investedPeriods = matchIntAfterKeyword(raw, [
    '已投期数', '已投期', '定投期数', '期数',
  ]);

  return {
    amount,
    benchmarkIndex,
    benchmarkMa,
    frequency,
    nextDeductionDate,
    investedPeriods,
    raw,
  };
}

/**
 * 把解析结果映射为 Partial<CreateDcaPlanDTO>（仅包含识别到的字段）。
 * type / targetInvestmentId / accountId 等无法从截图获得，留待用户在表单选择。
 */
export function toDcaPrefill(result: DcaOcrParseResult): Partial<CreateDcaPlanDTO> {
  const prefill: Partial<CreateDcaPlanDTO> = {};
  if (result.amount !== undefined) prefill.amount = result.amount;
  if (result.frequency !== undefined) prefill.frequency = result.frequency;
  if (result.benchmarkIndex) prefill.benchmarkIndex = result.benchmarkIndex;
  if (result.benchmarkMa) prefill.benchmarkMa = result.benchmarkMa;
  if (result.nextDeductionDate) prefill.nextDeductionDate = result.nextDeductionDate;
  if (result.investedPeriods !== undefined) prefill.investedPeriods = result.investedPeriods;
  return prefill;
}

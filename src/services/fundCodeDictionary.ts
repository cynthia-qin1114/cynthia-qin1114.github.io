import { HoldingType } from '../types';
import type { Investment, CreateInvestmentDTO } from '../types';
import { useInvestmentStore } from '../store/useInvestmentStore';

/**
 * 基金名 ↔ 代码 字典
 *
 * 解决「基金持仓截图（招行/支付宝）识别不到 6 位基金代码 → 用户录入时仍需手填」的痛点：
 * 1. 内置 SEED（用户真实持有的基金 + 常用宽基/明星基金），覆盖绝大多数日常录入场景；
 * 2. 自动从本地持仓（IndexedDB）构建「用户字典」——你一旦手填过某支基金代码，
 *    以后任何 OCR / 录入都能自动带出，越用越准（自增长，零维护）；
 * 3. OCR 预填阶段用 resolveFundCodesInPrefills 补码；录入表单用 Autocomplete 搜索带码。
 *
 * 注意：名称匹配走归一化（去空格 / 统一半角括号 / 大小写），并支持「双向包含」兜底
 * （如 OCR 吞掉「E」「C」类份额字母仍能命中）。
 */

export interface FundCodeEntry {
  /** 6 位基金代码 */
  code: string;
  /** 基金名（与 OCR / 用户输入对齐的规范名） */
  name: string;
}

/**
 * 种子字典。
 * - 上半部：用户真实持有的基金（代码经多源核对，2026-08-06）。
 * - 下半部：常用宽基 ETF / 明星主动基金，方便快速录入与搜索补全。
 */
export const SEED_FUND_DICTIONARY: FundCodeEntry[] = [
  // —— 用户真实持仓（招行/支付宝/中信 OCR 样本命中）——
  { code: '010990', name: '南方有色金属ETF联接E' },
  { code: '019873', name: '长城短债债券E' },
  { code: '539001', name: '建信纳斯达克100指数(QDII)A' },
  { code: '005693', name: '广发中证军工ETF联接C' },
  { code: '013841', name: '银华集成电路混合C' },
  { code: '011036', name: '嘉实中证稀土产业ETF联接C' },
  { code: '011609', name: '易方达科创50联接C' },
  { code: '011611', name: '华泰柏瑞科创50联接C' },
  { code: '006479', name: '广发纳指100ETF联接(QDII)' },
  { code: '025857', name: '华夏中证电网设备主题ETF发起式' },
  // —— 常用宽基 / 明星基金（高置信度，便于搜索补全）——
  { code: '510300', name: '华泰柏瑞沪深300ETF' },
  { code: '510310', name: '易方达沪深300ETF发起式联接A' },
  { code: '510500', name: '南方中证500ETF' },
  { code: '159915', name: '易方达创业板ETF' },
  { code: '588000', name: '华夏上证科创板50ETF' },
  { code: '161725', name: '招商中证白酒指数(LOF)A' },
  { code: '005827', name: '易方达蓝筹精选混合' },
  { code: '003095', name: '中欧医疗健康混合A' },
  { code: '110022', name: '易方达消费行业股票' },
  { code: '000198', name: '天弘余额宝货币' },
];

/**
 * 归一化基金名用于匹配：统一半角括号、去空格、ASCII 转大写（ETF/QDII）。
 */
export function normalizeFundNameKey(name: string): string {
  if (!name) return '';
  return name
    .replace(/（/g, '(') // 全角左括号 → 半角
    .replace(/）/g, ')') // 全角右括号 → 半角
    .replace(/[\s　]+/g, '') // 去所有空白（含全角空格）
    .toUpperCase(); // ASCII 大小写统一（ETF / QDII）
}

/**
 * 从持仓列表构建「用户字典」（FUND 且有代码）。
 * 同一代码保留一条，以持仓名为准。
 */
export function buildUserFundEntries(investments: Investment[]): FundCodeEntry[] {
  const map = new Map<string, FundCodeEntry>();
  for (const inv of investments) {
    const code = inv.fundCode?.trim();
    const name = inv.fundName?.trim();
    if (
      inv.holdingType === HoldingType.FUND &&
      code &&
      name
    ) {
      map.set(code, { code, name });
    }
  }
  return Array.from(map.values());
}

/**
 * 合并种子表与用户字典：用户字典按 code 覆盖种子（用户手填优先）。
 */
export function combineFundEntries(userEntries: FundCodeEntry[] = []): FundCodeEntry[] {
  const merged = new Map<string, FundCodeEntry>();
  for (const e of SEED_FUND_DICTIONARY) merged.set(e.code, e);
  for (const e of userEntries) merged.set(e.code, e);
  return Array.from(merged.values());
}

/**
 * 按基金名查代码。
 * 先精确（归一化相等），再双向包含兜底（处理 OCR 吞掉份额字母 E/C 等情况）。
 * @returns 6 位代码或 null
 */
export function lookupFundCode(name: string, extra: FundCodeEntry[] = []): string | null {
  const key = normalizeFundNameKey(name);
  if (!key) return null;
  const all = [...extra, ...SEED_FUND_DICTIONARY];
  // 精确匹配
  const exact = all.find((e) => normalizeFundNameKey(e.name) === key);
  if (exact) return exact.code;
  // 双向包含兜底
  const fuzzy = all.find((e) => {
    const ek = normalizeFundNameKey(e.name);
    return ek.includes(key) || key.includes(ek);
  });
  return fuzzy ? fuzzy.code : null;
}

/**
 * 给 FUND 类型预填补代码：仅当该条缺失 fundCode 且能从名称查到时补上。
 * WEALTH/CASH/GOLD 及其它类型原样返回。
 */
export function resolveFundCodesInPrefills(
  prefills: Partial<CreateInvestmentDTO>[],
  extra: FundCodeEntry[] = [],
): Partial<CreateInvestmentDTO>[] {
  return prefills.map((p) => {
    if (p.holdingType !== HoldingType.FUND) return p;
    if (p.fundCode && p.fundCode.trim()) return p;
    const code = lookupFundCode(p.fundName ?? '', extra);
    return code ? { ...p, fundCode: code } : p;
  });
}

/**
 * 直接从全局持仓 store 取用户字典（供 OCR 补码 / 表单补全调用）。
 */
export function getUserFundEntries(): FundCodeEntry[] {
  try {
    return buildUserFundEntries(useInvestmentStore.getState().investments);
  } catch {
    return [];
  }
}

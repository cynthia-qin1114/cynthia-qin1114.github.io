/**
 * 应用常量定义
 * 包含账户类型、交易类型、分类列表等全局常量
 */

import { HoldingType, DcaPlanType, DcaFrequency, DcaDeductionMode } from '../types';

// ==================== 枚举值 ====================

/** 账户类型 */
export const AccountType = {
  BANK_DEBIT: 'BANK_DEBIT',
  BANK_CREDIT: 'BANK_CREDIT',
  ALIPAY: 'ALIPAY',
  WECHAT: 'WECHAT',
  CASH: 'CASH',
  OTHER: 'OTHER',
} as const;

export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType];

/** 交易类型 */
export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

/** 分类类型 */
export const CategoryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type CategoryTypeValue = (typeof CategoryType)[keyof typeof CategoryType];

/** 平台匹配类型 */
export const MatchType = {
  EXACT: 'EXACT',
  FUZZY: 'FUZZY',
} as const;

export type MatchTypeValue = (typeof MatchType)[keyof typeof MatchType];

// ==================== 标签映射 ====================

/** 账户类型标签映射 */
export const AccountTypeLabels: Record<string, string> = {
  BANK_DEBIT: '银行卡(借记)',
  BANK_CREDIT: '信用卡',
  ALIPAY: '支付宝',
  WECHAT: '微信',
  CASH: '现金',
  OTHER: '其他',
};

/** 账户类型图标映射 */
export const AccountTypeIcons: Record<string, string> = {
  BANK_DEBIT: '💳',
  BANK_CREDIT: '💳',
  ALIPAY: '💰',
  WECHAT: '💬',
  CASH: '💵',
  OTHER: '📦',
};

/** 交易类型标签映射 */
export const TransactionTypeLabels: Record<string, string> = {
  INCOME: '收入',
  EXPENSE: '支出',
  TRANSFER: '转账',
};

/** 交易类型颜色映射 */
export const TransactionTypeColors: Record<string, string> = {
  INCOME: '#4CAF50',
  EXPENSE: '#F44336',
  TRANSFER: '#FF9800',
};

// ==================== 色彩常量 ====================

/**
 * 暗色科技风配色（深海军蓝底 + 霓虹青光晕 + 玻璃拟态）
 * - PRIMARY 保持科技蓝 #2563EB；新增 CYAN 霓虹青 #06B6D4。
 * - BACKGROUND 深空底 #0B1120；SURFACE 玻璃面 #1E293B。
 * - TEXT_* 与 DIVIDER 调为暗底高对比度。
 */
export const COLORS = {
  PRIMARY: '#2563EB',
  CYAN: '#06B6D4',
  PRIMARY_LIGHT: '#60A5FA',
  PRIMARY_DARK: '#1D4ED8',
  INCOME: '#4CAF50',
  EXPENSE: '#F44336',
  INVEST: '#FF9800',
  BACKGROUND: '#0B1120',
  SURFACE: '#1E293B',
  TEXT_PRIMARY: '#F1F5F9',
  TEXT_SECONDARY: '#94A3B8',
  DIVIDER: 'rgba(148,163,184,0.12)',
} as const;

// ==================== 资产类别分组 ====================

/** 资产类别分组固定顺序（投资列表分组、向导确认均按此序） */
export const CATEGORY_GROUP_ORDER: HoldingType[] = [
  HoldingType.FUND,
  HoldingType.WEALTH,
  HoldingType.GOLD,
  HoldingType.CASH,
];

/**
 * 持仓类型中文标签（卡片徽章 / 分组标题 / 表单 Toggle 统一引用）。
 * 注：CASH 标签取「现金（活期）」为分组标题专用，明确不计入投资市值。
 */
export const HoldingTypeLabels: Record<HoldingType, string> = {
  FUND: '基金',
  WEALTH: '理财',
  GOLD: '黄金',
  CASH: '现金（活期）',
};

/** 分组视觉色（与 COLORS 对齐；GOLD 走黄金/橙金系，CASH 走中性灰非收益色） */
export const CATEGORY_COLORS: Partial<Record<HoldingType, string>> = {
  GOLD: '#FFB300',
  CASH: '#9E9E9E',
};

// ==================== 需求④ 招行黄金 ====================

/** 黄金 ETF 标的（华安黄金 ETF，天天基金代码；金价代理源） */
export const GOLD_GOLD_CODE = '518880';
/** 黄金 ETF 净值 → 元/克 近似换算因子（1 份≈0.01g，近似，P1 可校准） */
export const GOLD_ETF_TO_GRAM_FACTOR = 100;
/** 金价缓存 TTL（毫秒） */
export const GOLD_PRICE_TTL = 5 * 60 * 1000;
/** 金价本地缓存 key（localStorage） */
export const GOLD_PRICE_CACHE_KEY = 'goldPriceCache';

// ==================== 应用配置 ====================

/** 应用名称 */
export const APP_NAME = '智能记账';

/** 默认货币 */
export const DEFAULT_CURRENCY = 'CNY';

/** 货币符号 */
export const CURRENCY_SYMBOL = '¥';

/** 基金API地址 (天天基金 JSONP) */
export const FUND_API_URL = 'http://fundgz.1234567.com.cn/js/{code}.js';

/** CORS代理地址列表（按优先级排序） */
export const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://proxy.cors.sh/',
];

/** 默认CORS代理 */
export const DEFAULT_CORS_PROXY = CORS_PROXIES[0];

/** 图表颜色列表（彩虹色，保留兼容旧引用） */
export const CHART_COLORS = [
  '#1976D2', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
  '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
  '#8BC34A', '#CDDC39', '#FFC107', '#FF5722', '#673AB7',
];

/**
 * 暗底高亮色板（霓虹蓝/青/teal/紫/粉，暗底对比强）。
 * 用于占比类图表，避免在深海军蓝底上发暗。
 */
export const CHART_TECH_COLORS = [
  '#38BDF8', '#22D3EE', '#2DD4BF', '#818CF8', '#A78BFA',
  '#34D399', '#60A5FA', '#06B6D4', '#C084FC', '#F472B6',
  '#4ADE80', '#5EEAD4', '#93C5FD', '#FBBF24',
];

/** 最近交易显示数量 */
export const RECENT_TRANSACTION_LIMIT = 10;

/** 报表趋势月份数 */
export const TREND_MONTH_COUNT = 6;

/** 金额小数位数 */
export const AMOUNT_DECIMALS = 2;

/** 页面路径 */
export const ROUTES = {
  OVERVIEW: '/',
  RECORD: '/record',
  INVEST: '/invest',
  REPORT: '/report',
  SETTINGS: '/settings',
  DCA: '/invest/dca',
} as const;

// ==================== 需求⑤ 定投计划（DCA）标签与规则 ====================

/** 定投计划类型标签 */
export const DcaPlanTypeLabels: Record<DcaPlanType, string> = {
  SMART: '聪明定投',
  FIXED: '定额定投',
};

/** 扣款频率标签 */
export const DcaFrequencyLabels: Record<DcaFrequency, string> = {
  DAILY: '每天',
  WEEKLY: '每周',
  MONTHLY: '每月',
};

/** 扣款模式标签 */
export const DcaDeductionModeLabels: Record<DcaDeductionMode, string> = {
  AUTO: '自动扣款',
  MANUAL_CONFIRM: '手动确认',
};

/** 扣款率规则表行（P1-1 静态展示，不计算） */
export interface DeductionRuleRow {
  ma: string; // 对标均线
  belowMa: string; // 指数低于均线时
  aboveMa: string; // 指数高于均线时
}

/**
 * 聪明定投扣款率规则表（P1-1）。
 * 本期（Q3）固定用基准金额扣款，规则表仅作静态展示，动态缩放为 P2-1。
 */
export const DEDUCTION_RULE_TABLE: DeductionRuleRow[] = [
  { ma: '250日均线', belowMa: '基准金额 × 1.5', aboveMa: '基准金额 × 0.5' },
  { ma: '60日均线', belowMa: '基准金额 × 1.3', aboveMa: '基准金额 × 0.7' },
  { ma: '20日均线', belowMa: '基准金额 × 1.2', aboveMa: '基准金额 × 0.8' },
];

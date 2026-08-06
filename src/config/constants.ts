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

/** 交易类型颜色映射（暖色和谐） */
export const TransactionTypeColors: Record<string, string> = {
  INCOME: '#2E7D52',
  EXPENSE: '#B23A2E',
  TRANSFER: '#A6782F',
};

// ==================== 色彩常量 ====================

/**
 * 暖光纸感·私人银行配色（暖纸底 + 深墨字 + 哑光黄铜金）
 * - 放弃深色霓虹/玻璃拟态；改用 warm paper 底 + 墨色文字 + 黄铜金强调。
 * - PRIMARY/BRASS 哑光黄铜金（品牌主色）；INCOME 沉静祖母绿；EXPENSE 陶土砖红；
 *   INVEST 投资金。均为低饱和、暖调，避免霓虹感。
 */
export const COLORS = {
  PRIMARY: '#9C6B2E', // 哑光黄铜金（品牌主色）
  BRASS: '#B8894A', // 亮黄铜（强调/点缀）
  PRIMARY_LIGHT: '#B8894A',
  PRIMARY_DARK: '#7E561F',
  INCOME: '#2E7D52', // 沉静祖母绿（收益 +）
  EXPENSE: '#B23A2E', // 陶土砖红（支出 / 亏损 -）
  INVEST: '#A6782F', // 投资金（财富类）
  GOLD: '#C8902A', // 黄金类强调
  BACKGROUND: '#F2EDE3', // 暖纸底
  SURFACE: '#FCFAF5', // 暖白卡片面
  TEXT_PRIMARY: '#211F1A', // 暖墨（近黑）
  TEXT_SECONDARY: '#6E685C', // 暖灰
  DIVIDER: 'rgba(33,31,26,0.10)', // 暖色发丝分隔线
} as const;

/** 展示用衬线字体栈（大金额/标题签名感；离线回退 Georgia / 宋体） */
export const SERIF_FONT =
  '"Fraunces", "Georgia", "Songti SC", "Noto Serif SC", "STSong", serif';

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

/** 分组视觉色（暖调：GOLD 黄金系，CASH 暖中性灰非收益色） */
export const CATEGORY_COLORS: Partial<Record<HoldingType, string>> = {
  GOLD: '#C8902A',
  CASH: '#8A8478',
};

// ==================== CASH（活期）展示与写库 ====================

/** CASH 写库幂等键默认值（与 investmentRepository 现有字面量一致） */
export const DEFAULT_CASH_NAME = '活期存款';
/** CASH 界面中性展示文案（替代产品名） */
export const CASH_DISPLAY_LABEL = '活期';

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

/** 图表颜色列表（暖色和谐板，保留兼容旧引用） */
export const CHART_COLORS = [
  '#9C6B2E', '#5B7B5A', '#B5532F', '#C8902A', '#5B7286',
  '#8A5A6B', '#4E7E73', '#A6782F', '#7E6B9C', '#3F5161',
  '#6E8B6E', '#C2703F', '#5E7E8A', '#9C5A4A', '#B8894A',
];

/**
 * 暖色和谐色板（哑光黄铜/鼠尾草绿/陶土/赭石/灰蓝/梅紫…）。
 * 用于占比类图表，在暖纸底上温和可读、彼此区分度高、不刺眼。
 */
export const CHART_TECH_COLORS = [
  '#9C6B2E', '#5B7B5A', '#B5532F', '#C8902A', '#5B7286',
  '#8A5A6B', '#4E7E73', '#A6782F', '#7E6B9C', '#B8894A',
  '#6E8B6E', '#C2703F', '#5E7E8A', '#9C5A4A',
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

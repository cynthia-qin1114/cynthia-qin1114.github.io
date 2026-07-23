/**
 * 需求④ 黄金类型定义
 * GOLD 持仓：shares 复用为「克重(g)」，currentPrice 复用为「元/克」金价。
 */

/** 金价源：方案 A 默认黄金 ETF 净值代理；P1 预留方案 B 外部 API */
export enum GoldPriceSource {
  AUTO_ETF = 'AUTO_ETF',
}

/** GOLD 市值更新策略 */
export enum GoldRecalcStrategy {
  /** 仅展示参考金价，不动持仓市值 */
  REFERENCE_ONLY = 'REFERENCE_ONLY',
  /** 按克重 × 金价重算持仓市值 */
  REVALUE = 'REVALUE',
}

/** 金价（元/克）快照 */
export interface GoldPrice {
  price: number; // 元/克
  source: string; // 来源描述
  updatedAt: string; // ISO 时间戳
}

/** 金价源标签 */
export const GoldPriceSourceLabels: Record<GoldPriceSource, string> = {
  AUTO_ETF: '黄金ETF净值(近似)',
};

/** 市值更新策略标签 */
export const GoldRecalcStrategyLabels: Record<GoldRecalcStrategy, string> = {
  REFERENCE_ONLY: '仅展示参考',
  REVALUE: '按克重×金价重算',
};

/**
 * 需求⑤ 基金定投计划（DCA Plan）类型定义
 *
 * 仅描述本次新增的两个实体与配套枚举 / DTO，由 `src/types/index.ts`
 * 通过 `export * from './dca'` 统一汇出。
 */

// ==================== 枚举 ====================

/** 定投计划类型：聪明定投（对标均线动态） / 定额定投 */
export enum DcaPlanType {
  SMART = 'SMART',
  FIXED = 'FIXED',
}

/** 扣款频率 */
export enum DcaFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

/** 扣款模式：默认 AUTO（本地自动入账，不碰真实资金）；MANUAL_CONFIRM 为后续预留 */
export enum DcaDeductionMode {
  AUTO = 'AUTO',
  MANUAL_CONFIRM = 'MANUAL_CONFIRM',
}

// ==================== 数据模型 ====================

/** 定投计划 */
export interface DcaPlan {
  id: string; // PK
  type: DcaPlanType; // SMART | FIXED
  accountId: string; // FK → Account.id（目标持仓归属账户）
  targetInvestmentId: string; // FK → Investment.id（目标 FUND 持仓，扣款落点；建档时确定）
  fundCode: string; // 冗余展示 + 兜底匹配（手填/无 targetInvestmentId 时按 accountId+fundCode 找）
  fundName: string; // 冗余展示
  amount: number; // 本期扣款额（元）；SMART 即「基准金额」
  frequency: DcaFrequency; // DAILY | WEEKLY | MONTHLY
  nextDeductionDate: string; // ISO 日期 'YYYY-MM-DD'
  enabled: boolean;
  deductionMode: DcaDeductionMode; // 默认 'AUTO'
  // —— SMART 可选字段 ——
  benchmarkIndex?: string; // 对标指数
  benchmarkMa?: string; // 对标均线
  investedPeriods?: number; // 已投期数
  deductionRule?: string; // 扣款规则说明（仅展示）
  createdAt: string;
  updatedAt: string;
}

/** 定投扣款记录 */
export interface DcaRecord {
  id: string; // PK
  planId: string; // FK → DcaPlan.id
  accountId: string; // FK（建档时快照）
  targetInvestmentId: string; // FK（建档时快照）
  fundCode: string;
  fundName: string;
  amount: number; // 实际扣款额（元）
  deductedAt: string; // ISO 时间戳
  basisDate: string; // ISO 日期：该记录对应的扣款日（= 当次 nextDeductionDate）
}

// ==================== DTO / 解析结果 ====================

/** 创建 / 更新计划 DTO */
export interface CreateDcaPlanDTO {
  type: DcaPlanType;
  accountId: string;
  targetInvestmentId: string; // 建档时即绑定；手填时留空由 dcaService 解析建档
  fundCode?: string;
  fundName: string;
  amount: number;
  frequency: DcaFrequency;
  nextDeductionDate: string;
  enabled?: boolean;
  deductionMode?: DcaDeductionMode;
  // —— SMART 可选 ——
  benchmarkIndex?: string;
  benchmarkMa?: string;
  investedPeriods?: number;
  deductionRule?: string;
}

/** 聪明定投 OCR 解析结果 */
export interface DcaOcrParseResult {
  amount?: number; // 基准金额 / 每期扣款
  benchmarkIndex?: string; // 对标指数
  benchmarkMa?: string; // 对标均线
  frequency?: DcaFrequency; // 扣款间隔（归一）
  nextDeductionDate?: string; // 下一扣款日
  investedPeriods?: number; // 已投期数
  raw: string; // 原始 OCR 文本
}

/** 单次自动扣款结果（用于提醒 Snackbar） */
export interface DcaDeductionResult {
  planId: string;
  fundName: string;
  amount: number;
  basisDate: string; // 实际扣款日
  recordId: string;
}

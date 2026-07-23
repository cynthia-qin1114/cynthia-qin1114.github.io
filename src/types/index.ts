/**
 * 全部TypeScript类型/接口/枚举定义
 * 数据模型层 — 6个核心实体
 */

// ==================== 枚举类型 ====================

/** 账户类型 */
export enum AccountType {
  BANK_DEBIT = 'BANK_DEBIT',
  BANK_CREDIT = 'BANK_CREDIT',
  ALIPAY = 'ALIPAY',
  WECHAT = 'WECHAT',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

/** 交易类型 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

/** 分类类型 */
export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

/** 平台匹配类型 */
export enum MatchType {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
}

/**
 * 持仓类型：公募基金 / 银行·平台理财 / 活期存款 / 黄金
 * - FUND：公募基金，有 fundCode/净值，可自动刷新
 * - WEALTH：理财产品，无公开净值，靠截图更新 marketValue + 收益字段
 * - CASH：活期存款，仅有 marketValue（活期金额），不计入投资市值（详见需求③）
 * - GOLD：黄金（招行黄金等），shares 复用为「克重」；专属视图归需求④
 */
export enum HoldingType {
  FUND = 'FUND',
  WEALTH = 'WEALTH',
  CASH = 'CASH',
  GOLD = 'GOLD',
}

// ==================== 数据模型接口 ====================

/** 账户 */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/** 交易 */
export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  category: string;
  platform: string;
  note: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/** 分类 */
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  parentId: string | null;
  sortOrder: number;
}

/** 投资持仓 */
export interface Investment {
  id: string;
  // —— 分类与归属（wealth-sync 新增）——
  /** 持仓类型：'FUND' | 'WEALTH' | 'CASH' | 'GOLD'，迁移默认 'FUND' */
  holdingType: HoldingType;
  /** 归属账户 id，迁移默认 'acc_citic_securities' */
  accountId: string;
  /** 发行/管理机构，如「信银理财」「中银理财」（WEALTH 用） */
  institution?: string;
  // —— 基金专用（WEALTH/CASH 可空）——
  /** FUND 必填；WEALTH/CASH 置 '' 空串 */
  fundCode: string;
  /** 复用为「产品名称」（FUND=基金名，WEALTH=理财产品名，CASH=活期存款） */
  fundName: string;
  /** FUND 有效；WEALTH/CASH 置 0 */
  shares: number;
  /** FUND 有效；WEALTH/CASH 置 0 */
  costPrice: number;
  /** FUND 有效；WEALTH/CASH 置 0 */
  currentPrice: number;
  /** FUND=份额×成本价；WEALTH=marketValue-holdingProfit（反推成本）；CASH=marketValue */
  costAmount: number;
  // —— 通用市值与收益 ——
  /** 两类通用：当前持仓市值（核心字段），账户余额与概览汇总只依赖它 */
  marketValue: number;
  /** 复用为「持有收益金额」（= holdingProfit） */
  profitLoss: number;
  /** 复用为「持有收益率(%)」（= holdingProfitRate） */
  profitLossRate: number;
  // —— 理财收益字段（wealth-sync 新增，FUND 也可选填当日）——
  /** 当日收益金额（可正可负） */
  dailyProfit?: number;
  /** 当日收益率(%)（可正可负） */
  dailyProfitRate?: number;
  /** 持有收益金额（与 profitLoss 语义一致，冗余显式字段） */
  holdingProfit?: number;
  /** 持有收益率(%)（与 profitLossRate 语义一致） */
  holdingProfitRate?: number;
  // —— 元信息 ——
  /** FUND=买入日；WEALTH=可用「持有起始日/首次录入日」 */
  buyDate: string;
  /** 最近一次截图同步时间（WEALTH 展示「更新于」） */
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 平台映射 */
export interface PlatformMapping {
  id: string;
  platform: string;
  category: string;
  matchType: MatchType;
  keywords: string[];
}

/** 预算 (P2预留) */
export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== DTO与查询结果接口 ====================

/** 账户创建DTO */
export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string;
  note: string;
}

/** 账户更新DTO */
export interface UpdateAccountDTO {
  name?: string;
  type?: AccountType;
  balance?: number;
  currency?: string;
  icon?: string;
  note?: string;
}

/** 交易创建DTO */
export interface CreateTransactionDTO {
  accountId: string;
  type: TransactionType;
  amount: number;
  category: string;
  platform: string;
  note: string;
  date: string;
}

/** 交易更新DTO */
export interface UpdateTransactionDTO {
  accountId?: string;
  type?: TransactionType;
  amount?: number;
  category?: string;
  platform?: string;
  note?: string;
  date?: string;
}

/** 投资创建DTO */
export interface CreateInvestmentDTO {
  /** 持仓类型；未提供时 Repository 默认按 FUND 处理（向后兼容旧调用） */
  holdingType?: HoldingType;
  /** 归属账户 id；未提供时 Repository 默认 'acc_citic_securities'（向后兼容） */
  accountId?: string;
  /** 产品名（FUND=基金名，WEALTH=理财产品名，两类必填） */
  fundName: string;
  // FUND 专用
  fundCode?: string;
  shares?: number;
  costPrice?: number;
  currentPrice?: number;
  buyDate?: string;
  // WEALTH 专用
  institution?: string;
  /** 理财市值（WEALTH 必填） */
  marketValue?: number;
  dailyProfit?: number;
  dailyProfitRate?: number;
  holdingProfit?: number;
  holdingProfitRate?: number;
  /** 最近截图同步时间 */
  lastSyncAt?: string;
}

/** 投资更新DTO（全部可选，重新截图时整体覆盖收益字段） */
export interface UpdateInvestmentDTO {
  accountId?: string;
  fundName?: string;
  institution?: string;
  shares?: number;
  costPrice?: number;
  currentPrice?: number;
  buyDate?: string;
  marketValue?: number;
  dailyProfit?: number;
  dailyProfitRate?: number;
  holdingProfit?: number;
  holdingProfitRate?: number;
  lastSyncAt?: string;
}

/** 分类创建DTO */
export interface CreateCategoryDTO {
  name: string;
  type: CategoryType;
  icon: string;
  parentId: string | null;
  sortOrder: number;
}

/** 交易筛选条件 */
export interface TransactionFilter {
  accountId?: string;
  type?: TransactionType;
  category?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

/** 月度汇总 */
export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  net: number;
}

/** 分类汇总 */
export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

/** 账户分布 */
export interface AccountDistribution {
  accountId?: string;
  accountName: string;
  accountType: string;
  balance: number;
  percentage: number;
}

/** 资产概览 */
export interface AssetOverview {
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  investmentValue: number;
}

/** 资产趋势点 */
export interface AssetTrendPoint {
  date: string;
  totalAssets: number;
  investmentValue: number;
  cashAssets: number;
}

/** 投资汇总 */
export interface InvestmentSummary {
  totalCost: number;
  totalMarketValue: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  /** 当日收益合计（wealth-sync 新增，仅统计有 dailyProfit 的持仓） */
  totalDailyProfit: number;
  count: number;
}

/** 账户持仓汇总（按账户聚合持仓市值/收益） */
export interface AccountHoldingSummary {
  accountId: string;
  /** 该账户下持仓市值合计（含 CASH/WEALTH/FUND） */
  totalMarketValue: number;
  /** 该账户下持有收益合计 */
  totalHoldingProfit: number;
  /** 该账户下当日收益合计 */
  totalDailyProfit: number;
  /** 该账户下持仓条目数（含 CASH） */
  count: number;
}

/** 平台映射查询结果 */
export interface PlatformMatchResult {
  platform: string;
  category: string;
  matchType: MatchType;
  matched: boolean;
}

// ==================== Store状态接口 ====================

/** 账户Store状态 */
export interface AccountStoreState {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  totalAssets: number;
  fetchAccounts: () => Promise<void>;
  createAccount: (dto: CreateAccountDTO) => Promise<void>;
  updateAccount: (id: string, dto: UpdateAccountDTO) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refreshTotalAssets: () => Promise<void>;
}

/** 交易Store状态 */
export interface TransactionStoreState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  monthlySummary: MonthlySummary | null;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  createTransaction: (dto: CreateTransactionDTO) => Promise<void>;
  updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchMonthlySummary: (year: number, month: number) => Promise<void>;
}

/** 投资Store状态 */
export interface InvestmentStoreState {
  investments: Investment[];
  loading: boolean;
  error: string | null;
  summary: InvestmentSummary | null;
  fetchInvestments: () => Promise<void>;
  createInvestment: (dto: CreateInvestmentDTO) => Promise<void>;
  updateInvestment: (id: string, dto: UpdateInvestmentDTO) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  batchUpsertWealth: (dtos: CreateInvestmentDTO[]) => Promise<void>;
  refreshPrices: () => Promise<void>;
  refreshSummary: () => Promise<void>;
}

/** 设置Store状态 */
export interface SettingsStoreState {
  corsProxy: string;
  defaultCurrency: string;
  ocrLanguage: string;
  setCorsProxy: (url: string) => void;
  setDefaultCurrency: (currency: string) => void;
  setOcrLanguage: (lang: string) => void;
}

// ==================== 需求⑤ 定投计划（DCA）类型 ====================
export * from './dca';
export * from './gold';

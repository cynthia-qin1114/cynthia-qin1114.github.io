import Dexie, { Table } from 'dexie';
import type { Account, Transaction, Category, Investment, PlatformMapping, Budget, DcaPlan, DcaRecord } from '../types';
import { AccountType, CategoryType } from '../types';
import { AccountTypeIcons } from '../config/constants';
import { defaultPlatformRules } from '../utils/platformRules';

/**
 * SmartFinanceDB — Dexie数据库定义
 * 5张主表 + 1张预算表(P2)
 * 使用IndexedDB本地存储
 */
export class SmartFinanceDB extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  investments!: Table<Investment, string>;
  platformMappings!: Table<PlatformMapping, string>;
  budgets!: Table<Budget, string>;
  // 需求⑤ 定投计划（DCA）新增两表
  dcaPlans!: Table<DcaPlan, string>;
  dcaRecords!: Table<DcaRecord, string>;

  constructor() {
    super('SmartFinanceDB');

    // Schema v1
    this.version(1).stores({
      // 主键id + 索引
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    });

    // Schema v2
    // 表结构未变化，仅为触发版本升级以配合默认数据体系更新（默认账户/分类/平台规则）。
    // 注意：Dexie 版本升级不会自动重写业务数据，老用户历史的分类/账户/交易都会保留，
    // 不会造成数据丢失。若老用户希望应用新版默认账户与分类，请在“设置页”点击
    // “恢复默认账户与分类”按钮调用 resetDefaultData()。
    this.version(2).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      investments: 'id, fundCode, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    });

    // Schema v3（wealth-sync）
    // investments 表新增 accountId、holdingType 索引，支撑「多机构理财/基金持仓归属与账户联动」。
    // upgrade 对老基金记录原地补默认值，保证零数据丢失、幂等（仅当字段 undefined 才写默认值）。
    this.version(3).stores({
      accounts: 'id, type, createdAt',
      transactions: 'id, accountId, type, category, platform, date, createdAt',
      categories: 'id, type, parentId, sortOrder',
      // +accountId +holdingType 索引；保留既有 fundCode/buyDate 查询兼容
      investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
      platformMappings: 'id, platform, category',
      budgets: 'id, category, period',
    }).upgrade(async (tx) => {
      // 老基金记录补默认值，保证不丢数据
      await tx.table('investments').toCollection().modify((inv: any) => {
        // 分类默认 FUND（老数据全部为基金）
        if (inv.holdingType === undefined) inv.holdingType = 'FUND';
        // 归属账户默认挂中信证券（老基金）
        if (inv.accountId === undefined || inv.accountId === '') {
          inv.accountId = 'acc_citic_securities';
        }
        // 显式收益别名与旧字段对齐（保持 profitLoss === holdingProfit 语义）
        if (inv.holdingProfit === undefined) inv.holdingProfit = inv.profitLoss ?? 0;
        if (inv.holdingProfitRate === undefined) {
          inv.holdingProfitRate = inv.profitLossRate ?? 0;
        }
        // 当日收益老数据无，保持 undefined（展示层显示「—」）
      });
    });

    // Schema v4（需求⑤ 基金定投计划 DCA）
    // 完整重声明全部既有表 + 新增 dcaPlans / dcaRecords；upgrade 闭包为空，
    // 仅建表、不迁移老数据，保证 v3→v4 升级零数据丢失、幂等。
    this.version(4)
      .stores({
        accounts: 'id, type, createdAt',
        transactions: 'id, accountId, type, category, platform, date, createdAt',
        categories: 'id, type, parentId, sortOrder',
        investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
        platformMappings: 'id, platform, category',
        budgets: 'id, category, period',
        dcaPlans: 'id,accountId,fundCode,type,nextDeductionDate,createdAt',
        dcaRecords: 'id,planId,accountId,basisDate',
      })
      .upgrade(() => {
        // 空升级：仅建表，零数据丢失
      });

    // Schema v5（需求：彻底移除「招商银行信用卡」默认账户）
    // 升级时删除该默认账户及其持仓，使其从既有用户数据库中真正移除；
    // 同时 buildDefaultAccounts() 已不再包含该账户，「恢复默认账户与分类」也不会再种回。
    this.version(5)
      .stores({
        accounts: 'id, type, createdAt',
        transactions: 'id, accountId, type, category, platform, date, createdAt',
        categories: 'id, type, parentId, sortOrder',
        investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
        platformMappings: 'id, platform, category',
        budgets: 'id, category, period',
        dcaPlans: 'id,accountId,fundCode,type,nextDeductionDate,createdAt',
        dcaRecords: 'id,planId,accountId,basisDate',
      })
      .upgrade(async (tx) => {
        const id = 'acc_cmb_credit';
        await tx.table('investments').where('accountId').equals(id).delete();
        await tx.table('accounts').delete(id);
      });
  }
}

/** 全局数据库单例 */
export const db = new SmartFinanceDB();

/**
 * 默认分类体系（按用户需求定制）
 * 收入：工资、报销、其他
 * 支出：交通、购物、餐饮、日常开销、bill、宠物、家庭、人际关系、其他
 * “其他”类 sortOrder 固定为 99，始终排在末尾。
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // 收入分类
  { id: 'cat_salary', name: '工资', type: CategoryType.INCOME, icon: '💰', parentId: null, sortOrder: 1 },
  { id: 'cat_reimburse', name: '报销', type: CategoryType.INCOME, icon: '🧾', parentId: null, sortOrder: 2 },
  { id: 'cat_other_income', name: '其他', type: CategoryType.INCOME, icon: '📝', parentId: null, sortOrder: 99 },
  // 支出分类
  { id: 'cat_transport', name: '交通', type: CategoryType.EXPENSE, icon: '🚗', parentId: null, sortOrder: 1 },
  { id: 'cat_shopping', name: '购物', type: CategoryType.EXPENSE, icon: '🛒', parentId: null, sortOrder: 2 },
  { id: 'cat_food', name: '餐饮', type: CategoryType.EXPENSE, icon: '🍔', parentId: null, sortOrder: 3 },
  { id: 'cat_daily', name: '日常开销', type: CategoryType.EXPENSE, icon: '🧴', parentId: null, sortOrder: 4 },
  { id: 'cat_bill', name: 'bill', type: CategoryType.EXPENSE, icon: '💡', parentId: null, sortOrder: 5 },
  { id: 'cat_pet', name: '宠物', type: CategoryType.EXPENSE, icon: '🐾', parentId: null, sortOrder: 6 },
  { id: 'cat_family', name: '家庭', type: CategoryType.EXPENSE, icon: '🏠', parentId: null, sortOrder: 7 },
  { id: 'cat_social', name: '人际关系', type: CategoryType.EXPENSE, icon: '🤝', parentId: null, sortOrder: 8 },
  { id: 'cat_other_expense', name: '其他', type: CategoryType.EXPENSE, icon: '📝', parentId: null, sortOrder: 99 },
];

/**
 * 构建默认账户列表
 * 覆盖用户常用的银行卡 / 电子钱包 / 证券账户，余额统一初始化为 0，
 * 由用户后续通过“添加账户 / 编辑账户”自行录入实际余额。
 */
const buildDefaultAccounts = (): Account[] => {
  const now = new Date().toISOString();
  const make = (id: string, name: string, type: AccountType, icon: string): Account => ({
    id,
    name,
    type,
    balance: 0,
    currency: 'CNY',
    icon,
    note: '',
    createdAt: now,
    updatedAt: now,
  });

  return [
    make('acc_cmb_debit', '招商银行储蓄卡', AccountType.BANK_DEBIT, AccountTypeIcons[AccountType.BANK_DEBIT]),
    make('acc_boc_debit', '中国银行储蓄卡', AccountType.BANK_DEBIT, AccountTypeIcons[AccountType.BANK_DEBIT]),
    make('acc_ccb_debit', '建设银行储蓄卡', AccountType.BANK_DEBIT, AccountTypeIcons[AccountType.BANK_DEBIT]),
    make('acc_abc_debit', '农业银行储蓄卡', AccountType.BANK_DEBIT, AccountTypeIcons[AccountType.BANK_DEBIT]),
    make('acc_wechat', '微信', AccountType.WECHAT, AccountTypeIcons[AccountType.WECHAT]),
    make('acc_alipay', '支付宝', AccountType.ALIPAY, AccountTypeIcons[AccountType.ALIPAY]),
    make('acc_citic_securities', '中信证券', AccountType.OTHER, '📈'),
  ];
};

/**
 * 初始化默认数据（仅对全新数据库生效，幂等）
 * - 分类：为空才写入默认分类体系
 * - 账户：为空才写入默认账户（余额 0）
 * - 平台映射：为空才写入默认平台规则
 */
export const initializeDefaultData = async (): Promise<void> => {
  // 分类
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  // 账户（新增：老版本没有初始化账户，导致记账页账户下拉为空）
  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    await db.accounts.bulkAdd(buildDefaultAccounts());
  }

  // 平台映射规则
  const platformCount = await db.platformMappings.count();
  if (platformCount === 0) {
    await db.platformMappings.bulkAdd(defaultPlatformRules);
  }
};

/**
 * 恢复默认账户与分类（供老用户升级时应用新版默认数据）
 *
 * 设计目标：对老用户已有数据破坏最小。策略：
 * 1. 分类：全量清空后重建。分类以“名称”被交易引用，重建后新分类名（餐饮/购物/交通等）
 *    与平台规则、交易中新写入的 category 一致；历史交易若引用旧分类名不会被删除，
 *    只是该分类不再出现在下拉中（不影响其金额与展示）。
 * 2. 平台映射：全量清空后重建为最新规则（category 已同步指向新分类名）。
 * 3. 账户：只处理“系统默认账户”（由 buildDefaultAccounts() 的语义化 id 界定）。
 *    仅当某默认账户余额为 0 且没有任何关联交易时才删除并重建，避免误删用户已录入余额或
 *    已产生流水的账户；用户自建账户完全不受影响。
 */
export const resetDefaultData = async (): Promise<void> => {
  await db.transaction(
    'rw',
    db.categories,
    db.platformMappings,
    db.accounts,
    db.transactions,
    async () => {
      // 1. 重建分类
      await db.categories.clear();
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);

      // 2. 重建平台映射
      await db.platformMappings.clear();
      await db.platformMappings.bulkAdd(defaultPlatformRules);

      // 3. 安全重建默认账户
      const defaultAccounts = buildDefaultAccounts();
      for (const acc of defaultAccounts) {
        const existing = await db.accounts.get(acc.id);
        if (!existing) {
          // 默认账户不存在（典型的老用户场景）→ 直接补齐
          await db.accounts.add(acc);
          continue;
        }
        // 已存在同 id 的默认账户：仅当余额为 0 且无关联交易时才安全重建
        const relatedTxCount = await db.transactions.where('accountId').equals(acc.id).count();
        if (existing.balance === 0 && relatedTxCount === 0) {
          await db.accounts.put({ ...acc, createdAt: existing.createdAt });
        }
        // 否则保留用户现有账户，不动其余额与流水
      }
    }
  );
};

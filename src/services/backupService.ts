/**
 * backupService.ts — 本地加密备份 / 恢复服务
 *
 * 关键约束（数据不出设备）：
 * - 备份：收集 → JSON → AES-GCM 加密 → 通过浏览器下载落本地文件。
 * - 恢复：读取本地文件 → 解密 → 解析 → 在 Dexie 事务内覆盖全部表。
 * - 全程不发起任何网络请求（无 fetch / axios / XMLHttpRequest）。
 */

import { Table } from 'dexie';
import { db } from '../db/database';
import { encryptToString, decryptToString } from '../utils/backupCrypto';
import type {
  Account,
  Transaction,
  Category,
  Investment,
  PlatformMapping,
  Budget,
  DcaPlan,
  DcaRecord,
} from '../types';

/** 备份数据结构（覆盖全部 8 张表，保证恢复完整） */
export interface BackupData {
  /** 备份格式版本 */
  version: number;
  /** 导出时间（ISO 字符串） */
  exportDate: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  investments: Investment[];
  platformMappings: PlatformMapping[];
  budgets: Budget[];
  dcaPlans: DcaPlan[];
  dcaRecords: DcaRecord[];
}

/** 备份格式版本 */
const BACKUP_FORMAT_VERSION = 1;

/** 备份文件扩展名（Smart Finance Encrypted） */
export const BACKUP_FILE_EXTENSION = '.sfe';

/**
 * 从本地 IndexedDB 收集全部业务数据
 * @returns 包含所有表的备份对象
 */
export async function collectBackupData(): Promise<BackupData> {
  const [
    accounts,
    transactions,
    categories,
    investments,
    platformMappings,
    budgets,
    dcaPlans,
    dcaRecords,
  ] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.investments.toArray(),
    db.platformMappings.toArray(),
    db.budgets.toArray(),
    db.dcaPlans.toArray(),
    db.dcaRecords.toArray(),
  ]);

  return {
    version: BACKUP_FORMAT_VERSION,
    exportDate: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    investments,
    platformMappings,
    budgets,
    dcaPlans,
    dcaRecords,
  };
}

/**
 * 一键加密备份：收集数据 → JSON → AES-GCM 加密 → 浏览器下载落本地。
 * 不发起任何网络请求，文件仅保存在用户本机 / 网盘。
 * @param password 加密密码（AES-256-GCM）
 */
export async function downloadEncryptedBackup(password: string): Promise<void> {
  const data = await collectBackupData();
  const plaintext = JSON.stringify(data);
  const encrypted = await encryptToString(plaintext, password);

  const blob = new Blob([encrypted], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `smart-finance-backup-${dateStr}${BACKUP_FILE_EXTENSION}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 一键恢复：读取本地文件 → 解密 → 解析 → 事务内覆盖全部表。
 * 恢复 = 覆盖；调用方（UI）应事先二次确认。
 * 解密失败 / 格式错误会向上抛错，由 UI 层在 Dialog 内提示（不崩溃）。
 * @param file 用户选择的本地备份文件
 * @param password 解密密码
 */
export async function restoreEncryptedBackup(file: File, password: string): Promise<void> {
  const text = await file.text();
  const plaintext = await decryptToString(text, password);

  let parsed: BackupData;
  try {
    parsed = JSON.parse(plaintext) as BackupData;
  } catch {
    throw new Error('备份文件内容解析失败：不是有效的备份数据');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('备份文件内容解析失败：格式无效');
  }

  // 待恢复的表（保持与 db 表一一对应）。使用 any 表类型以兼容不同实体行。
  const tables: Array<readonly [keyof BackupData, Table<any, any>]> = [
    ['accounts', db.accounts],
    ['transactions', db.transactions],
    ['categories', db.categories],
    ['investments', db.investments],
    ['platformMappings', db.platformMappings],
    ['budgets', db.budgets],
    ['dcaPlans', db.dcaPlans],
    ['dcaRecords', db.dcaRecords],
  ];

  // 写入前校验关键字段为数组，避免把脏数据覆盖进数据库
  for (const [key] of tables) {
    const value = parsed[key];
    if (!Array.isArray(value)) {
      throw new Error(`备份文件缺少数据表：${key}`);
    }
  }

  // 事务保证原子性：要么全部表成功覆盖，要么整体失败回滚
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.categories,
      db.investments,
      db.platformMappings,
      db.budgets,
      db.dcaPlans,
      db.dcaRecords,
    ],
    async () => {
      for (const [key, table] of tables) {
        await table.clear();
        const rows = parsed[key] as unknown[];
        if (rows.length > 0) {
          await table.bulkPut(rows);
        }
      }
    },
  );
}

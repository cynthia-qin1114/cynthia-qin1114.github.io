/**
 * investmentRepository.fundOcr.integration.test.ts — Bug③④ 修复验证
 *
 * 覆盖 investmentRepository 写库层 FUND 分支的 OCR 市值兜底逻辑：
 * OCR 直给市值（shares/currentPrice 缺失或归零）时，marketValue / holdingProfit /
 * holdingProfitRate 必须直接采用 DTO 提供值，而不可被 `shares * currentPrice` 归零。
 *
 * 使用 fake-indexeddb 驱动真实 investmentRepository + accountRepository，
 * 经 `upsertByAccountAndName`（首写 create、重同步 update）写入后读出断言。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database';
import { investmentRepository } from './investmentRepository';
import { HoldingType, AccountType } from '../../types';
import type { Account, CreateInvestmentDTO } from '../../types';

const makeAccount = (id: string): Account => ({
  id,
  name: `账户${id}`,
  type: AccountType.OTHER,
  balance: 0,
  currency: 'CNY',
  icon: '💳',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

beforeEach(async () => {
  await db.investments.clear();
  await db.accounts.clear();
});

describe('investmentRepository (FUND) — OCR 市值兜底 (Bug③④)', () => {
  it('招行基金 OCR：市值/持有收益不被 shares*currentPrice 归零', async () => {
    await db.accounts.add(makeAccount('acc_cmb'));

    // 模拟招行基金持仓页 OCR：shares=0, currentPrice=0，直给市值与收益
    const dto: CreateInvestmentDTO = {
      holdingType: HoldingType.FUND,
      accountId: 'acc_cmb',
      fundName: '招银理财债券基金A',
      shares: 0,
      currentPrice: 0,
      marketValue: 991.80,
      holdingProfit: -133.20,
      holdingProfitRate: -11.84,
    };

    const created = await investmentRepository.upsertByAccountAndName(dto);
    // 写库返回值即应为 OCR 直给值
    expect(created.marketValue).toBe(991.80);
    expect(created.holdingProfit).toBe(-133.20);
    expect(created.holdingProfitRate).toBe(-11.84);

    // 读出后应为持久化值，未被清零
    const stored = await db.investments.get(created.id);
    expect(stored).toBeDefined();
    expect(stored!.marketValue).toBe(991.80);
    expect(stored!.holdingProfit).toBe(-133.20);
    expect(stored!.holdingProfitRate).toBe(-11.84);
  });

  it('手动录入（有 shares+currentPrice）仍按份额×净值计算市值', async () => {
    await db.accounts.add(makeAccount('acc_citic_securities'));

    const dto: CreateInvestmentDTO = {
      holdingType: HoldingType.FUND,
      fundName: '手动录入基金',
      shares: 100,
      costPrice: 1.5,
      currentPrice: 2.0,
    };

    const created = await investmentRepository.upsertByAccountAndName(dto);
    // 手动录入：marketValue = 100 * 2.0，成本 = 100 * 1.5
    expect(created.marketValue).toBe(200);
    expect(created.costAmount).toBe(150);
    expect(created.holdingProfit).toBe(50); // 200 - 150
    expect(created.holdingProfitRate).toBeCloseTo((50 / 150) * 100, 6);
  });

  it('重新 OCR 同步（update 路径）不归零市值/持有收益', async () => {
    await db.accounts.add(makeAccount('acc_citic_securities'));

    const dto: CreateInvestmentDTO = {
      holdingType: HoldingType.FUND,
      accountId: 'acc_citic_securities',
      fundName: '中信基金B',
      shares: 0,
      currentPrice: 0,
      marketValue: 1260.79,
      holdingProfit: -50.0,
      holdingProfitRate: -3.8,
    };

    const created = await investmentRepository.upsertByAccountAndName(dto);

    // 再次 OCR 同步：命中 update 分支（同账户+同名+同类型），应保持 OCR 直给值
    const resync = await investmentRepository.upsertByAccountAndName({
      ...dto,
      marketValue: 983.96,
      holdingProfit: -200.0,
      holdingProfitRate: -16.9,
    });

    expect(resync.id).toBe(created.id); // 幂等覆盖，非新建
    expect(resync.marketValue).toBe(983.96);
    expect(resync.holdingProfit).toBe(-200.0);
    expect(resync.holdingProfitRate).toBe(-16.9);
  });
});

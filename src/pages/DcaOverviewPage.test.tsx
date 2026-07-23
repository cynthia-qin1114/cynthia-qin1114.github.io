// @vitest-environment jsdom
/**
 * DcaOverviewPage.test.tsx — 定投计划概览页（需求⑤ DCA）
 *
 * jsdom + fake-indexeddb。mock ocrService 避免加载 tesseract.js。
 * 覆盖：空态引导 / 有 SMART·FIXED 两类计划时按两组渲染 / 分组可折叠。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DcaOverviewPage from '../pages/DcaOverviewPage';
import { db } from '../db/database';
import { dcaRepository } from '../db/repositories/dcaRepository';
import { useDcaStore } from '../store/useDcaStore';
import { DcaPlanType, DcaFrequency, DcaDeductionMode } from '../types';

vi.mock('../services/ocrService', () => ({ ocrService: { recognize: vi.fn() } }));

beforeEach(async () => {
  await db.dcaPlans.clear();
  await db.dcaRecords.clear();
  useDcaStore.setState({ plans: [], records: [], lastDeductions: [], loading: false, error: null });
});

afterEach(() => cleanup());

function seedPlan(over: Record<string, unknown> = {}): Promise<any> {
  return dcaRepository.createPlan({
    type: DcaPlanType.FIXED,
    accountId: 'acc1',
    targetInvestmentId: 'inv1',
    fundCode: '000001',
    fundName: '基金A',
    amount: 100,
    frequency: DcaFrequency.MONTHLY,
    nextDeductionDate: '2024-05-01',
    enabled: true,
    deductionMode: DcaDeductionMode.AUTO,
    investedPeriods: 0,
    ...over,
  });
}

describe('DcaOverviewPage', () => {
  it('无计划时展示空态引导', async () => {
    render(<DcaOverviewPage />);
    await waitFor(() => expect(screen.getByText('还没有定投计划')).toBeInTheDocument());
    expect(screen.getByText('新建定投计划')).toBeInTheDocument();
  });

  it('有 SMART / FIXED 两类计划时按两组渲染（含基金名）', async () => {
    await seedPlan({ type: DcaPlanType.SMART, fundName: '聪明基金', frequency: DcaFrequency.WEEKLY });
    await seedPlan({ type: DcaPlanType.FIXED, fundName: '定额基金' });

    render(<DcaOverviewPage />);

    await waitFor(() => expect(screen.getByText('聪明定投')).toBeInTheDocument());
    expect(screen.getByText('定额定投')).toBeInTheDocument();
    expect(screen.getByText('聪明基金')).toBeInTheDocument();
    expect(screen.getByText('定额基金')).toBeInTheDocument();
  });

  it('分组可折叠：点击组头后卡片隐藏、组头信息保留', async () => {
    await seedPlan({ type: DcaPlanType.FIXED, fundName: '定额基金' });
    render(<DcaOverviewPage />);

    await waitFor(() => expect(screen.getByText('定额基金')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('收起分组'));
    await waitFor(() => expect(screen.queryByText('定额基金')).not.toBeInTheDocument());

    // 组头保留：标题与条数仍在
    expect(screen.getByText('定额定投')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

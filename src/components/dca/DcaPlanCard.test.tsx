// @vitest-environment jsdom
/**
 * DcaPlanCard.test.tsx — 单条定投计划卡片（需求⑤ DCA）
 *
 * 纯展示组件（props 驱动，不触碰 store / Dexie）。覆盖：
 * - 展示 基金名 / 每期金额 / 频度 / 下一扣款日 / 累计投入
 * - 启用 Switch 切换调用 onToggleEnabled（并阻止冒泡触发卡片 onEdit）
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DcaPlanCard from './DcaPlanCard';
import { DcaFrequency, DcaPlanType } from '../../types';
import type { DcaPlan } from '../../types';

afterEach(() => cleanup());

function makePlan(over: Partial<DcaPlan> = {}): DcaPlan {
  return {
    id: 'p1',
    type: DcaPlanType.FIXED,
    accountId: 'acc1',
    targetInvestmentId: 'inv1',
    fundCode: '000001',
    fundName: '基金A',
    amount: 500,
    frequency: DcaFrequency.MONTHLY,
    nextDeductionDate: '2024-05-01',
    enabled: true,
    deductionMode: 'AUTO',
    investedPeriods: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  } as DcaPlan;
}

describe('DcaPlanCard 展示', () => {
  it('展示基金名 / 每期金额 / 频度 / 下一扣款日 / 累计投入', () => {
    render(<DcaPlanCard plan={makePlan()} investedAmount={1500} onEdit={() => {}} onToggleEnabled={() => {}} />);
    expect(screen.getByText('基金A')).toBeInTheDocument();
    expect(screen.getByText('¥500.00')).toBeInTheDocument(); // 每期
    // 类型 · 频度 合并为同一文本节点「定额定投 · 每月」
    expect(screen.getByText('定额定投 · 每月')).toBeInTheDocument();
    expect(screen.getByText('2024-05-01')).toBeInTheDocument(); // 下一扣款日
    expect(screen.getByText('¥1,500.00')).toBeInTheDocument(); // 累计投入
  });
});

describe('DcaPlanCard 启用 Switch', () => {
  it('切换调用 onToggleEnabled（新启用态），并阻止卡片 onEdit', () => {
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    render(<DcaPlanCard plan={makePlan({ enabled: true })} investedAmount={0} onEdit={onEdit} onToggleEnabled={onToggle} />);
    const sw = screen.getByRole('checkbox');
    fireEvent.click(sw);
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), false);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('从禁用切到启用时传出 true', () => {
    const onToggle = vi.fn();
    render(<DcaPlanCard plan={makePlan({ enabled: false })} investedAmount={0} onEdit={() => {}} onToggleEnabled={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), true);
  });
});

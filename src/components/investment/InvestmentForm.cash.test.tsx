// @vitest-environment jsdom
/**
 * InvestmentForm · CASH（活期）录入契约测试（增量变更）
 *
 * 需求：新增/编辑 CASH 持仓时，表单仅含「活期金额」，不出现「产品名称」「持有起始日」；
 * 提交 DTO 口径：fundName 用 trim() || '活期存款'（保留已有记录原名，仅新建空白时兜底），
 * buyDate 对 CASH 传 undefined；金额 marketValue 不变。
 *
 * 覆盖：
 *   1) 新增 CASH：表单只出现「活期金额」；queryByLabelText('产品名称') / ('持有起始日') 为 null
 *   2) 新增 CASH：canSubmit 只要求金额（空金额禁用，填金额即启用）
 *   3) 新增 CASH：onSubmit 收到 {holdingType:'CASH', fundName:'活期存款', marketValue:1000, buyDate:undefined}
 *   4) 编辑已有 CASH（fundName='余额宝'）：提交后 fundName 仍为 '余额宝'（幂等键不漂移）
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import InvestmentForm from './InvestmentForm';
import { HoldingType, AccountType } from '../../types';
import type { Account, Investment, CreateInvestmentDTO } from '../../types';

// RTL 默认不自动清理（globals:false），每个用例后手动清理 DOM。
afterEach(() => cleanup());

const testAccount: Account = {
  id: 'acc_citic_securities',
  name: '中信证券',
  type: AccountType.BANK_DEBIT,
  balance: 0,
  currency: 'CNY',
  icon: '💳',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** 构造一条 CASH Investment（默认 fundName='余额宝'，便于校验幂等键保留） */
function makeCashInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'cash-1',
    holdingType: HoldingType.CASH,
    accountId: 'acc_citic_securities',
    institution: undefined,
    fundCode: '',
    fundName: '余额宝',
    shares: 0,
    costPrice: 0,
    currentPrice: 0,
    costAmount: 0,
    marketValue: 500,
    profitLoss: 0,
    profitLossRate: 0,
    dailyProfit: undefined,
    dailyProfitRate: undefined,
    holdingProfit: undefined,
    holdingProfitRate: undefined,
    buyDate: '2024-03-01',
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...overrides,
  };
}

/** 打开「新增」表单并切换到 CASH（活期）类型 */
function openAndSelectCash(
  onSubmit: (data: CreateInvestmentDTO) => Promise<void> = vi.fn<[CreateInvestmentDTO], Promise<void>>(),
) {
  const onClose = vi.fn();
  render(
    <InvestmentForm
      open
      investment={null}
      accounts={[testAccount]}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
  // 默认是 FUND，点击「活期」Toggle 切到 CASH
  fireEvent.click(screen.getByText('活期'));
  return { onSubmit, onClose };
}

describe('InvestmentForm · CASH 仅含「活期金额」', () => {
  it('新增 CASH：表单只出现「活期金额」，不出现「产品名称」/「持有起始日」', () => {
    openAndSelectCash();
    expect(screen.getByLabelText('活期金额', { exact: false })).toBeInTheDocument();
    expect(screen.queryByLabelText('产品名称')).toBeNull();
    expect(screen.queryByLabelText('持有起始日')).toBeNull();
  });

  it('新增 CASH：canSubmit 只要求金额（空金额时禁用，填金额即启用）', () => {
    openAndSelectCash();
    const saveBtn = screen.getByRole('button', { name: '保存' });
    expect(saveBtn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('活期金额', { exact: false }), { target: { value: '1000' } });
    expect(saveBtn).toBeEnabled();
  });

  it('新增 CASH：onSubmit 收到 {holdingType:CASH, fundName:活期存款, marketValue:1000, buyDate:undefined}', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    openAndSelectCash(onSubmit);
    fireEvent.change(screen.getByLabelText('活期金额', { exact: false }), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        holdingType: HoldingType.CASH,
        fundName: '活期存款',
        marketValue: 1000,
        buyDate: undefined,
      }),
    );
  });

  it('编辑已有 CASH（fundName=余额宝）：提交后 fundName 仍为「余额宝」（幂等键不漂移）', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <InvestmentForm
        open
        investment={makeCashInvestment({ fundName: '余额宝', marketValue: 500 })}
        accounts={[testAccount]}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    // 编辑态无「产品名称」输入，原 fundName 保留
    expect(screen.queryByLabelText('产品名称')).toBeNull();
    // 金额已预填 500，可直接提交
    const saveBtn = screen.getByRole('button', { name: '保存' });
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const dto = onSubmit.mock.calls[0][0] as CreateInvestmentDTO;
    expect(dto.holdingType).toBe(HoldingType.CASH);
    expect(dto.fundName).toBe('余额宝');
    expect(dto.marketValue).toBe(500);
    expect(dto.buyDate).toBeUndefined();
  });
});

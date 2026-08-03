// @vitest-environment jsdom
/**
 * InvestmentCard · CASH（活期）持仓展示契约测试（增量变更）
 *
 * 需求：holdingType === 'CASH' 的持仓仅展示金额，不展示产品名 / 市值标签 / 持有起始日。
 * 覆盖：
 *   1) CASH 卡片不显示产品名（如「余额宝」）
 *   2) CASH 卡片显示中性文案「活期」
 *   3) CASH 卡片显示「现金」徽章
 *   4) CASH 卡片显示格式化金额（¥1,234.50）
 *   5) CASH 卡片不显示「持有市值」标签
 *   6) 回归：非 CASH（WEALTH / FUND）仍显示产品名与「持有市值」标签
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import InvestmentCard from './InvestmentCard';
import { HoldingType } from '../../types';
import type { Investment } from '../../types';
import { formatCurrency } from '../../utils/format';

// RTL 默认不自动清理（globals:false），每个用例后手动清理 DOM。
afterEach(() => cleanup());

/** 构造一条 Investment 的工厂（补齐必填字段，允许按需覆盖） */
function makeInvestment(
  partial: Partial<Investment> & Pick<Investment, 'id' | 'holdingType' | 'fundName' | 'marketValue'>,
): Investment {
  return {
    accountId: 'acc_1',
    fundCode: '',
    shares: 0,
    costPrice: 0,
    currentPrice: 0,
    costAmount: 0,
    profitLoss: 0,
    profitLossRate: 0,
    buyDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('InvestmentCard · CASH 仅展示金额', () => {
  it('CASH 卡片不显示产品名，显示「活期」文案、「现金」徽章与金额，不显示「持有市值」', () => {
    const investment = makeInvestment({
      id: 'c1',
      holdingType: HoldingType.CASH,
      fundName: '余额宝',
      marketValue: 1234.5,
    });
    render(<InvestmentCard investment={investment} accountName="招行" />);

    // 不显示产品名（如「余额宝」）
    expect(screen.queryByText('余额宝')).toBeNull();
    // 显示中性文案「活期」
    expect(screen.getByText('活期')).toBeInTheDocument();
    // 显示「现金」徽章
    expect(screen.getByText('现金')).toBeInTheDocument();
    // 显示格式化金额
    expect(screen.getByText(formatCurrency(1234.5))).toBeInTheDocument();
    // 不显示「持有市值」标签
    expect(screen.queryByText('持有市值')).toBeNull();
  });

  it('WEALTH 回归：仍显示产品名与「持有市值」标签', () => {
    const investment = makeInvestment({
      id: 'w1',
      holdingType: HoldingType.WEALTH,
      fundName: '慧盈象固收增利',
      marketValue: 30200,
      institution: '信银理财',
    });
    render(<InvestmentCard investment={investment} accountName="招行" />);

    expect(screen.getByText('慧盈象固收增利')).toBeInTheDocument();
    expect(screen.getByText('持有市值')).toBeInTheDocument();
    // WEALTH 不应显示「活期」
    expect(screen.queryByText('活期')).toBeNull();
  });

  it('FUND 回归：仍显示产品名与「持有市值」标签', () => {
    const investment = makeInvestment({
      id: 'f1',
      holdingType: HoldingType.FUND,
      fundName: '招商中证白酒指数',
      marketValue: 5000,
      fundCode: '161725',
      shares: 100,
      costPrice: 1,
      currentPrice: 1,
    });
    render(<InvestmentCard investment={investment} accountName="招行" />);

    expect(screen.getByText('招商中证白酒指数')).toBeInTheDocument();
    expect(screen.getByText('持有市值')).toBeInTheDocument();
  });
});

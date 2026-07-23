// @vitest-environment jsdom
/**
 * InvestmentList / CategoryGroup 组件测试 — 需求③（投资页按资产类别分组）
 *
 * 仅验证 UI 分组行为，不触碰 repository / service / store / account 等口径层。
 * 覆盖关键行为契约：
 *   1) 分组固定顺序 FUND → WEALTH → GOLD → CASH（按 CATEGORY_GROUP_ORDER）
 *   2) 组内持仓按 marketValue 降序
 *   3) 空组动态隐藏（无 GOLD / 无 CASH 时不渲染对应组头）
 *   4) CASH 纳入「现金（活期）」组，小计 = Σ(CASH marketValue)
 *   5) 每组市值小计 = 该组 Σ(marketValue)，使用 formatCurrency 格式化
 *   6) 折叠交互：默认展开；点击组头可折叠/展开（折叠后卡片不可见，组头标题/条数/小计仍在）
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import InvestmentList from './InvestmentList';
import CategoryGroup from './CategoryGroup';
import { HoldingType } from '../../types';
import type { Investment } from '../../types';
import { formatCurrency } from '../../utils/format';

// RTL 默认不自动清理（globals:false），每个用例后手动清理 DOM，避免组件互相干扰。
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

/** 取文档中第一个匹配标题文本的节点（组头标题在 DOM 中先于卡片徽章出现） */
function getGroupHeaderTitle(text: string): HTMLElement {
  return screen.getAllByText(text)[0];
}

/** 判断元素 a 是否出现在元素 b 之前（DOM 顺序） */
function isBefore(a: Element, b: Element): boolean {
  // DOCUMENT_POSITION_FOLLOWING = 4
  return Boolean(a.compareDocumentPosition(b) & 4);
}

/** 定位组头（带 onClick 的 outer Box）：标题 <p> -> inner Box -> outer header Box */
function getHeaderBox(titleText: string): HTMLElement {
  const titleEl = getGroupHeaderTitle(titleText);
  const inner = titleEl.parentElement as HTMLElement;
  const header = inner.parentElement as HTMLElement;
  return header;
}

describe('需求③·分组固定顺序 (契约1)', () => {
  it('四种类型齐全时，组头顺序固定为 基金 → 理财 → 黄金 → 现金（活期）', () => {
    const investments = [
      makeInvestment({ id: 'c1', holdingType: HoldingType.CASH, fundName: '活期A', marketValue: 10 }),
      makeInvestment({ id: 'g1', holdingType: HoldingType.GOLD, fundName: '黄金A', marketValue: 20 }),
      makeInvestment({ id: 'w1', holdingType: HoldingType.WEALTH, fundName: '理财A', marketValue: 30, institution: '信银理财' }),
      makeInvestment({ id: 'f1', holdingType: HoldingType.FUND, fundName: '基金A', marketValue: 40, fundCode: '000001', shares: 100, costPrice: 1, currentPrice: 1 }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);

    const fund = getGroupHeaderTitle('基金');
    const wealth = getGroupHeaderTitle('理财');
    const gold = getGroupHeaderTitle('黄金');
    const cash = getGroupHeaderTitle('现金（活期）');

    expect(isBefore(fund, wealth)).toBe(true);
    expect(isBefore(wealth, gold)).toBe(true);
    expect(isBefore(gold, cash)).toBe(true);
  });
});

describe('需求③·组内按 marketValue 降序 (契约2)', () => {
  it('FUND 组内两条持仓按市值降序展示（5000 在 3000 之前）', () => {
    const investments = [
      makeInvestment({ id: 'f_low', holdingType: HoldingType.FUND, fundName: '基金低', marketValue: 3000, fundCode: '000002', shares: 1, costPrice: 1, currentPrice: 1 }),
      makeInvestment({ id: 'f_high', holdingType: HoldingType.FUND, fundName: '基金高', marketValue: 5000, fundCode: '000001', shares: 1, costPrice: 1, currentPrice: 1 }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);

    const high = screen.getByText('基金高');
    const low = screen.getByText('基金低');
    expect(isBefore(high, low)).toBe(true);
  });

  it('跨类型混合时，每组内部仍按各自 marketValue 降序', () => {
    const investments = [
      makeInvestment({ id: 'w2', holdingType: HoldingType.WEALTH, fundName: '理财低', marketValue: 100, institution: '信银理财' }),
      makeInvestment({ id: 'w1', holdingType: HoldingType.WEALTH, fundName: '理财高', marketValue: 900, institution: '中银理财' }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);

    const high = screen.getByText('理财高');
    const low = screen.getByText('理财低');
    expect(isBefore(high, low)).toBe(true);
  });
});

describe('需求③·空组动态隐藏 (契约3)', () => {
  it('仅含 FUND 与 WEALTH 时，不渲染黄金/现金组头', () => {
    const investments = [
      makeInvestment({ id: 'f1', holdingType: HoldingType.FUND, fundName: '基金A', marketValue: 100, fundCode: '000001', shares: 1, costPrice: 1, currentPrice: 1 }),
      makeInvestment({ id: 'w1', holdingType: HoldingType.WEALTH, fundName: '理财A', marketValue: 200, institution: '信银理财' }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);

    expect(getGroupHeaderTitle('基金')).toBeTruthy();
    expect(getGroupHeaderTitle('理财')).toBeTruthy();
    expect(screen.queryByText('黄金')).toBeNull();
    expect(screen.queryByText('现金（活期）')).toBeNull();
  });

  it('仅含 CASH 时，只渲染现金（活期）组，不渲染基金/理财/黄金组头', () => {
    const investments = [
      makeInvestment({ id: 'c1', holdingType: HoldingType.CASH, fundName: '活期存款', marketValue: 100 }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);

    expect(getGroupHeaderTitle('现金（活期）')).toBeTruthy();
    expect(screen.queryByText('基金')).toBeNull();
    expect(screen.queryByText('理财')).toBeNull();
    expect(screen.queryByText('黄金')).toBeNull();
  });

  it('无任何持仓时，展示空态（EmptyState）', () => {
    render(<InvestmentList investments={[]} groupByCategory />);
    expect(screen.getByText('暂无投资持仓')).toBeInTheDocument();
  });
});

describe('需求③·CASH 纳入现金（活期）组 (契约4)', () => {
  it('存在 CASH 持仓时，现金（活期）组出现', () => {
    const investments = [
      makeInvestment({ id: 'c1', holdingType: HoldingType.CASH, fundName: '活期存款', marketValue: 1234.5 }),
      makeInvestment({ id: 'f1', holdingType: HoldingType.FUND, fundName: '基金A', marketValue: 5000, fundCode: '000001', shares: 1, costPrice: 1, currentPrice: 1 }),
    ];
    render(<InvestmentList investments={investments} groupByCategory />);
    expect(getGroupHeaderTitle('现金（活期）')).toBeTruthy();
  });

  it('CASH 组小计 = Σ(CASH marketValue)（在 CategoryGroup 直接验证，隔离卡片金额干扰）', () => {
    const items = [
      makeInvestment({ id: 'c1', holdingType: HoldingType.CASH, fundName: '活期A', marketValue: 1000 }),
      makeInvestment({ id: 'c2', holdingType: HoldingType.CASH, fundName: '活期B', marketValue: 500.5 }),
    ];
    render(
      <CategoryGroup
        type={HoldingType.CASH}
        title="现金（活期）"
        items={items}
        renderCard={(inv) => <div key={inv.id}>{inv.fundName}</div>}
      />,
    );
    expect(screen.getByText('现金（活期）')).toBeInTheDocument();
    // 1000 + 500.5 = 1500.5 -> ¥1,500.50
    expect(screen.getByText(formatCurrency(1500.5))).toBeInTheDocument();
  });
});

describe('需求③·每组市值小计 = Σ(marketValue) 且用 formatCurrency (契约5)', () => {
  it('FUND 组小计 = 组内 Σ(marketValue)，全页仅出现一次（来自小计）', () => {
    const items = [
      makeInvestment({ id: 'a', holdingType: HoldingType.FUND, fundName: 'A', marketValue: 3000 }),
      makeInvestment({ id: 'b', holdingType: HoldingType.FUND, fundName: 'B', marketValue: 2000 }),
    ];
    render(
      <CategoryGroup
        type={HoldingType.FUND}
        title="基金"
        items={items}
        renderCard={(inv) => <div key={inv.id}>{inv.fundName}</div>}
      />,
    );
    const subtotalText = formatCurrency(5000); // 3000 + 2000
    expect(screen.getByText(subtotalText)).toBeInTheDocument();
    expect(screen.getAllByText(subtotalText).length).toBe(1);
  });

  it('GOLD 组小计同样使用 formatCurrency 格式化', () => {
    const items = [makeInvestment({ id: 'g', holdingType: HoldingType.GOLD, fundName: '黄金A', marketValue: 8888.8 })];
    render(
      <CategoryGroup
        type={HoldingType.GOLD}
        title="黄金"
        items={items}
        renderCard={(inv) => <div key={inv.id}>{inv.fundName}</div>}
      />,
    );
    expect(screen.getByText(formatCurrency(8888.8))).toBeInTheDocument();
  });
});

describe('需求③·折叠交互 (契约6)', () => {
  it('默认展开；点击组头可折叠/展开；折叠后卡片不可见，但组头标题/条数/小计仍在', async () => {
    const items = [makeInvestment({ id: 'a', holdingType: HoldingType.FUND, fundName: 'A', marketValue: 100 })];
    render(
      <CategoryGroup
        type={HoldingType.FUND}
        title="基金"
        items={items}
        renderCard={(inv) => <div key={inv.id}>CARD::{inv.fundName}</div>}
      />,
    );

    // 默认展开：卡片可见，chevron aria-label 为「收起分组」
    expect(screen.getByText('CARD::A')).toBeInTheDocument();
    expect(screen.getByLabelText('收起分组')).toBeInTheDocument();

    // 点击组头折叠
    fireEvent.click(getHeaderBox('基金'));
    expect(screen.getByLabelText('展开分组')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('CARD::A')).not.toBeInTheDocument();
    });
    // 组头信息保持：标题 / 条数(1) / 小计(¥100.00)
    expect(screen.getByText('基金')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(100))).toBeInTheDocument();

    // 再次点击展开
    fireEvent.click(getHeaderBox('基金'));
    expect(screen.getByLabelText('收起分组')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('CARD::A')).toBeInTheDocument();
    });
  });
});

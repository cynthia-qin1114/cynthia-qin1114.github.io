// @vitest-environment jsdom
/**
 * WealthSyncOcrButton 测试 — 截图识别入口三选项文案契约
 *
 * 覆盖：点击「同步资产（截图识别）」后，步骤2「选择截图类型」对话框渲染
 *       资产分布录入 / 理财录入 / 基金录入 三项（防文案被误改回退）。
 * 解析分支逻辑不在本测试范围（由各 OCR 解析器单测覆盖）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import WealthSyncOcrButton from './WealthSyncOcrButton';
import type { Account } from '../../types';

afterEach(() => cleanup());

// 组件运行时仅读取 account.id / account.name；测试账户用最小结构 + 类型断言构造。
const presetAccount = {
  id: 'acc_1',
  name: '测试账户',
  type: 'ALIPAY',
  balance: 0,
  currency: 'CNY',
  icon: '',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} as unknown as Account;

describe('截图识别入口·三选项文案 (契约)', () => {
  it('步骤2对话框展示 资产分布录入 / 理财录入 / 基金录入', () => {
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={() => {}} />,
    );

    // presetAccount 非空 → 点击同步按钮直接进入步骤2（选择截图类型）
    fireEvent.click(screen.getByText('同步资产（截图识别）'));

    expect(screen.getByText('资产分布录入')).toBeInTheDocument();
    expect(screen.getByText('理财录入')).toBeInTheDocument();
    expect(screen.getByText('基金录入')).toBeInTheDocument();
  });
});

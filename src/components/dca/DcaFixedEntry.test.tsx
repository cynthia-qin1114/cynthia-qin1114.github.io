// @vitest-environment jsdom
/**
 * DcaFixedEntry.test.tsx — 定额定投录入校验（需求⑤ DCA T04）
 *
 * 挂载即拉取账户/持仓（fake-indexeddb 提供 IndexedDB）。覆盖：
 * - 金额 <= 0 时保存被拦截并提示
 * - 标的未选（无 fund）且金额有效时保存被拦截
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DcaFixedEntry from './DcaFixedEntry';

afterEach(() => cleanup());

describe('DcaFixedEntry 校验生效', () => {
  it('金额 <= 0 时保存被拦截并提示', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<DcaFixedEntry onClose={onClose} onSaved={onSaved} />);

    const amountInput = screen.getByLabelText('每期扣款金额（元）');
    fireEvent.change(amountInput, { target: { value: '0' } });
    fireEvent.click(screen.getByText('保存计划'));

    await waitFor(() =>
      expect(screen.getByText('请输入有效的每期扣款金额（需大于 0）')).toBeInTheDocument(),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('金额有效但标的未选时保存被拦截', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<DcaFixedEntry onClose={onClose} onSaved={onSaved} />);

    const amountInput = screen.getByLabelText('每期扣款金额（元）');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByText('保存计划'));

    await waitFor(() => expect(screen.getByText('请选择目标基金持仓')).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });
});

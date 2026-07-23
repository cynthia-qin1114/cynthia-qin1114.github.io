// @vitest-environment jsdom
/**
 * DcaSmartEntry.test.tsx — 聪明定投录入 OCR 预填（需求⑤ DCA T03）
 *
 * - mock ocrService 避免加载 tesseract.js（jsdom 下无需真实识别）
 * - mock DcaOcrButton：挂载即回调 onResult(prefill) 模拟「识别完成」
 * 覆盖：传入 OCR prefill 后表单字段预填 + 可手改。
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DcaSmartEntry from './DcaSmartEntry';
import { DcaFrequency } from '../../types';

const PREFILL = {
  amount: 500,
  frequency: DcaFrequency.MONTHLY,
  nextDeductionDate: '2024-05-01',
  benchmarkIndex: '沪深300',
  benchmarkMa: '250日均线',
  investedPeriods: 12,
};

vi.mock('../../services/ocrService', () => ({ ocrService: { recognize: vi.fn() } }));
vi.mock('./DcaOcrButton', async () => {
  const React = await import('react');
  return {
    default: ({ onResult }: any) => {
      React.useEffect(() => {
        onResult(PREFILL, true);
      }, []);
      return null;
    },
  };
});

describe('DcaSmartEntry OCR 预填', () => {
  it('传入 OCR prefill 后表单字段预填，且可手改', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<DcaSmartEntry onClose={onClose} onSaved={onSaved} />);

    // 识别提示出现（已识别关键字段）
    await waitFor(() =>
      expect(screen.getByText('已识别以下字段（可逐项修改）：')).toBeInTheDocument(),
    );

    // 金额预填 500
    const amount = screen.getByLabelText('每期扣款金额（基准金额，元）') as HTMLInputElement;
    await waitFor(() => expect(amount.value).toBe('500'));

    // 可手改：改为 800
    fireEvent.change(amount, { target: { value: '800' } });
    expect((screen.getByLabelText('每期扣款金额（基准金额，元）') as HTMLInputElement).value).toBe('800');

    // 频率预填（每月）
    expect(screen.getByText('每月')).toBeInTheDocument();

    // 对标指数预填
    const idx = screen.getByLabelText('对标指数') as HTMLInputElement;
    expect(idx.value).toBe('沪深300');

    // 对标均线预填
    const ma = screen.getByLabelText('对标均线') as HTMLInputElement;
    expect(ma.value).toBe('250日均线');
  });
});

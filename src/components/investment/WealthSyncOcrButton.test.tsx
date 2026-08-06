// @vitest-environment jsdom
/**
 * WealthSyncOcrButton 测试
 *
 * 三档覆盖：
 * 1. 入口三选项文案契约（防 UI 改文案）
 * 2. Bug 防回归：CMB「基金持仓」/ CITIC「公募基金持仓」识别结果应派发 ocrType='FUND'
 *    （之前误派发为 'WEALTH'，导致用户在「基金录入」下看到「确认理财持仓」对话框）
 * 3. 通用理财（招行理财列表）仍正确派发 ocrType='WEALTH'，确保本次修复不影响其它分支。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import WealthSyncOcrButton from './WealthSyncOcrButton';
import type { WealthSyncOcrPayload } from './WealthSyncOcrButton';
import type { Account } from '../../types';
import {
  CMB_FUND_HOLDING,
  CITIC_FUND_LIST,
  ALIPAY_FUND_LIST,
} from '../../services/__fixtures__/realOcrSamples';

// 避免 jsdom 加载 tesseract.js（OCR 真实引擎）；运行时由 setMockReturnValue 注入返回文本。
vi.mock('../../services/ocrService', () => ({
  ocrService: { recognize: vi.fn() },
}));

// jsdom 没有 srcObject，把 useSettingsStore.getState().ocrLanguage 兜到稳定默认值
vi.mock('../../store/useSettingsStore', () => ({
  useSettingsStore: { getState: () => ({ ocrLanguage: 'chi_sim+eng' }) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const presetAccount = {
  id: 'acc_1',
  name: '测试账户',
  type: 'CMB',
  balance: 0,
  currency: 'CNY',
  icon: '',
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} as unknown as Account;

/**
 * 在 dialog 步骤3「选择图片」打开后，向隐藏的 file input 注入一个 File 并触发 change。
 * handleFileSelect 异步执行 OCR → parser → onResult；用 waitFor 等待 onResult 被调用。
 *
 * jsdom 24 没有原生 DataTransfer；用 array-like 绕过：构造 { 0: file, length: 1, item: i => ... }
 * 通过 Object.defineProperty 覆盖 input.files 的 getter。
 */
async function uploadFileToStep3(typeLabel = '基金录入') {
  fireEvent.click(screen.getByText('同步资产（截图识别）'));
  fireEvent.click(screen.getByText(typeLabel));
  await waitFor(() => {
    expect(screen.getByText('选择图片')).toBeInTheDocument();
  });
  const inputs = document.querySelectorAll('input[type="file"]');
  const fileInput = inputs[inputs.length - 1] as HTMLInputElement;
  const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  const files = {
    0: file,
    length: 1,
    item: (i: number) => (i === 0 ? file : null),
  } as unknown as FileList;
  Object.defineProperty(fileInput, 'files', {
    configurable: true,
    value: files,
  });
  fireEvent.change(fileInput);
}

describe('OCR 同步向导·入口三选项文案契约', () => {
  it('步骤2对话框展示 资产分布录入 / 理财录入 / 基金录入', () => {
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={() => {}} />,
    );
    fireEvent.click(screen.getByText('同步资产（截图识别）'));
    expect(screen.getByText('资产分布录入')).toBeInTheDocument();
    expect(screen.getByText('理财录入')).toBeInTheDocument();
    expect(screen.getByText('基金录入')).toBeInTheDocument();
  });
});

describe('OCR 同步向导·基金录入路由派发（Bug 防回归）', () => {
  it('招行「基金持仓」页：onResult.ocrType 应为 FUND（不是 WEALTH）', async () => {
    const { ocrService } = await import('../../services/ocrService');
    vi.mocked(ocrService.recognize).mockResolvedValue(CMB_FUND_HOLDING);

    const onResult = vi.fn();
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={onResult} />,
    );

    await uploadFileToStep3();

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    const payload = onResult.mock.calls[0][0] as WealthSyncOcrPayload;
    expect(payload.ocrType).toBe('FUND');          // 关键防回归点
    expect(payload.prefills.length).toBeGreaterThan(0);
    expect(payload.prefills.every((p) => p.holdingType === 'FUND')).toBe(true);
    // marketValue 必须来自卡片金额 991.80（不是顶部总金额 29.52）
    expect(payload.prefills[0].marketValue).toBeCloseTo(991.8, 2);
    // OCR 抓不到基金代码 → 字典自动补码（南方有色金属ETF联接E → 010990）
    expect(payload.prefills[0].fundName).toContain('南方有色金属');
    expect(payload.prefills[0].fundCode).toBe('010990');
  });

  it('中信证券「公募基金持仓」页：onResult.ocrType 应为 FUND（不是 WEALTH）', async () => {
    const { ocrService } = await import('../../services/ocrService');
    vi.mocked(ocrService.recognize).mockResolvedValue(CITIC_FUND_LIST);

    const onResult = vi.fn();
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={onResult} />,
    );

    await uploadFileToStep3();

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    const payload = onResult.mock.calls[0][0] as WealthSyncOcrPayload;
    expect(payload.ocrType).toBe('FUND');          // 关键防回归点
    expect(payload.prefills.length).toBeGreaterThan(0);
    expect(payload.prefills.every((p) => p.holdingType === 'FUND')).toBe(true);
  });

  // 备注：「招行理财列表 → FUND wizard → 仍走 FUND fallback」由 ocrType 派发契约保证；
  //      即使用户在向导选「基金录入」后上传理财图，回退到 parseFundOcrText 仍以 FUND 派发。
  //      WEALTH wizard 行为由 wealthOcrParser.test.ts 覆盖。
});

describe('OCR 同步向导·支付宝基金列表路由派发（Bug 防回归）', () => {
  it('选「基金录入」+ 支付宝基金列表：onResult.ocrType 应为 FUND（不是 WEALTH）', async () => {
    const { ocrService } = await import('../../services/ocrService');
    vi.mocked(ocrService.recognize).mockResolvedValue(ALIPAY_FUND_LIST);

    const onResult = vi.fn();
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={onResult} />,
    );

    await uploadFileToStep3('基金录入');

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    const payload = onResult.mock.calls[0][0] as WealthSyncOcrPayload;
    expect(payload.ocrType).toBe('FUND'); // 关键防回归点
    expect(payload.prefills.length).toBeGreaterThan(0);
    expect(payload.prefills.every((p) => p.holdingType === 'FUND')).toBe(true);
    // 支付宝基金列表专用解析器应切出多支 + 正确市值（长城短债债券E = 50,000.00）
    expect(payload.prefills.some((p) => p.marketValue === 50000)).toBe(true);
  });

  it('选「理财录入」+ 支付宝基金列表：顶层拦截仍派发 FUND（不误派 WEALTH）', async () => {
    const { ocrService } = await import('../../services/ocrService');
    vi.mocked(ocrService.recognize).mockResolvedValue(ALIPAY_FUND_LIST);

    const onResult = vi.fn();
    render(
      <WealthSyncOcrButton presetAccount={presetAccount} accounts={[]} onResult={onResult} />,
    );

    await uploadFileToStep3('理财录入');

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    const payload = onResult.mock.calls[0][0] as WealthSyncOcrPayload;
    expect(payload.ocrType).toBe('FUND'); // 顶层拦截：即便选了「理财录入」也不跳理财页
    expect(payload.prefills.every((p) => p.holdingType === 'FUND')).toBe(true);
  });
});

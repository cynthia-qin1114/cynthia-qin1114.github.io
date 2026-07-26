// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InstitutionLogo, { isKnownInstitution, matchInstitution } from './InstitutionLogo';

describe('InstitutionLogo', () => {
  it('renders an accessible svg with role=img and aria-label', () => {
    const { container } = render(<InstitutionLogo name="招商银行" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-label')).toBe('招商银行');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('matches major institutions by keyword (substring tolerant)', () => {
    // 名称常带后缀/括号，匹配应容错
    expect(isKnownInstitution('招商银行(借记卡)')).toBe(true);
    expect(matchInstitution('支付宝-余额')?.color).toBe('#1677FF');
    expect(matchInstitution('中国银行')?.color).toBe('#B81C22');
    expect(matchInstitution('中信证券')?.color).toBe('#C7000B');
    expect(matchInstitution('工商银行')?.color).toBe('#C7000B');
    expect(matchInstitution('微信理财通')?.color).toBe('#07C160');
  });

  it('does not match unknown names', () => {
    expect(isKnownInstitution('现金钱包')).toBe(false);
    expect(isKnownInstitution('其他')).toBe(false);
  });

  it('falls back to a neutral badge with the first character for unknown names', () => {
    const { container } = render(<InstitutionLogo name="现金钱包" />);
    const text = container.querySelector('svg text');
    expect(text?.textContent).toBe('现');
  });

  it('supports circle shape (renders a circle)', () => {
    const { container } = render(<InstitutionLogo name="工商银行" shape="circle" />);
    expect(container.querySelector('svg circle')).not.toBeNull();
  });
});

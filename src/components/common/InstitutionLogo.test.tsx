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

describe('logo glyphs render as pure vector SVG (no <text>)', () => {
  const vectorLogos: string[] = [
    '支付宝',
    '微信理财通',
    '中国银行',
    '招商银行',
    '建设银行',
    '农业银行',
    '中信证券',
  ];

  it.each(vectorLogos)('%s glyph contains vector shapes and no <text>', (name) => {
    const { container } = render(<InstitutionLogo name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // 重绘的 7 个 logo 主体不使用 <text>
    expect(svg?.querySelector('text')).toBeNull();
    // 且至少包含一个原生矢量图形（path / circle / rect）
    expect(svg?.querySelector('path, circle, rect')).not.toBeNull();
  });

  it('keeps registry order / keywords / colors intact for redrawn logos', () => {
    expect(matchInstitution('微信理财通')?.color).toBe('#07C160');
    expect(matchInstitution('支付宝')?.color).toBe('#1677FF');
    expect(matchInstitution('中国银行')?.color).toBe('#B81C22');
    expect(matchInstitution('招商银行')?.color).toBe('#E60012');
    expect(matchInstitution('建设银行')?.color).toBe('#004C97');
    expect(matchInstitution('农业银行')?.color).toBe('#009944');
    expect(matchInstitution('中信证券')?.color).toBe('#C7000B');
  });
});

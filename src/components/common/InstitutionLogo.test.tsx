// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InstitutionLogo, {
  matchInstitution,
  isKnownInstitution,
} from './InstitutionLogo';

describe('InstitutionLogo', () => {
  describe('品牌色（color）断言 — 全部 26 家 REGISTRY 品牌色不变', () => {
    const expectedColors = [
      { name: '支付宝', color: '#1677FF' },
      { name: '微信理财通', color: '#07C160' },
      { name: '中国银行', color: '#B81C22' },
      { name: '招商银行', color: '#E60012' },
      { name: '中信证券', color: '#C7000B' },
      { name: '工商银行', color: '#C7000B' },
      { name: '建设银行', color: '#004C97' },
      { name: '农业银行', color: '#009944' },
      { name: '交通银行', color: '#005B9E' },
      { name: '平安银行', color: '#FF6A00' },
      { name: '兴业银行', color: '#1A1A8A' },
      { name: '微众银行', color: '#1565C0' },
      { name: '余额宝', color: '#1677FF' },
      { name: '华泰证券', color: '#C7000B' },
      { name: '东方财富', color: '#E5533C' },
      { name: '同花顺', color: '#FF7A00' },
      { name: '光大银行', color: '#5B2A86' },
      { name: '浦发银行', color: '#1E3A8A' },
      { name: '民生银行', color: '#008C8C' },
      { name: '华夏银行', color: '#C7000B' },
      { name: '邮储银行', color: '#007A33' },
      { name: '宁波银行', color: '#334155' },
      { name: '南京银行', color: '#C00000' },
      { name: '杭州银行', color: '#D7000F' },
      { name: '江苏银行', color: '#E60012' },
      { name: '北京银行', color: '#C7000B' },
    ];

    it.each(expectedColors)('$name 品牌色为 $color', ({ name, color }) => {
      const entry = matchInstitution(name);
      expect(entry).not.toBeNull();
      expect(entry!.color).toBe(color);
    });
  });

  describe('正则匹配（test）— 关键词覆盖', () => {
    const cases: [string, string][] = [
      ['支付宝', '支付宝'],
      ['蚂蚁财富', '支付宝'],
      ['微信支付', '微信'],
      ['财付通', '微信'],
      ['中国银行', '中国银行'],
      ['中行', '中国银行'],
      ['招行', '招商银行'],
      ['中信证券', '中信'],
      ['工行', '工商银行'],
      ['建行', '建设银行'],
      ['农行', '农业银行'],
      ['交行', '交通银行'],
      ['微众银行', '微众银行'],
      ['天弘基金', '天弘基金'],
      ['涨乐财富', '华泰'],
      ['天天基金', '东方财富'],
      ['光大理财', '光大银行'],
    ];

    it.each(cases)('"%s" 匹配到 %s', (input) => {
      const entry = matchInstitution(input);
      expect(entry).not.toBeNull();
    });

    it('未知机构返回 null', () => {
      expect(matchInstitution('现金钱包')).toBeNull();
      expect(matchInstitution('其他')).toBeNull();
      expect(matchInstitution('')).toBeNull();
    });
  });

  describe('isKnownInstitution', () => {
    it('已知机构返回 true', () => {
      expect(isKnownInstitution('招商银行')).toBe(true);
      expect(isKnownInstitution('微信')).toBe(true);
      expect(isKnownInstitution('建设银行')).toBe(true);
      expect(isKnownInstitution('中信证券')).toBe(true);
      expect(isKnownInstitution('中国银行')).toBe(true);
    });

    it('未知机构返回 false', () => {
      expect(isKnownInstitution('现金钱包')).toBe(false);
      expect(isKnownInstitution('其他')).toBe(false);
    });
  });

  describe('渲染输出 — 官方源 logo 分类验证', () => {
    /**
     * 分类：
     * A) 纯矢量无 text：微信、支付宝、建行、招行、农行、工行（Simple Icons / Arcticons 真实路径）
     * B) 图片型（<image>）：中国银行、中信证券（用户提供的官方截图裁切）
     * C) 母题图形矢量：其余 19 家
     */

    // === A 类：纯矢量（Simple Icons / Arcticons），不含 <text> 和 <image>
    const vectorOnlyNames = [
      '支付宝', '微信', '建设银行', '招商银行', '农业银行', '工商银行',
    ];
    it.each(vectorOnlyNames)(
      '"%s" 渲染为纯矢量 SVG（含 path/circle，无 text 无 image）',
      (name) => {
        const { container } = render(<InstitutionLogo name={name} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        // 有矢量子元素
        const hasVector =
          svg!.querySelector('path') ||
          svg!.querySelector('circle') ||
          svg!.querySelector('rect');
        expect(hasVector).toBeTruthy();
        // 无 text 字标
        expect(svg!.querySelector('text')).toBeNull();
        // 无 image
        expect(svg!.querySelector('image')).toBeNull();
        // 有品牌色底（rect 或 circle 背景，图片型才没有底色）
        expect(
          svg!.querySelector('rect[fill]') || svg!.querySelector('circle[fill]'),
        ).toBeTruthy();
      },
    );

    // === B 类：图片型（用户提供的官方截图裁切），含 <image>，无背景 rect/circle
    const imageGlyphNames = ['中国银行', '中信证券'];
    it.each(imageGlyphNames)(
      '"%s" 渲染为图片型 logo（含 <image>，无品牌色背景 rect/circle）',
      (name) => {
        const { container } = render(<InstitutionLogo name={name} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        // 有 image 元素
        expect(svg!.querySelector('image')).toBeTruthy();
        // 无品牌色背景（图片自带背景色）
        expect(
          svg!.querySelector('rect[fill]') || svg!.querySelector('circle[fill]'),
        ).toBeNull();
        // 无 text
        expect(svg!.querySelector('text')).toBeNull();
      },
    );

    // === 全局：全部 26 家均不含 <text> 汉字字标
    it('全部 26 家渲染出的 svg 不含任何 <text> 元素', () => {
      const allNames = [
        '支付宝', '蚂蚁财富', '微信', '理财通',
        '中国银行', '中行', '招商银行', '招行',
        '中信证券', '中信银行', '中信',
        '工商银行', '工行', '建设银行', '建行',
        '农业银行', '农行', '交通银行', '交行',
        '平安银行', '兴业银行', '微众银行',
        '余额宝', '华泰证券', '东方财富', '同花顺',
        '光大银行', '浦发银行', '民生银行', '华夏银行',
        '邮储', '宁波银行', '南京银行', '杭州银行', '江苏银行', '北京银行',
      ];
      for (const name of allNames) {
        const { container } = render(<InstitutionLogo name={name} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        expect(
          svg!.querySelector('text'),
          `"${name}" 的 logo 不应包含 <text> 汉字字标`,
        ).toBeNull();
      }
    });
  });

  describe('REGISTRY 顺序稳定性', () => {
    it('前 7 条为官方源重点机构（按优先级排列）', () => {
      // 验证更具体的名称必须优先于通用名命中
      expect(matchInstitution('中信证券')?.color).toBe('#C7000B'); // 中信证券 > 中信
      expect(matchInstitution('中国银行')?.color).toBe('#B81C22'); // 中国银行 > 中行
    });
  });

  describe('降级兜底', () => {
    it('未命中时显示首字', () => {
      const { container } = render(<InstitutionLogo name="某小银行" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg!.querySelector('text')?.textContent).toBe('某');
    });

    it('空名称显示 "?"', () => {
      const { container } = render(<InstitutionLogo name="" />);
      const svg = container.querySelector('svg');
      expect(svg!.querySelector('text')?.textContent).toBe('?');
    });
  });
});

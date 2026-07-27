// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InstitutionLogo, { isKnownInstitution } from './InstitutionLogo';

describe('InstitutionLogo glyphs 冒烟测试 — 官方源 v4', () => {
  /**
   * 覆盖全部 26 家机构（含别名），验证：
   * 1. 每个渲染出 <svg> 且内部有图形子元素
   * 2. isKnownInstitution 判定正确
   * 3. 官方源分类断言：
   *    - A 类（Simple Icons / Arcticons 矢量）：微信/支付宝/建行/招行/农行/工行 → path/circle 无 text/image
   *    - B 类（用户官方截图图片）：中行/中信 → image 元素，无背景 rect/circle
   *    - C 类（母题图形矢量）：其余 19 家 → path/circle 无 text
   */

  const allNames = [
    // === A 类：官方矢量源 (Simple Icons / Arcticons) ===
    '支付宝', '蚂蚁财富',
    '微信', '理财通', '微信支付', '财付通',
    '建设银行', '建行',
    '招商银行', '招行',
    '农业银行', '农行',
    '工商银行', '工行',

    // === B 类：用户提供的官方截图裁切 (PNG image) ===
    '中国银行', '中行',
    '中信证券', '中信银行', '中信',

    // === C 类：母题图形近似绘制 ===
    '交通银行', '交行',
    '平安银行', '平安理财',
    '兴业银行', '兴银理财',
    '微众银行',
    '余额宝', '天弘基金', '天弘',
    '华泰证券', '涨乐财富',
    '东方财富', '天天基金',
    '同花顺',
    '光大银行', '光大理财',
    '浦发银行',
    '民生银行',
    '华夏银行',
    '邮储', '邮政储蓄', '邮政银行',
    '宁波银行',
    '南京银行',
    '杭州银行',
    '江苏银行', '苏银理财',
    '北京银行',
  ];

  describe('基础冒烟 — 全部渲染不报错 + 有图形子元素', () => {
    it.each(allNames)('"%s" 渲染出 svg 且含 >=1 个图形子元素', (name) => {
      const { container } = render(<InstitutionLogo name={name} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      const hasGraphicChild =
        svg!.querySelector('path') ||
        svg!.querySelector('circle') ||
        svg!.querySelector('rect') ||
        svg!.querySelector('image');
      expect(hasGraphicChild).toBeTruthy();
    });
  });

  describe('isKnownInstitution 判定', () => {
    it.each(allNames)('"%s" 为已知机构 (true)', (name) => {
      expect(isKnownInstitution(name)).toBe(true);
    });

    it('非机构名称返回 false', () => {
      expect(isKnownInstitution('现金钱包')).toBe(false);
      expect(isKnownInstitution('其他')).toBe(false);
    });
  });

  describe('官方源分类断言', () => {
    // --- A 类：纯矢量（无 text、无 image） ---
    describe('A 类 — Simple Icons / Arcticons 真实矢量路径', () => {
      it('微信：含 path（Simple Icons 双气泡真实路径）', () => {
        const { container } = render(<InstitutionLogo name="微信" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });

      it('支付宝：含 path（Simple Icons 支付宝真实路径）', () => {
        const { container } = render(<InstitutionLogo name="支付宝" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });

      it('建设银行：含 path（Arcticons CCB 双C 真实字形）', () => {
        const { container } = render(<InstitutionLogo name="建设银行" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });

      it('招商银行：含 path（Arcticons CMB M形山峰真实字形）', () => {
        const { container } = render(<InstitutionLogo name="招商银行" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });

      it('农业银行：含 circle+path（Arcticons ABC 麦穗真实字形）', () => {
        const { container } = render(<InstitutionLogo name="农业银行" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('circle')).toBeTruthy();
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });

      it('工商银行：含 path（Arcticons ICBC 工字框真实字形）', () => {
        const { container } = render(<InstitutionLogo name="工商银行" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('path')).toBeTruthy();
        expect(svg.querySelector('text')).toBeNull();
        expect(svg.querySelector('image')).toBeNull();
      });
    });

    // --- B 类：图片型（用户提供的官方截图） ---
    describe('B 类 — 用户提供的官方 logo 截图裁切', () => {
      it('中国银行：含 image 元素（logo-boc.png），无背景 rect/circle', () => {
        const { container } = render(<InstitutionLogo name="中国银行" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('image')).toBeTruthy();
        // 图片自带品牌色背景，组件不再画底色
        expect(
          svg!.querySelector('rect[fill]') || svg!.querySelector('circle[fill]'),
        ).toBeNull();
        expect(svg.querySelector('text')).toBeNull();
      });

      it('中信证券：含 image 元素（logo-citic.png），无背景 rect/circle', () => {
        const { container } = render(<InstitutionLogo name="中信证券" />);
        const svg = container.querySelector('svg')!;
        expect(svg.querySelector('image')).toBeTruthy();
        expect(
          svg!.querySelector('rect[fill]') || svg!.querySelector('circle[fill]'),
        ).toBeNull();
        expect(svg.querySelector('text')).toBeNull();
      });
    });

    // --- 全局：全部 26 家无 text 字标 ---
    it('全部 36 个名称渲染出的 svg 均不含 <text> 元素', () => {
      for (const name of allNames) {
        const { container } = render(<InstitutionLogo name={name} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        expect(
          svg!.querySelector('text'),
          `"${name}" 不应包含 <text> 汉字字标`,
        ).toBeNull();
      }
    });
  });
});

/**
 * profitColor.test.ts — 收益颜色工具单元测试（中国习惯：涨红跌绿）
 */

import { describe, it, expect } from 'vitest';
import {
  profitColor,
  profitDirection,
  RISE_COLOR,
  FALL_COLOR,
  FLAT_COLOR,
} from './profitColor';

describe('profitColor（涨红跌绿）', () => {
  it('正收益 → 红 #F44336', () => {
    expect(profitColor(810.8)).toBe(RISE_COLOR);
    expect(RISE_COLOR).toBe('#F44336');
  });

  it('负收益 → 绿 #00A870', () => {
    expect(profitColor(-8.82)).toBe(FALL_COLOR);
    expect(FALL_COLOR).toBe('#00A870');
  });

  it('0 → 灰 #757575', () => {
    expect(profitColor(0)).toBe(FLAT_COLOR);
    expect(FLAT_COLOR).toBe('#757575');
  });

  it('undefined / null / NaN → 灰', () => {
    expect(profitColor(undefined)).toBe(FLAT_COLOR);
    expect(profitColor(null)).toBe(FLAT_COLOR);
    expect(profitColor(NaN)).toBe(FLAT_COLOR);
  });
});

describe('profitDirection', () => {
  it('正 → rise，负 → fall，0 → flat', () => {
    expect(profitDirection(1)).toBe('rise');
    expect(profitDirection(-1)).toBe('fall');
    expect(profitDirection(0)).toBe('flat');
  });

  it('未知值 → flat', () => {
    expect(profitDirection(undefined)).toBe('flat');
    expect(profitDirection(null)).toBe('flat');
    expect(profitDirection(NaN)).toBe('flat');
  });
});

/**
 * profitColor — 收益颜色工具（中国习惯：涨红跌绿）
 *
 * ⚠️ 现有 MUI success(绿)=盈 / error(红)=亏 与中国股市习惯相反。
 * 本工具统一约定：正收益=红、负收益=绿、0/未知=灰。
 * 所有投资相关收益颜色统一走 profitColor()，不再直接用 MUI success/error。
 */

/** 涨 / 盈 → 红 */
export const RISE_COLOR = '#F44336';
/** 跌 / 亏 → 绿 */
export const FALL_COLOR = '#00A870';
/** 持平 / 未知 → 灰 */
export const FLAT_COLOR = '#757575';

/**
 * 根据收益数值返回对应颜色（涨红跌绿）。
 * @param v 收益数值（金额或比例均可）；undefined/null 视为未知
 * @returns 十六进制颜色字符串
 */
export function profitColor(v?: number | null): string {
  if (v === undefined || v === null || Number.isNaN(v)) return FLAT_COLOR;
  if (v > 0) return RISE_COLOR;
  if (v < 0) return FALL_COLOR;
  return FLAT_COLOR;
}

/**
 * 判断收益方向：'rise' | 'fall' | 'flat'。
 * @param v 收益数值
 */
export function profitDirection(v?: number | null): 'rise' | 'fall' | 'flat' {
  if (v === undefined || v === null || Number.isNaN(v)) return 'flat';
  if (v > 0) return 'rise';
  if (v < 0) return 'fall';
  return 'flat';
}

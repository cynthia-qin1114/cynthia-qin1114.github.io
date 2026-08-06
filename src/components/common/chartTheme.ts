import type { CSSProperties } from 'react';

/**
 * chartTheme — 图表暖光纸感共享样式
 * 集中管理 tooltip / 坐标轴 / 网格线 的视觉 token，保证各图表一致。
 * 适配暖纸底：暖白 tooltip + 黄铜细边 + 墨色坐标文字 + 极淡暖灰网格。
 */

/** 暖白圆角 tooltip（Recharts Tooltip contentStyle）— 暖纸面 */
export const techTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(156,107,46,0.28)',
  boxShadow: '0 8px 24px rgba(33,31,26,0.12)',
  background: 'rgba(252,250,245,0.97)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: '8px 12px',
  fontSize: 12,
  color: '#211F1A',
};

/** 坐标轴刻度文字（暖灰、小号，暖纸底可读） */
export const techAxisTick = { fontSize: 11, fill: '#6E685C' };

/** 网格线颜色（极淡暖灰，弱化存在感，暖纸底不刺眼） */
export const techGridStroke = 'rgba(33,31,26,0.07)';

import type { CSSProperties } from 'react';

/**
 * chartTheme — 图表科技简约风共享样式
 * 集中管理 tooltip / 坐标轴 / 网格线 的视觉 token，保证各图表一致。
 */

/** 毛玻璃圆角 tooltip（Recharts Tooltip contentStyle） */
export const techTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.08)',
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: '8px 12px',
  fontSize: 12,
};

/** 坐标轴刻度文字（淡灰、小号） */
export const techAxisTick = { fontSize: 11, fill: '#94A3B8' };

/** 网格线颜色（极淡，弱化存在感） */
export const techGridStroke = '#EEF2F7';

import type { CSSProperties } from 'react';

/**
 * chartTheme — 图表暗色科技风共享样式
 * 集中管理 tooltip / 坐标轴 / 网格线 的视觉 token，保证各图表一致。
 * 适配深海军蓝底：毛玻璃深色 tooltip + 霓虹青边框 + 淡灰坐标文字 + 极淡网格。
 */

/** 毛玻璃圆角 tooltip（Recharts Tooltip contentStyle）— 暗底高亮 */
export const techTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(37,99,235,0.2)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 12px rgba(37,99,235,0.15)',
  background: 'rgba(30,41,59,0.95)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: '8px 12px',
  fontSize: 12,
  color: '#F1F5F9',
};

/** 坐标轴刻度文字（淡灰、小号，暗底可读） */
export const techAxisTick = { fontSize: 11, fill: '#94A3B8' };

/** 网格线颜色（极淡，弱化存在感，暗底不刺眼） */
export const techGridStroke = 'rgba(148,163,184,0.08)';

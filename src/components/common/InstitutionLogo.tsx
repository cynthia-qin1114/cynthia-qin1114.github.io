import React from 'react';

/**
 * InstitutionLogo — 拟真品牌标志组件
 *
 * 依据账户 / 机构名称，匹配并渲染对应机构的「简化手绘 SVG 标志」
 * （非官方授权图，仅作近似还原：品牌色 + 特征图形/字）。
 *
 * 设计要点：
 * - 纯内联 <svg>，不引入任何外部图片或图标字体依赖，保证 PWA 离线可用。
 * - 命中机构 → 渲染品牌色圆角方块(app-icon 风) / 圆形头像风 + 特征图形。
 * - 未命中 → 降级为「中性色圆角方块 + 名称首字」的通用金融徽章，绝不报错。
 * - 带 role="img" + aria-label，保证可访问性；文字名称仍由调用方另行展示。
 */

export interface InstitutionEntry {
  /** 关键词正则，命中即使用此 logo */
  test: RegExp;
  /** 品牌主色（圆角方块 / 圆形底色） */
  color: string;
  /** 前景图形：在 48x48 画布、品牌色背景之上绘制 */
  glyph: () => React.ReactNode;
}

/** 通用文字字形（白字，置于品牌色背景之上） */
const charGlyph = (text: string, fontSize = 22): React.ReactNode => {
  const y = 24 + fontSize * 0.36;
  return (
    <text
      x="24"
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight={700}
      fill="#FFFFFF"
      fontFamily='"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
    >
      {text}
    </text>
  );
};

/** 中国银行：方孔圆钱 + 「中」意象（红圈 + 白字） */
const bocGlyph = (): React.ReactNode => (
  <>
    <circle cx="24" cy="24" r="15" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
    {charGlyph('中', 18)}
  </>
);

/** 招商银行：金葵花（放射花瓣 + 花心） */
const cmbGlyph = (): React.ReactNode => (
  <>
    {Array.from({ length: 12 }, (_, i) => (
      <ellipse
        key={i}
        cx="24"
        cy="11.5"
        rx="2.3"
        ry="6"
        fill="#FFD21E"
        transform={`rotate(${i * 30} 24 24)`}
      />
    ))}
    <circle cx="24" cy="24" r="4.6" fill="#FFD21E" />
  </>
);

/**
 * 品牌注册表（按关键词匹配）。
 * 顺序敏感：更具体的机构名放前面（如「中信证券」优先于通用「银行」）。
 */
const REGISTRY: InstitutionEntry[] = [
  { test: /支付宝|蚂蚁(财富|基金)?/i, color: '#1677FF', glyph: () => charGlyph('支') },
  { test: /理财通|微信(理财)?/i, color: '#07C160', glyph: () => charGlyph('财') },
  { test: /中国银?行|中行|中银理财/i, color: '#B81C22', glyph: bocGlyph },
  { test: /招商|招行|招银理财/i, color: '#E60012', glyph: cmbGlyph },
  { test: /中信证券|中信银行|中信|信银理财/i, color: '#C7000B', glyph: () => charGlyph('中信', 16) },
  { test: /工商?银行|工行/i, color: '#C7000B', glyph: () => charGlyph('工') },
  { test: /建设?银行|建行/i, color: '#004C97', glyph: () => charGlyph('建') },
  { test: /农业?银行|农行|农银理财/i, color: '#009944', glyph: () => charGlyph('农') },
  { test: /交通?银行|交行/i, color: '#005B9E', glyph: () => charGlyph('交') },
  { test: /平安?银行|平安理财/i, color: '#FF6A00', glyph: () => charGlyph('平') },
  { test: /兴业?银行|兴银理财/i, color: '#1A1A8A', glyph: () => charGlyph('兴') },
  { test: /微众?银行/i, color: '#1565C0', glyph: () => charGlyph('微') },
  { test: /余额宝|天弘基金|天弘/i, color: '#1677FF', glyph: () => charGlyph('余') },
  { test: /华泰|涨乐财富/i, color: '#C7000B', glyph: () => charGlyph('华泰', 16) },
  { test: /东方财富|天天基金/i, color: '#E5533C', glyph: () => charGlyph('东') },
  { test: /同花顺/i, color: '#FF7A00', glyph: () => charGlyph('同') },
  { test: /光大?银行|光大理财/i, color: '#5B2A86', glyph: () => charGlyph('光') },
  { test: /浦发?银行/i, color: '#1E3A8A', glyph: () => charGlyph('浦') },
  { test: /民生?银行/i, color: '#008C8C', glyph: () => charGlyph('民') },
  { test: /华夏?银行/i, color: '#C7000B', glyph: () => charGlyph('华') },
  { test: /邮储|邮政储蓄|邮政银行/i, color: '#007A33', glyph: () => charGlyph('邮') },
  { test: /宁波?银行/i, color: '#334155', glyph: () => charGlyph('宁') },
  { test: /南京?银行/i, color: '#C00000', glyph: () => charGlyph('南') },
  { test: /杭州?银行/i, color: '#D7000F', glyph: () => charGlyph('杭') },
  { test: /江苏?银行|苏银理财/i, color: '#E60012', glyph: () => charGlyph('苏') },
  { test: /北京?银行/i, color: '#C7000B', glyph: () => charGlyph('京') },
];

/** 由名称匹配机构条目；未命中返回 null。 */
export function matchInstitution(name: string): InstitutionEntry | null {
  if (!name) return null;
  for (const entry of REGISTRY) {
    if (entry.test.test(name)) return entry;
  }
  return null;
}

/** 名称是否命中已知机构（用于调用方决定是否走 logo 分支）。 */
export function isKnownInstitution(name: string): boolean {
  return matchInstitution(name) !== null;
}

export interface InstitutionLogoProps {
  /** 机构 / 账户名称，用于关键词匹配与无障碍标签 */
  name: string;
  /** 尺寸（px），默认 40 */
  size?: number;
  /** 形状：'rounded' 圆角方块(app图标风) | 'circle' 圆形头像风，默认 'rounded' */
  shape?: 'rounded' | 'circle';
  /** 透传到 <svg> 的 className */
  className?: string;
}

/**
 * InstitutionLogo — 渲染机构品牌标志。
 * 未命中时降级为中性色圆角方块 + 名称首字。
 */
const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  name,
  size = 40,
  shape = 'rounded',
  className,
}) => {
  const entry = matchInstitution(name ?? '');
  const color = entry?.color ?? '#E2E8F0';
  const inner: React.ReactNode = entry
    ? entry.glyph()
    : (() => {
        const first = (name || '?').trim().charAt(0) || '💳';
        return (
          <text
            x="24"
            y={24 + 20 * 0.36}
            textAnchor="middle"
            fontSize={20}
            fontWeight={700}
            fill="#475569"
            fontFamily='"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
          >
            {first}
          </text>
        );
      })();

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={name || '机构'}
      focusable="false"
      className={className}
      style={{ display: 'block' }}
    >
      {shape === 'circle' ? (
        <circle cx="24" cy="24" r="23.5" fill={color} />
      ) : (
        <rect x="1" y="1" width="46" height="46" rx="12" fill={color} />
      )}
      {inner}
    </svg>
  );
};

export default InstitutionLogo;

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
 * - 7 个重点机构（微信/支付宝/中行/招行/建行/农行/中信）的 glyph 全部用
 *   原生 <path>/<circle>/<rect> 绘制，主体不使用 <text>，呈拟真 app-icon 风格。
 */

export interface InstitutionEntry {
  /** 关键词正则，命中即使用此 logo */
  test: RegExp;
  /** 品牌主色（圆角方块 / 圆形底色） */
  color: string;
  /** 前景图形：在 48x48 画布、品牌色背景之上绘制 */
  glyph: () => React.ReactNode;
}

/** 通用文字字形（白字，置于品牌色背景之上）— 仅用于未重绘的其余机构 */
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

/* ===================== 7 个重绘机构 glyph（纯 SVG） ===================== */

/** 微信 / 理财通（#07C160）：双白色聊天气泡（大气泡左上偏中，小气泡右下） */
const wechatGlyph = (): React.ReactNode => (
  <g>
    {/* 大气泡（左上偏中） */}
    <rect x="10.5" y="11.5" width="18" height="13.5" rx="4.5" fill="#FFFFFF" />
    <circle cx="17" cy="18.2" r="1.5" fill="#07C160" />
    <circle cx="21.5" cy="18.2" r="1.5" fill="#07C160" />
    <circle cx="26" cy="18.2" r="1.5" fill="#07C160" />
    {/* 小气泡（右下） */}
    <rect x="25" y="24" width="12.5" height="11.5" rx="3.8" fill="#FFFFFF" />
    <circle cx="31.2" cy="29.7" r="1.4" fill="#07C160" />
  </g>
);

/** 支付宝 / 蚂蚁（#1677FF）：白色 stylized「支」字（path 绘制） */
const alipayGlyph = (): React.ReactNode => (
  <g>
    {/* 上部一横 */}
    <rect x="13.5" y="14.5" width="21" height="3.4" rx="1.7" fill="#FFFFFF" />
    {/* 中部竖 */}
    <rect x="22.3" y="14.5" width="3.4" height="18.5" rx="1.7" fill="#FFFFFF" />
    {/* 斜撇（左上） */}
    <path
      d="M23 21 L12.5 31.5"
      stroke="#FFFFFF"
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />
    {/* 下部大圆弧弯钩（右下） */}
    <path
      d="M25 22 C30.5 26 33.5 31 30 35.2 C28.2 37.2 25 36 25.4 33.2"
      stroke="#FFFFFF"
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />
  </g>
);

/** 中国银行 BOC（#B81C22）：古钱币方孔（红底，白色圆环挖方孔） */
const bocGlyph = (): React.ReactNode => (
  <path
    fill="#FFFFFF"
    fillRule="evenodd"
    d="M11 24 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z M19 19 h10 v10 h-10 Z"
  />
);

/** 招商银行 CMB（#E60012）：白色对称「M」形（中间 V 底部，两侧向上展开） */
const cmbGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 33 L13 15 L24 27 L35 15 L35 33" />
  </g>
);

/** 建设银行 CCB（#004C97）：白色大 C 形弧 + 内部旋转 45° 菱形 */
const ccbGlyph = (): React.ReactNode => (
  <g>
    {/* 外部大 C 形弧（开口朝右） */}
    <path
      d="M30 14 A12 12 0 1 0 30 34"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4.6"
      strokeLinecap="round"
    />
    {/* 内部白色菱形（正方形旋转 45°） */}
    <rect
      x="19"
      y="19"
      width="10"
      height="10"
      rx="1.4"
      transform="rotate(45 24 24)"
      fill="#FFFFFF"
    />
  </g>
);

/** 农业银行 ABC（#009944）：白色麦穗（主茎 + 对称叶 + 底部横杠） */
const abcGlyph = (): React.ReactNode => (
  <g fill="#FFFFFF">
    {/* 中央主茎 */}
    <rect x="22.5" y="13.5" width="3" height="21.5" rx="1.5" />
    {/* 底部横杠 */}
    <rect x="13.5" y="33" width="21" height="3" rx="1.5" />
    {/* 左上层叶 */}
    <path d="M23.5 20.5 C18 19.5 15 22.5 13 27.5 C18 27.5 22 24.5 23.5 21.5 Z" />
    {/* 右上层叶 */}
    <path d="M24.5 20.5 C30 19.5 33 22.5 35 27.5 C30 27.5 26 24.5 24.5 21.5 Z" />
    {/* 左下层叶 */}
    <path d="M23.5 26.5 C20 25.5 17.8 28.5 16.5 31.5 C20 31.5 22.5 29.5 23.5 27.5 Z" />
    {/* 右下层叶 */}
    <path d="M24.5 26.5 C28 25.5 30.2 28.5 31.5 31.5 C28 31.5 25.5 29.5 24.5 27.5 Z" />
  </g>
);

/** 中信证券 CITIC（#C7000B）：居中 4 条粗白色竖条 */
const citicGlyph = (): React.ReactNode => (
  <g fill="#FFFFFF">
    <rect x="14" y="15" width="3.6" height="18" rx="1.8" />
    <rect x="19.8" y="15" width="3.6" height="18" rx="1.8" />
    <rect x="25.6" y="15" width="3.6" height="18" rx="1.8" />
    <rect x="31.4" y="15" width="3.6" height="18" rx="1.8" />
  </g>
);

/**
 * 品牌注册表（按关键词匹配）。
 * 顺序敏感：更具体的机构名放前面（如「中信证券」优先于通用「银行」）。
 * 仅替换了 7 个重点机构的 glyph（纯 SVG），其余条目顺序 / 颜色 / 关键词不变。
 */
const REGISTRY: InstitutionEntry[] = [
  { test: /支付宝|蚂蚁(财富|基金)?/i, color: '#1677FF', glyph: alipayGlyph },
  { test: /理财通|微信(理财)?/i, color: '#07C160', glyph: wechatGlyph },
  { test: /中国银?行|中行|中银理财/i, color: '#B81C22', glyph: bocGlyph },
  { test: /招商|招行|招银理财/i, color: '#E60012', glyph: cmbGlyph },
  { test: /中信证券|中信银行|中信|信银理财/i, color: '#C7000B', glyph: citicGlyph },
  { test: /工商?银行|工行/i, color: '#C7000B', glyph: () => charGlyph('工') },
  { test: /建设?银行|建行/i, color: '#004C97', glyph: ccbGlyph },
  { test: /农业?银行|农行|农银理财/i, color: '#009944', glyph: abcGlyph },
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

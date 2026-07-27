import React from 'react';
import { BOC_LOGO_DATA_URI, CITIC_LOGO_DATA_URI } from '../../assets/logoData';

/**
 * InstitutionLogo — 官方品牌标志组件 v4（真官方源版）
 *
 * 依据账户 / 机构名称，匹配并渲染对应机构的**官方品牌 logo**。
 *
 * 数据来源（按优先级）：
 * - Simple Icons（simple-icons/simple-icons）— 微信、支付宝：真实官方单色矢量路径。
 * - Arcticons（arcticons）— 建行/招行/农行/工行：安卓官方图标包真实品牌字形。
 * - 用户提供的官方截图裁切 — 中行、中信：用户提供的官方 logo 截图，
 *   经 PIL 裁切为纯 logo 区域（PNG，透明背景），以 base64 data URI 内联嵌入。
 * - 其余 19 家 — 采用各机构真实 logo 的图形母题近似绘制（纯矢量）。
 *
 * 设计要点：
 * - 纯内联 <svg> + 可选 <image>（仅 BOC/CITIC 用官方裁切 PNG 的 base64 data URI），不引入外部字体依赖。
 * - 前 7 家重点机构均为**官方源**（非手绘近似）；其余 19 家为母题图形。
 * - 命中机构 → 渲染品牌色圆角方块(app-icon 风) / 圆形头像风 + 标志。
 * - 未命中 → 降级为「中性色圆角方块 + 名称首字」的通用金融徽章。
 * - 带 role="img" + aria-label，保证可访问性。
 */

export interface InstitutionEntry {
  /** 关键词正则，命中即使用此 logo */
  test: RegExp;
  /** 品牌主色（圆角方块 / 圆形底色） */
  color: string;
  /** 前景图形：在 48x48 画布、品牌色背景之上绘制 */
  glyph: () => React.ReactNode;
}

/** 方孔古钱（圆外圈 + 方形内孔 + 十字，仿多家中资银行真实 logo 母题） */
const coinGlyph = (innerRing = false): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={2.6}>
    <circle cx="24" cy="24" r="15" />
    {innerRing ? <circle cx="24" cy="24" r="11" strokeWidth={1.2} opacity={0.65} /> : null}
    <rect x="19.5" y="19.5" width="9" height="9" />
    <line x1="24" y1="9" x2="24" y2="19.5" strokeWidth={2} />
    <line x1="24" y1="28.5" x2="24" y2="39" strokeWidth={2} />
    <line x1="9" y1="24" x2="19.5" y2="24" strokeWidth={2} />
    <line x1="28.5" y1="24" x2="39" y2="24" strokeWidth={2} />
  </g>
);

/* ===================== 官方 Logo 源（7 家重点机构）===================== */

/**
 * 微信 / 理财通（#07C160）：Simple Icons 官方微信双气泡
 * 来源：https://github.com/simple-icons/simple-icons — 单色官方矢量路径
 */
const WECHAT_PATH =
  'M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z';

const wechatGlyph = (): React.ReactNode => (
  <g transform="translate(24,24) scale(1.55) translate(-12,-12)" fill="#FFFFFF">
    <path d={WECHAT_PATH} />
  </g>
);

/**
 * 支付宝 / 蚂蚁（#1677FF）：Simple Icons 官方支付宝 logo
 * 来源：https://github.com/simple-icons/simple-icons — 单色官方矢量路径
 */
const ALIPAY_PATH =
  'M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809';

const alipayGlyph = (): React.ReactNode => (
  <g transform="translate(24,24) scale(1.65) translate(-12,-12)" fill="#FFFFFF">
    <path d={ALIPAY_PATH} />
  </g>
);

/**
 * 中国银行 / 中行 / 中银理财（#B81C22）：用户提供的官方 logo 截图裁切
 * 来源：用户提供的官方中国银行 logo 截图（红圆古钱），经 PIL 自动裁切去文字区域。
 * 文件：src/assets/logo-boc.png（260×168，透明背景，含完整圆形古钱）
 */
const bocGlyph = (): React.ReactNode => (
  <image href={BOC_LOGO_DATA_URI} x="0" y="0" width="48" height="48" preserveAspectRatio="xMidYMid meet" />
);

/**
 * 招商银行 / 招行 / 招银理财（#E60012）：Arcticons 官方招行 logo
 * 来源：https://api.iconify.design/arcticons:china-merchants-bank.svg
 * 安卓官方图标包真实品牌字形（M 形山峰 + 外圆环 + 右侧速度线）
 */
const CMB_PATHS = [
  // 左 M 形
  'm22.064 32.79l-6.012-14.8l-6.012 14.8z',
  // 右 M 形
  'm33.884 32.79l-6.012-14.8l-6.012 14.8z',
  // 外框（左右斜边 + 底座）
  'M11.07 39.397l-4.537-6.58l11.35-27.701l5.997 14.799l5.997-14.8l11.35 27.702l-4.536 6.58z',
  // 外圆环
  'M45.5 24c0 11.874-9.626 21.5-21.5 21.5S2.5 35.874 2.5 24S12.126 2.5 24 2.5S45.5 12.126 45.5 24',
  // 右侧速度线
  'm35.381 18.552h9.414', 'm4.402 12.233h3.985', 'M36.217 20.59h9.01',
  'm8.174 2.04h8.403', 'm7.568 2.038h7.58', 'm6.744 2.039h6.583',
  'm5.747 2.039h5.386',
];

const cmbGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
    {CMB_PATHS.map((d, i) => (
      <path key={i} d={d} strokeWidth={i === 3 ? 1.8 : i === 4 ? 1.8 : 2.4} />
    ))}
  </g>
);

/**
 * 中信证券 / 中信银行 / 中信（#C7000B）：用户提供的官方中信 logo 截图裁切
 * 来源：用户提供的中信证券官方 logo 截图（棕红圆底门形标），经 PIL 裁透明边。
 * 文件：src/assets/logo-citic.png（204×204，透明背景，含完整圆形门形标）
 */
const citicGlyph = (): React.ReactNode => (
  <image href={CITIC_LOGO_DATA_URI} x="0" y="0" width="48" height="48" preserveAspectRatio="xMidYMid meet" />
);

/**
 * 工商银行 / 工行（#C7000B）：Arcticons 官方工行 logo
 * 来源：https://api.iconify.design/arcticons:icbc.svg
 * 安卓官方图标包真实品牌字形（工字形框架）
 */
const ICBC_PATH = 'M21.27 42.5H5.5V28.44h12.46v-8.88H5.5V5.5h15.77m5.46 0H42.5v14.06H30.04v8.88H42.5V42.5H26.73';

const icbcGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICBC_PATH} strokeWidth={2.6} />
  </g>
);

/**
 * 建设银行 / 建行（#004C97）：Arcticons 官方建行 logo
 * 来源：https://api.iconify.design/arcticons:china-construction-bank.svg
 * 安卓官方图标包真实品牌字形（双 C 弧形包围菱形）
 */
const CCB_PATH = 'm23.997 8.251l12.498 12.294l-3.435 3.381h0l-8.11-7.981l-10.128 9.969l10.13 9.968l8.108-7.981h0l8.677.053h0A18.125 18.125 0 1 1 23.997 8.25m3.745-2.189l11.79 11.494l2.913-2.868l-7.634-7.763c-3.527-3.587-8.507-4.782-11.971-1.505c.373-.106 3.786-.446 4.902.642';

const ccbGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
    <path d={CCB_PATH} strokeWidth={2.6} />
  </g>
);

/**
 * 农业银行 / 农行 / 农银理财（#009944）：Arcticons 官方农行 logo
 * 来源：https://api.iconify.design/arcticons:agricultural-bank-of-china.svg
 * 安卓官方图标包真实品牌字形（外圆环 + 麦穗主茎 + 分叉叶）
 * 注：原 SVG 使用 <defs>/<use>，此处已内联为独立元素避免 id 冲突。
 */
const abcGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
    {/* 外圆环 */}
    <circle cx="24" cy="24" r="21.5" strokeWidth={1.8} />
    {/* 麦穗左茎 */}
    <path d="M16.866 8.938v20.953c0 .627.504 1.131 1.13 1.131h3.671v9.493C13.438 39.355 7.32 32.31 7.32 24a16.68 16.68 0 0 1 9.538-15.074" strokeWidth={1.8} />
    {/* 麦穗右茎 */}
    <path d="M31.143 8.938v20.953c0 .627-.505 1.131-1.132 1.131h-3.67v9.493C34.562 39.355 40.681 32.31 40.681 24h0a16.68 16.68 0 0 0-9.546-15.077" strokeWidth={1.8} />
    {/* 顶部横杠 */}
    <path d="M20.524 2.782h6.952v13.089a.564.564 0 0 1-.566.565h-1.63c-.851 0-1.279.505-1.279.505s-.428-.505-1.278-.505H21.09a.564.564 0 0 1-.566-.565V2.782" strokeWidth={1.8} />
    {/* 主茎 */}
    <path d="M24 16.83v14.042" strokeWidth={2.2} />
    {/* 底部麦粒 */}
    <path d="M16.865 23.809c.175.132.379.22.61.22l5.127.004c.928 0 1.398 1.409 1.398 1.409s.47-1.409 1.398-1.41l5.127-.003c.231 0 .435-.088.61-.22" strokeWidth={1.8} />
  </g>
);

/* ===================== 其余 19 家：图形母题近似绘制 ===================== */

/** 交通银行 / 交行（#005B9E）：蓝底白色方孔古钱 */
const bcmGlyph = (): React.ReactNode => coinGlyph();

/** 平安银行 / 平安理财（#FF6A00）：白色平安结（双交叠弧环） */
const pinganGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round">
    <path d="M24 12 C16 18 16 30 24 36 C32 30 32 18 24 12 Z" />
    <path d="M12 24 C18 16 30 16 36 24 C30 32 18 32 12 24 Z" />
  </g>
);

/** 兴业银行 / 兴银理财（#1A1A8A）：藏青底白色方孔古钱 */
const cibGlyph = (): React.ReactNode => coinGlyph();

/** 微众银行（#1565C0）：蓝色底 + 白色 3x3 圆点矩阵 */
const webankGlyph = (): React.ReactNode => (
  <g fill="#FFFFFF">
    {[14, 24, 34].flatMap((x) =>
      [14, 24, 34].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.6} />),
    )}
  </g>
);

/** 余额宝 / 天弘基金 / 天弘（#1677FF）：蓝色底 + 白色钱袋 */
const yuebaoGlyph = (): React.ReactNode => (
  <g fill="#FFFFFF">
    <path d="M14 22 C14 30 18 38 24 38 C30 38 34 30 34 22 C30 24 18 24 14 22 Z" />
    <rect x="19" y="13.5" width="10" height="3.6" rx="1.8" />
  </g>
);

/** 华泰 / 涨乐财富（#C7000B）：红色底 + 白色上升箭头/山峰（表达「涨」） */
const huataiGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 34 L20 26 L27 31 L36 16" />
    <path d="M30 16 L36 16 L36 22" />
  </g>
);

/** 东方财富 / 天天基金（#E5533C）：橙红底 + 白色上升 K 线（两根阳线蜡烛） */
const eastmoneyGlyph = (): React.ReactNode => (
  <g>
    <line x1="14" y1="12" x2="14" y2="36" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
    <rect x="10.5" y="20" width="7" height="9" rx="1" fill="#FFFFFF" />
    <line x1="34" y1="10" x2="34" y2="30" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
    <rect x="30.5" y="14" width="7" height="7" rx="1" fill="#FFFFFF" />
  </g>
);

/** 同花顺（#FF7A00）：橙色底 + 白色向上箭头 + 圆点（简版笑脸 K 线） */
const tonghuashunGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 30 L21 22 L28 27 L35 15" />
    <path d="M30 15 L35 15 L35 20" />
  </g>
);

/** 光大银行 / 光大理财（#5B2A86）：紫色底 + 白色光环（中心圆 + 放射光芒） */
const cebGlyph = (): React.ReactNode => {
  const rays = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    const x1 = 24 + Math.cos(a) * 11;
    const y1 = 24 + Math.sin(a) * 11;
    const x2 = 24 + Math.cos(a) * 16;
    const y2 = 24 + Math.sin(a) * 16;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />;
  });
  return (
    <g fill="#FFFFFF">
      <circle cx="24" cy="24" r="5.6" />
      {rays}
    </g>
  );
};

/** 浦发银行（#1E3A8A）：藏青底 + 白色波浪线（表达浦江） */
const spdbGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round">
    <path d="M11 22 C16 17 20 27 25 22 C30 17 34 27 37 22" />
    <path d="M11 30 C16 25 20 35 25 30 C30 25 34 35 37 30" />
  </g>
);

/** 民生银行（#008C8C）：蓝绿底 + 白色心形（民生 = 惠民） */
const cmbcGlyph = (): React.ReactNode => (
  <path
    d="M24 34 C12 26 14 16 20 16 C23 16 24 19 24 20 C24 19 25 16 28 16 C34 16 36 26 24 34 Z"
    fill="#FFFFFF"
  />
);

/** 华夏银行（#C7000B）：红色底 + 白色双环（同心圆环） */
const hxbGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={3}>
    <circle cx="24" cy="24" r="13" />
    <circle cx="24" cy="24" r="6.5" />
  </g>
);

/** 邮储 / 邮政储蓄 / 邮政银行（#007A33）：绿色底 + 白色信封（邮政意象） */
const psbcGlyph = (): React.ReactNode => (
  <g fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinejoin="round">
    <rect x="12" y="15" width="24" height="18" rx="3" />
    <path d="M13 17 L24 26 L35 17" />
  </g>
);

/** 城市银行（宁波/南京/杭州/江苏/北京）：白色方孔古钱，各自品牌色区分 */
const cityGlyph = (): React.ReactNode => coinGlyph();

/**
 * 品牌注册表（按关键词匹配）。
 * 顺序敏感：更具体的机构名放前面（如「中信证券」优先于通用「银行」）。
 * 前 7 家使用**官方源 logo**（Simple Icons / Arcticons / 用户提供的官方截图）；
 * 其余 19 家采用图形母题近似绘制。
 */
const REGISTRY: InstitutionEntry[] = [
  { test: /支付宝|蚂蚁(财富|基金)?/i, color: '#1677FF', glyph: alipayGlyph },
  { test: /理财通|微信(理财|支付)?|财付通/i, color: '#07C160', glyph: wechatGlyph },
  { test: /中国银?行|中行|中银理财/i, color: '#B81C22', glyph: bocGlyph },
  { test: /招商|招行|招银理财/i, color: '#E60012', glyph: cmbGlyph },
  { test: /中信证券|中信银行|中信|信银理财/i, color: '#C7000B', glyph: citicGlyph },
  { test: /工商?银行|工行/i, color: '#C7000B', glyph: icbcGlyph },
  { test: /建设?银行|建行/i, color: '#004C97', glyph: ccbGlyph },
  { test: /农业?银行|农行|农银理财/i, color: '#009944', glyph: abcGlyph },
  { test: /交通?银行|交行/i, color: '#005B9E', glyph: bcmGlyph },
  { test: /平安?银行|平安理财/i, color: '#FF6A00', glyph: pinganGlyph },
  { test: /兴业?银行|兴银理财/i, color: '#1A1A8A', glyph: cibGlyph },
  { test: /微众?银行/i, color: '#1565C0', glyph: webankGlyph },
  { test: /余额宝|天弘基金|天弘/i, color: '#1677FF', glyph: yuebaoGlyph },
  { test: /华泰|涨乐财富/i, color: '#C7000B', glyph: huataiGlyph },
  { test: /东方财富|天天基金/i, color: '#E5533C', glyph: eastmoneyGlyph },
  { test: /同花顺/i, color: '#FF7A00', glyph: tonghuashunGlyph },
  { test: /光大?银行|光大理财/i, color: '#5B2A86', glyph: cebGlyph },
  { test: /浦发?银行/i, color: '#1E3A8A', glyph: spdbGlyph },
  { test: /民生?银行/i, color: '#008C8C', glyph: cmbcGlyph },
  { test: /华夏?银行/i, color: '#C7000B', glyph: hxbGlyph },
  { test: /邮储|邮政储蓄|邮政银行/i, color: '#007A33', glyph: psbcGlyph },
  { test: /宁波?银行/i, color: '#334155', glyph: cityGlyph },
  { test: /南京?银行/i, color: '#C00000', glyph: cityGlyph },
  { test: /杭州?银行/i, color: '#D7000F', glyph: cityGlyph },
  { test: /江苏银行|苏银理财/i, color: '#E60012', glyph: cityGlyph },
  { test: /北京?银行/i, color: '#C7000B', glyph: cityGlyph },
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
 * InstitutionLogo — 渲染机构品牌标志（官方源 + 图形母题混合）。
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

  // 对于图片型 glyph（BOC/CITIC），图片自带品牌色背景，不需要组件再画底色
  const isImageGlyph = name && (
    /中国银?行|中行|中银理财/.test(name) ||
    /中信证券|中信银行|中信|信银理财/.test(name)
  );

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
      {!isImageGlyph &&
        (shape === 'circle' ? (
          <circle cx="24" cy="24" r="23.5" fill={color} />
        ) : (
          <rect x="1" y="1" width="46" height="46" rx="12" fill={color} />
        ))}
      {inner}
    </svg>
  );
};

export default InstitutionLogo;

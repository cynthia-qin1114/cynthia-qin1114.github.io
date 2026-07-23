/**
 * accountBrand — 账户机构品牌解析
 *
 * 根据账户名识别所属机构，返回「简称 + 品牌色」，用于账户头像与列表 Icon，
 * 让 招商银行 / 支付宝 / 微信 等一眼可辨，整体沿用简约风。
 *
 * 说明：品牌色为各机构主视觉色的近似取值；未匹配时回退到名称首字 + 主题蓝。
 */

export interface AccountBrand {
  /** 头像内显示的 1 字简称 */
  short: string;
  /** 品牌主色（近似） */
  color: string;
}

const BANK_RULES: { test: RegExp; short: string; color: string }[] = [
  { test: /招商|招行|CMB/i, short: '招', color: '#E60012' },
  { test: /支付宝|蚂蚁/i, short: '支', color: '#1677FF' },
  { test: /微信|财付通/i, short: '微', color: '#07C160' },
  { test: /中国银?行|中行/i, short: '中', color: '#B81C22' },
  { test: /工商?银行|工行/i, short: '工', color: '#C7000B' },
  { test: /建设?银行|建行/i, short: '建', color: '#004C97' },
  { test: /农业?银行|农行/i, short: '农', color: '#009944' },
  { test: /交通?银行|交行/i, short: '交', color: '#005B9E' },
  { test: /邮储|邮政储蓄|邮政银行/i, short: '邮', color: '#007A33' },
  { test: /中信?银行/i, short: '信', color: '#C7000B' },
  { test: /平安?银行/i, short: '平', color: '#FF0000' },
  { test: /兴业?银行/i, short: '兴', color: '#1A1A8A' },
  { test: /光大?银行/i, short: '光', color: '#5B2A86' },
  { test: /浦发?银行/i, short: '浦', color: '#1E3A8A' },
  { test: /民生?银行/i, short: '民', color: '#008C8C' },
  { test: /华夏?银行/i, short: '华', color: '#C7000B' },
  { test: /宁波?银行/i, short: '宁', color: '#333333' },
  { test: /南京?银行/i, short: '南', color: '#C00000' },
  { test: /杭州?银行/i, short: '杭', color: '#D7000F' },
  { test: /江苏?银行/i, short: '苏', color: '#E60012' },
  { test: /北京?银行/i, short: '京', color: '#C7000B' },
];

/** 由账户名解析机构品牌（简称 + 颜色）。 */
export function resolveAccountBrand(name: string): AccountBrand {
  for (const rule of BANK_RULES) {
    if (rule.test.test(name)) return { short: rule.short, color: rule.color };
  }
  // 兜底：取名称首字（如「现金」「其他」）
  const first = (name || '?').trim().charAt(0);
  return { short: first || '💳', color: '#1976D2' };
}

/**
 * wealthOcrParser — 银行/支付宝「理财持仓」「资产分布」截图文本解析器
 *
 * 风格严格对齐 fundOcrParser.ts：
 * 1. 健壮容错——识别不到的字段返回 undefined，绝不抛异常。
 * 2. 多别名匹配——同一字段在不同 App 叫法不同。
 * 3. 万元换算 + 正负号（含 －／—）+ 千分位统一处理，落库一律「元」。
 */

import { HoldingType } from '../types';
import type { CreateInvestmentDTO } from '../types';

// ==================== 共享工具 ====================

/**
 * OCR 文本规范化。Tesseract 识别中文时常在汉字间插入空格
 * （"信 银 理 财" / "持仓 市 值" / "总 资产"），导致紧凑关键词无法匹配。
 * 这里反复去除「汉字之间的空格」直到稳定，并把「数字 空格 万」合并。
 */
export function normalizeOcrText(text: string): string {
  if (!text) return '';
  let t = text;
  let prev = '';
  // 循环去除中文字符之间的空格（多间隔需多轮）
  while (prev !== t) {
    prev = t;
    t = t.replace(/([\u4e00-\u9fa5])[ \t]+([\u4e00-\u9fa5])/g, '$1$2');
  }
  // 合并「数字/逗号/小数点 + 空格 + 万」→ 3.02 万 → 3.02万
  t = t.replace(/([0-9,.])[ \t]*万/g, '$1万');
  return t;
}

/**
 * 「万元」单位换算 + 千分位 + 正负号统一解析为「元」数值。
 * 支持：3.02万 / 15.99万 / 190,221.08 / +810.80 / -8.82 / ¥1.48万 / －8.82 / —246.36
 */
export function parseCnyAmount(raw: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/([+\-－—]?)\s*[¥￥]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(万元|万)?/);
  if (!m) return undefined;
  const sign = m[1] === '-' || m[1] === '－' || m[1] === '—' ? -1 : 1;
  let value = parseFloat(m[2].replace(/,/g, ''));
  if (isNaN(value)) return undefined;
  if (m[3]) value *= 10000;
  return sign * value;
}

/**
 * 关键词后就近取金额（支持万元/正负/千分位）。
 */
function matchAmountAfterKeyword(
  text: string,
  keywords: string[],
  opts?: { max?: number; allowZero?: boolean },
): number | undefined {
  for (const kw of keywords) {
    const pattern = new RegExp(
      `${kw}[^0-9+\\-－—¥￥]{0,6}([+\\-－—]?\\s*[¥￥]?\\s*[0-9][0-9,]*(?:\\.[0-9]+)?\\s*(?:万元|万)?)`,
    );
    const match = text.match(pattern);
    if (match) {
      const value = parseCnyAmount(match[1]);
      if (value === undefined || isNaN(value)) continue;
      if (!opts?.allowZero && value === 0) continue;
      if (opts?.max !== undefined && Math.abs(value) > opts.max) continue;
      return value;
    }
  }
  return undefined;
}

// ==================== 资产分布解析器（图1） ====================

/** 资产分布 OCR 解析结果 */
export interface AssetDistributionOcrResult {
  totalAssets?: number;
  wealthAmount?: number;
  cashAmount?: number;
  fundAmount?: number;
  goldAmount?: number;
  raw: string;
}

/** 解析资产分布截图（总资产/理财/活期/基金）。 */
export function parseAssetDistributionOcrText(text: string): AssetDistributionOcrResult {
  const raw = normalizeOcrText(text ?? '');
  const totalAssets = matchAmountAfterKeyword(raw, ['总资产', '资产总额', '总资产(元)', '总资产（元）']);
  const wealthAmount = matchAmountAfterKeyword(raw, ['理财金额', '理财产品', '理财市值', '理财']);
  const cashAmount = matchAmountAfterKeyword(raw, ['活期存款', '活期余额', '活期'], { allowZero: true });
  const fundAmount = matchAmountAfterKeyword(raw, ['基金市值', '基金金额', '基金'], { allowZero: true });
  const goldAmount = matchAmountAfterKeyword(raw, ['黄金市值', '黄金金额', '黄金'], { allowZero: true });
  return { totalAssets, wealthAmount, cashAmount, fundAmount, goldAmount, raw };
}

// ==================== 招行黄金解析器（需求④） ====================

/** 单条黄金 OCR 解析结果（招行黄金专区） */
export interface GoldItemOcrResult {
  productName?: string; // 产品名（如 招银黄金积存金）
  grams?: number; // 克重（shares）
  marketValue?: number; // 市值（元）
  holdingProfit?: number; // 持有收益（元）
  goldPriceRef?: number; // 金价参考（元/克）
  /** 成本均价 元/克（OCR 抓招行页「成本均价 X 元/克」） */
  costPrice?: number;
  /** 累计收益 元（OCR 抓「累计收益」） */
  cumulativeProfit?: number;
  /** 今日收益 元（OCR 抓「今日收益」/「当日收益」） */
  todayProfit?: number;
}

/** 招行黄金 OCR 解析结果 */
export interface GoldOcrParseResult {
  items: GoldItemOcrResult[];
  raw: string;
}

/**
 * 解析招行「黄金」专区截图，尽力识别黄金持仓字段。
 * 容错：识别不到的字段返回 undefined；多条黄金本期归为单条聚合（用户可手改/拆分）。
 */
export function parseCmbGoldOcrText(text: string): GoldOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 克重：含「克/g/G」的数字
  let grams: number | undefined;
  const gramMatch = raw.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:克|g|G|GRAM|GRAMS)/);
  if (gramMatch) {
    const v = parseFloat(gramMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(v)) grams = v;
  }

  const marketValue = matchAmountAfterKeyword(raw, ['持仓市值', '市值', '黄金市值', '价值']);
  const holdingProfit = matchAmountAfterKeyword(raw, ['持有收益', '收益', '盈亏']);
  const goldPriceRef = matchAmountAfterKeyword(raw, ['金价', '每克', '克价', '单价']);
  // 成本均价（元/克）：金价上界 1500，避免误把市值/克重当成本
  const costPrice = matchAmountAfterKeyword(raw, ['成本均价', '成本价', '均价'], { max: 1500 });
  // 累计收益：允许负数（用 allowZero，避免 0 被过滤）
  const cumulativeProfit = matchAmountAfterKeyword(raw, ['累计收益', '累计', '总收益'], { allowZero: true });
  // 今日收益：允许负数
  const todayProfit = matchAmountAfterKeyword(raw, ['今日收益', '当日收益', '今日盈亏', '日收益'], { allowZero: true });

  // 产品名：首个含「黄金/积存/金条」的短语（去尾部数字金额噪声）
  let productName = '招行黄金';
  for (const line of lines) {
    if (/(黄金|积存|金条|金\(|Au)/.test(line) && line.length >= 2) {
      const cleaned = line
        .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万|%)?.*$/, '')
        .replace(/[（）()]/g, '')
        .trim();
      if (cleaned.length >= 2) {
        productName = cleaned;
        break;
      }
    }
  }

  const items: GoldItemOcrResult[] = [{ productName, grams, marketValue, holdingProfit, goldPriceRef, costPrice, cumulativeProfit, todayProfit }];
  return { items, raw };
}

/**
 * 黄金持仓 → 生成 GOLD 的 CreateInvestmentDTO（挂 accountId）。
 * shares = 克重；currentPrice = 金价参考（元/克）。
 */
export function toGoldPrefills(
  r: GoldOcrParseResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  return r.items
    .filter((it) => it.productName || it.marketValue !== undefined || it.grams !== undefined)
    .map((it) => ({
      holdingType: HoldingType.GOLD,
      accountId,
      fundName: it.productName ?? '招行黄金',
      shares: it.grams,
      marketValue: it.marketValue,
      holdingProfit: it.holdingProfit,
      currentPrice: it.goldPriceRef,
      costPrice: it.costPrice,
      cumulativeProfit: it.cumulativeProfit,
      dailyProfit: it.todayProfit,
    }));
}

// ==================== 理财持仓解析器（图2） ====================

/** 单条理财/基金 OCR 解析结果 */
export interface WealthItemOcrResult {
  productName?: string;
  institution?: string;
  /** 基金代码（Bug③ 中信证券公募基金持仓用，6 位数字） */
  fundCode?: string;
  marketValue?: number;
  dailyProfit?: number;
  dailyProfitRate?: number;
  holdingProfit?: number;
  holdingProfitRate?: number;
  /** 持有份额（份）——招行基金「详情页」字段 */
  shares?: number;
  /** 成本价 / 成本净值（元/份）——招行基金「详情页」字段 */
  costPrice?: number;
  /** 当前净值 / 单位净值（元/份）——招行基金「详情页」字段 */
  currentPrice?: number;
}

/** 理财持仓 OCR 解析结果 */
export interface WealthOcrParseResult {
  totalMarketValue?: number;
  totalHoldingProfit?: number;
  items: WealthItemOcrResult[];
  raw: string;
}

/** 常见理财机构锚点（作为条目起始标志） */
const INSTITUTION_ANCHORS = [
  '信银理财', '中银理财', '招银理财', '平安理财', '兴银理财', '光大理财',
  '农银理财', '工银理财', '建信理财', '交银理财', '民生理财', '浦银理财',
  '中邮理财', '华夏理财', '青银理财', '杭银理财', '南银理财', '宁银理财',
  '苏银理财', '信银资管', '中银资管', '余额宝', '天弘基金',
];

/** 提取机构名：优先已知锚点，否则用「理财|资管」结尾正则。 */
function extractInstitution(segment: string): string | undefined {
  for (const anchor of INSTITUTION_ANCHORS) {
    if (segment.includes(anchor)) return anchor;
  }
  const m = segment.match(/([\u4e00-\u9fa5]{2,6}(?:理财|资管))/);
  return m ? m[1] : undefined;
}

/** 提取产品名：机构后紧邻的中文长串，去除噪声。 */
function extractProductName(segment: string, institution?: string): string | undefined {
  const lines = segment.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  for (let line of lines) {
    line = line.replace(/代销|代理销售|持仓|参考市值|市值/g, '');
    if (institution) line = line.split(institution).join('');
    line = line.replace(/[·・]/g, '').trim();
    const cleaned = line
      .replace(/[+\-－—¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万|%)?.*$/, '')
      .trim();
    const chineseCount = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (chineseCount >= 3) return cleaned;
  }
  return undefined;
}

/** 按机构锚点位置把全文切分为多个条目片段。 */
function splitWealthSegments(text: string): string[] {
  const positions: number[] = [];
  for (const anchor of INSTITUTION_ANCHORS) {
    let idx = text.indexOf(anchor);
    while (idx !== -1) {
      positions.push(idx);
      idx = text.indexOf(anchor, idx + anchor.length);
    }
  }
  const genericRe = /[\u4e00-\u9fa5]{2,6}(?:理财|资管)/g;
  let gm: RegExpExecArray | null;
  while ((gm = genericRe.exec(text)) !== null) {
    positions.push(gm.index);
  }
  const uniqueSorted = [...new Set(positions)].sort((a, b) => a - b);
  if (uniqueSorted.length === 0) return [];

  const segments: string[] = [];
  for (let i = 0; i < uniqueSorted.length; i++) {
    const start = uniqueSorted[i];
    const end = i + 1 < uniqueSorted.length ? uniqueSorted[i + 1] : text.length;
    const seg = text.slice(start, end).trim();
    if (seg) segments.push(seg);
  }
  return segments;
}

/** 解析理财持仓截图（多条分条）。 */
export function parseWealthOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const totalMarketValue = matchAmountAfterKeyword(raw, [
    '持仓市值合计', '持仓市值', '市值合计', '合计市值',
  ]);
  const totalHoldingProfit = matchAmountAfterKeyword(raw, [
    '累计收益', '累计持有收益', '持有收益合计', '收益合计',
  ]);

  const segments = splitWealthSegments(raw);
  const items: WealthItemOcrResult[] = [];

  for (const seg of segments) {
    const institution = extractInstitution(seg);
    const productName = extractProductName(seg, institution);
    const marketValue = matchAmountAfterKeyword(seg, ['持仓市值', '持仓金额', '参考市值', '市值', '金额']);
    const dailyProfit = matchAmountAfterKeyword(seg, ['当日收益', '当日', '日收益'], { allowZero: true });
    const holdingProfit = matchAmountAfterKeyword(seg, ['持有收益', '累计收益', '收益'], { allowZero: true });
    const dailyProfitRate = matchAmountAfterKeyword(seg, ['当日收益率', '日收益率']);
    const holdingProfitRate = matchAmountAfterKeyword(seg, ['持有收益率', '累计收益率', '收益率']);

    // 至少要有产品名或市值才认为是一条有效理财
    if (productName === undefined && marketValue === undefined) continue;

    items.push({
      productName,
      institution,
      marketValue,
      dailyProfit,
      dailyProfitRate,
      holdingProfit,
      holdingProfitRate,
    });
  }

  return { totalMarketValue, totalHoldingProfit, items, raw };
}

// ==================== 支付宝基金列表解析器 ====================

/** 从一行文本里按顺序抽取所有金额（支持 +/-、千分位、万、OCR 噪声符号）。 */
function extractAmountsInLine(line: string): number[] {
  // 归一常见 OCR 噪声：=/＝ 常被误识为负号；4446.03 这种前缀噪声无法救，尽力而为
  const cleaned = line.replace(/[＝=]/g, '-');
  const re = /([+\-－—]?)\s*[¥￥]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(万元|万)?%?/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    // 若金额后紧跟中文（且非「万/元」单位），说明是产品名里的数字（如「纳斯达克100指」），跳过
    const rest = cleaned.slice(re.lastIndex);
    if (/^\s*[\u4e00-\u9fa5]/.test(rest) && !/^\s*(万|元)/.test(rest)) continue;
    const v = parseCnyAmount(m[1] + m[2] + (m[3] ?? ''));
    if (v !== undefined && !isNaN(v)) out.push(v);
  }
  return out;
}

/**
 * 一行是否像「基金主行」：含中文产品名 + 至少 2 个金额，且不含百分号。
 * 支付宝布局中，主行为「名称+金额+持有收益」（无%），续行为「昨日收益+收益率%」（含%）。
 */
function looksLikeFundMainLine(line: string): boolean {
  if (line.includes('%')) return false;
  const chinese = (line.match(/[\u4e00-\u9fa5]/g) || []).length;
  const amounts = extractAmountsInLine(line);
  return chinese >= 2 && amounts.length >= 2;
}

/**
 * 解析支付宝「基金」持有列表页。
 * 结构（两行一组）：
 *   [主行]  产品名  金额(市值)  昨日收益         ← 名称 / 金额 / 昨日收益
 *   [次行]  (产品名续)  持有收益  持有收益率%    ← 昨日收益率? / 持有收益 / 收益率
 * 实测：主行 = 名称 + 金额 + 持有收益；次行 = 昨日收益 + 收益率。
 * 按用户确认字段：marketValue=金额, holdingProfit=持有收益, holdingProfitRate=率, dailyProfit=昨日收益。
 */
export function parseAlipayFundOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  // 噪声行关键词：这些行不是持仓
  const noiseRe = /(我的持有|排序|偏股|偏债|指数|黄金|全球|名称|金额|市场解读|基金市场|自选|持有收益\s*\/\s*率|定投)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (noiseRe.test(line) && !looksLikeFundMainLine(line)) continue;
    if (!looksLikeFundMainLine(line)) continue;

    // 主行：产品名（去掉数字部分）+ 金额序列
    const mainAmounts = extractAmountsInLine(line);
    if (mainAmounts.length < 2) continue;
    let name = line
      .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万)?%?/g, ' ')
      .replace(/\s+/g, '')
      .trim();

    const marketValue = mainAmounts[0];
    const holdingProfit = mainAmounts[1];

    // 次行：可能是产品名续行 + 昨日收益 + 收益率
    let dailyProfit: number | undefined;
    let holdingProfitRate: number | undefined;
    const next = lines[i + 1];
    if (next && !looksLikeFundMainLine(next)) {
      const nextAmounts = extractAmountsInLine(next);
      // 产品名续：次行开头的中文（如「数(QDII)A」「接C」）拼到名称后
      const nameCont = next
        .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万)?%?/g, ' ')
        .replace(/[（）()]/g, '')
        .replace(/\s+/g, '')
        .trim();
      if (nameCont && /[\u4e00-\u9fa5A-Za-z]/.test(nameCont) && nameCont.length <= 12) {
        name = name + nameCont;
      }
      if (nextAmounts.length >= 1) dailyProfit = nextAmounts[0];
      if (nextAmounts.length >= 2) holdingProfitRate = nextAmounts[nextAmounts.length - 1];
      i++; // 消费掉次行
    }

    items.push({
      productName: name || undefined,
      institution: undefined,
      marketValue,
      dailyProfit,
      holdingProfit,
      holdingProfitRate,
    });
  }

  return { items, raw };
}

/**
 * 是否为支付宝「基金」持有列表页（"基金" tab 下的多支基金持仓，两行一组）。
 *
 * 与下列页面严格区分（避免抢走各自的专用解析器 / 走错分支）：
 *  - 「进阶理财」页（isAlipayAdvancedFundPage）：含「进阶理财」标题 → 排除
 *  - 「总资产」页（isAlipayTotalAssetsPage）：含「我的资产/活期资产/稳健理财」→ 排除
 *  - 招行 / 中信证券 基金页：用支付宝列表页专属锚点（列头「名称金额」/ 页脚「自选持有」
 *    / 分类标签「偏股偏债指数黄金全球」）区分——注意不能用「我的持有」做锚点，
 *    因为中信证券基金页也含「我的持有」，会误伤。
 */
export function isAlipayFundPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (/进阶理财/.test(t)) return false;
  if (/我的资产|活期资产|稳健理财/.test(t)) return false;
  if (!/持有收益/.test(t)) return false;
  return /名称金额|自选持有|偏股偏债指数黄金全球/.test(t);
}

// ==================== 支付宝「总资产」页解析器（Bug 2） ====================

/** 支付宝「总资产」页 OCR 解析结果 */
export interface AlipayTotalAssetsOcrResult {
  totalAssets?: number; // 我的资产（元）
  yesterdayProfit?: number; // 昨日收益
  cashAmount?: number; // 活期资产（= 余额宝等活期类）
  cashDailyProfit?: number; // 活期资产 括号内当日收益（+0.03）
  stableWealthAmount?: number; // 稳健理财
  stableWealthDailyProfit?: number; // 稳健理财 括号内当日收益
  advancedWealthAmount?: number; // 进阶理财
  advancedWealthDailyProfit?: number; // 进阶理财 括号内当日收益
  raw: string;
}

/**
 * 是否为支付宝「总资产」页（标题「总资产」+「我的资产」/ 三栏资产分类布局）。
 * 用于 ASSET 分支的分流：命中则走专用解析器，否则回退通用资产分布解析。
 */
export function isAlipayTotalAssetsPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (/我的资产/.test(t)) return true;
  return /活期资产/.test(t) && /稳健理财/.test(t) && /进阶理财/.test(t);
}

/**
 * 提取「关键词 金额（±收益）」结构，返回金额与括号内（或紧邻的）收益。
 * 适配支付宝写法：「活期资产：1,295.23（+0.03）」「稳健理财：50,008.02（+4.01）」。
 */
function matchAmountWithProfit(
  text: string,
  keywords: string[],
): { amount?: number; profit?: number } | undefined {
  for (const kw of keywords) {
    const pattern = new RegExp(
      `${kw}[^0-9+\\-－—¥￥%(]{0,8}` +
        `([+\\-－—]?\\s*[¥￥]?\\s*[0-9][0-9,]*(?:\\.[0-9]+)?)` +
        `\\s*(?:万元|万)?` +
        `[^0-9+\\-－—¥￥]{0,4}` +
        `([+\\-－—]?\\s*[0-9][0-9,]*(?:\\.[0-9]+)?)?`,
    );
    const m = text.match(pattern);
    if (m) {
      const amount = parseCnyAmount(m[1]);
      if (amount === undefined || isNaN(amount)) continue;
      let profit: number | undefined;
      if (m[2] !== undefined) {
        const p = parseCnyAmount(m[2]);
        if (p !== undefined && !isNaN(p)) profit = p;
      }
      return { amount, profit };
    }
  }
  return undefined;
}

/**
 * 解析支付宝「总资产」页（图：标题「总资产」，含「我的资产」「三栏资产分类」）。
 * 提取：我的资产（totalAssets）、昨日收益，以及三栏资产分类：
 *   活期资产 → CASH、稳健理财/进阶理财 → WEALTH。
 * 三类金额之和应等于「我的资产」，写入后由账户余额重算保证「余额铁律」。
 */
export function parseAlipayTotalAssetsOcrText(text: string): AlipayTotalAssetsOcrResult {
  const raw = normalizeOcrText(text ?? '');
  const totalAssets = matchAmountAfterKeyword(raw, ['我的资产', '总资产']);
  const yesterdayProfit = matchAmountAfterKeyword(raw, ['昨日收益']);

  const cash = matchAmountWithProfit(raw, ['活期资产', '活期']);
  const stable = matchAmountWithProfit(raw, ['稳健理财']);
  const advanced = matchAmountWithProfit(raw, ['进阶理财']);

  return {
    totalAssets,
    yesterdayProfit,
    cashAmount: cash?.amount,
    cashDailyProfit: cash?.profit,
    stableWealthAmount: stable?.amount,
    stableWealthDailyProfit: stable?.profit,
    advancedWealthAmount: advanced?.amount,
    advancedWealthDailyProfit: advanced?.profit,
    raw,
  };
}

/**
 * 支付宝「总资产」→ 生成 CASH + WEALTH 的 CreateInvestmentDTO 列表（挂 accountId）。
 * 活期资产命名优先「余额宝」（若页面含余额宝），否则「活期存款」；
 * 稳健理财 / 进阶理财 分别归为单条 WEALTH。
 */
export function toAlipayTotalAssetsPrefills(
  r: AlipayTotalAssetsOcrResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  const prefills: Partial<CreateInvestmentDTO>[] = [];

  if (r.cashAmount !== undefined) {
    const cashName = /余额宝/.test(r.raw) ? '余额宝' : '活期存款';
    prefills.push({
      holdingType: HoldingType.CASH,
      accountId,
      fundName: cashName,
      marketValue: r.cashAmount,
      dailyProfit: r.cashDailyProfit,
    });
  }
  if (r.stableWealthAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.WEALTH,
      accountId,
      fundName: '稳健理财',
      marketValue: r.stableWealthAmount,
      dailyProfit: r.stableWealthDailyProfit,
    });
  }
  if (r.advancedWealthAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.WEALTH,
      accountId,
      fundName: '进阶理财',
      marketValue: r.advancedWealthAmount,
      dailyProfit: r.advancedWealthDailyProfit,
    });
  }

  return prefills;
}

// ==================== 支付宝「进阶理财」基金列表解析器（Bug 3） ====================

/**
 * 是否为支付宝「进阶理财」基金持仓列表页。
 * 判别特征：标题「进阶理财」+ 至少 1 个「持有收益」或（金额+昨日+持有）三标签至少出现 2 个。
 * 与「总资产」页区分：总资产页不含「持有收益」关键词。
 *
 * 关键坑（OCR 残缺兜底）：Tesseract 识别支付宝红字小字号「持有收益 +200.62」时，
 * 经常将「持有收益」四字识别为「持有 收益」/「持 有 收益」/漏字。一旦 6 条里
 * 「持有收益」只识别出 0-1 个，原 ≥ 2 阈值会直接判否，导致整页走错解析器。
 * 现放宽为：主判据「持有收益 ≥ 1」+ 兜底「(金额 / 昨日收益 / 持有收益/持有) 三个短词至少 2 个」。
 */
export function isAlipayAdvancedFundPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (!/进阶理财/.test(t)) return false;
  // 主判据：识别到 ≥ 1 个「持有收益」
  const holdProfitCount = (t.match(/持有收益/g) || []).length;
  if (holdProfitCount >= 1) return true;
  // 兜底：金额/昨日/持有 三个短词/标签中至少出现 2 个
  const hitCount =
    Number(/(金额)/.test(t)) +
    Number(/(昨日|昨日收益)/.test(t)) +
    Number(/(持有|持有收益|持有收益率)/.test(t));
  return hitCount >= 2;
}

/**
 * 解析支付宝「进阶理财」基金持仓列表页。
 * 结构（每支基金）：
 *   [名称行]  示例纳斯达克100指数(QDII)A        ← 产品名（可含 (QDII)/ETF，可能跨行）
 *   [标签行]  基金 定投                         ← 噪声，跳过
 *   [指标行]  金额 1,981.17 昨日收益 -7.62 持有收益 +218.69  ← 金额/当日/持有
 * 逐支提取：产品名、金额(marketValue)、昨日收益(dailyProfit)、持有收益(holdingProfit)。
 *
 * 关键坑（OCR 残缺兜底）：Tesseract 识别支付宝红字小字号「持有收益 +200.62」时
 * 经常将「持有收益」识别为「持有 收益」/「持 有 收益」/漏字。本解析器：
 *  1. metricRe 触发词除完整标签外，加「持有」「昨日」短词以应对 OCR 残缺。
 *  2. 三个标签都未识别时，按"行内 ≥ 2 个数字 → 金额/昨日/持有顺序兜底"。
 */
export function parseAlipayAdvancedFundOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  // 标题/页眉/噪声行（不是持仓）
  const headerRe = /(客服|基金市场|我的持有|排序|金额\s*\/\s*昨日|持有收益\s*\/\s*率|市场解读|自选|更多|进阶理财|资产)/;
  // 指标行：含 金额 / 昨日收益 / 持有收益 / 收益率 / 持有 / 昨日 短词
  const metricRe = /金额|昨日收益|持有收益|收益率|昨日|持有/;
  // 纯数字行（OCR 把标签全吞了）：≥ 2 个带正负号的金额。用于打分兜底路由下的鲁棒解析。
  // 注：此正则只在本解析器内部触发，不再扩大 `isAlipayAdvancedFundPage` 判别避免误判。
  const numericLineRe = /[+\-－—]?\s*[¥￥]?\s*[0-9][0-9,]*\.[0-9]+\s+[+\-－—]?\s*[¥￥]?\s*[0-9][0-9,]*\.[0-9]+/;

  let pendingName = '';

  for (const line of lines) {
    // 标题/页眉：跳过（进阶理财 标题在此被吞，不影响持仓名累计）
    if (headerRe.test(line) && !metricRe.test(line) && !numericLineRe.test(line)) continue;

    // 指标行（含标签）或纯数字行（标签全被 OCR 吞了）：都尝试提取金额/昨日/持有
    if (metricRe.test(line) || numericLineRe.test(line)) {
      let marketValue = matchAmountAfterKeyword(line, ['金额']);
      let dailyProfit = matchAmountAfterKeyword(line, ['昨日收益', '昨日']);
      let holdingProfit = matchAmountAfterKeyword(line, ['持有收益', '持有']);

      // OCR 残缺兜底：三个标签都未识别时，按"行内 ≥ 2 个数字 → 金额/昨日/持有顺序"取
      if (marketValue === undefined && dailyProfit === undefined && holdingProfit === undefined) {
        const nums = extractAmountsInLine(line);
        if (nums.length >= 3) {
          marketValue = nums[0];
          dailyProfit = nums[1];
          holdingProfit = nums[2];
        } else if (nums.length === 2) {
          marketValue = nums[0];
          holdingProfit = nums[1];
        } else if (nums.length === 1) {
          marketValue = nums[0];
        }
      }

      if (marketValue !== undefined || holdingProfit !== undefined) {
        items.push({
          productName: pendingName || undefined,
          institution: undefined,
          marketValue,
          dailyProfit,
          holdingProfit,
        });
      }
      pendingName = '';
      continue;
    }

    // 候选名称行：清洗货币金额（仅含小数点的金额，避免误删「纳斯达克100指数」中的 100）/
    // 括号/标签后仍有中文，则累计为持仓名（支持跨行名称拼接）
    const cleaned = line
      .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*\.[0-9]+\s*(?:万元|万)?%?/g, '')
      .replace(/[（）()]/g, '')
      .replace(/\s+/g, '')
      .trim();
    const strippedTag = cleaned.replace(/基金|定投/g, '');
    const chineseCount = (strippedTag.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (chineseCount >= 3) {
      pendingName = pendingName ? pendingName + cleaned : cleaned;
    }
  }

  return { items, raw };
}

// ==================== 招商银行理财列表解析器 ====================

/**
 * 解析招商银行「理财」持仓列表页。
 * 结构（三行一组，以「持仓金额…」标签行为锚点）：
 *   [产品名]  多宝理财 / 半年宝（可能占 1-2 行）
 *   [数字行]  200,000.00  0.00  2027.01.18   ← 持仓金额 / 持仓收益 / 可申赎日(忽略)
 *   [标签行]  持仓金额持仓收益可申赎          ← 锚点
 * 按用户确认：第1列=持仓金额(市值), 第2列=持仓收益, 第3列日期忽略。
 */
export function parseCmbWealthOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  const labelRe = /持仓金额.*持仓收益/;
  // 头部/尾部噪声：不作为产品名
  const noiseRe = /(我的持仓|我的定投|交易记录|收益明细|理财月报|市场|波动|如何发展|产品持仓|其他)/;

  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;

    // 数字行 = 标签行的上一行
    const numLine = lines[i - 1];
    if (!numLine) continue;
    const amounts = extractAmountsInLine(numLine);
    if (amounts.length < 1) continue;
    const marketValue = amounts[0];
    const holdingProfit = amounts.length >= 2 ? amounts[1] : undefined;

    // 产品名 = 数字行往上 1-2 行的中文（拼接），跳过噪声与另一组的标签行
    const nameParts: string[] = [];
    for (let k = i - 2; k >= 0 && k >= i - 3; k--) {
      const cand = lines[k];
      if (!cand) break;
      if (labelRe.test(cand)) break; // 撞到上一组标签行
      if (noiseRe.test(cand)) break;
      // 去掉行内数字/编码尾巴，保留中文与产品编号前的部分
      const cleaned = cand
        .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万)?%?/g, ' ')
        .replace(/[A-Z]{2}[0-9]{3,}/g, '') // 产品代码 ZX040308
        .replace(/\b[0-9]{4}\.[0-9]{2}\.[0-9]{2}\b/g, '')
        .replace(/\s+/g, '')
        .trim();
      const chineseCount = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (chineseCount >= 2) nameParts.unshift(cleaned);
    }
    const productName = nameParts.join('') || undefined;

    if (productName === undefined && marketValue === undefined) continue;

    // 招行理财列表格式为「持仓金额/持仓收益/可申赎日」，默认无当日收益列；
    // 但「我的持仓」总览 / 明细页常含「昨日收益 / 当日收益 / 最新收益」——
    // 尽力从全文识别并归入各条（best-effort，缺省仍为 undefined）。
    const rawDailyProfit = matchAmountAfterKeyword(
      raw,
      ['昨日收益', '当日收益', '最新收益', '日收益'],
      { allowZero: true },
    );

    items.push({
      productName,
      institution: extractInstitution(productName ?? ''),
      marketValue,
      dailyProfit: rawDailyProfit,
      holdingProfit,
      holdingProfitRate: undefined,
    });
  }

  return { items, raw };
}

// ==================== 中国银行理财列表解析器 ====================

/**
 * 解析中国银行「理财」持仓列表页。
 * 结构（三行一组，以「参考市值…最新收益…持仓收益」标签行为锚点）：
 *   [产品名行]  代销信银理财|慧盈象固收增利蔚蓝智享六个月持有期    ← 机构+产品名（带「代销」「|」噪声）
 *   [标签行]    参考市值最新收益持仓收益                        ← 锚点
 *   [数字行]    3.02万 -8.82 +810.80                          ← 市值 / 最新收益(=当日收益) / 持仓收益
 * 按用户确认：第1列=参考市值(市值), 第2列=最新收益(当日收益), 第3列=持仓收益。
 */
export function parseBocWealthOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  // 标签行锚点：同一行内出现「参考市值」且出现「持仓收益」
  const labelRe = /参考市值.*持仓收益/;
  // 上下文噪声词：tab 行（风险测评/账户管理 等）+ 科普卡（净值/波动/投资者关心 等）。
  // 中行"理财"页顶部 5 个 tab + 1 张科普卡被 OCR 误识后，会形成假"产品名+标签+数字"三行组。
  const contextNoiseRe = /(风险测评|账户管理|定投计划|已到期|净值.{0,12}波动|近期.{0,8}投资者|投资者.{0,8}关心|常见的\s*\d+\s*个\s*误区)/;
  const productNameNoiseRe = /[<>「」『』]/;  // 明显 OCR 噪声符号

  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;

    // 上下文噪声过滤：标签行的上一行/下一行/同行若出现 tab 或科普噪声词，整组跳过。
    // （噪声音如「交易记录 账户管理 ... 风险测评」/「净值有波动...近期投资者关心的 5 个问题」，
    //   易被 Tesseract 误识为含「参考市值」「持仓收益」字样的伪标签行。）
    const prevLine = lines[i - 1] ?? '';
    const nextLine = lines[i + 1] ?? '';
    if (
      contextNoiseRe.test(prevLine) ||
      contextNoiseRe.test(lines[i]) ||
      contextNoiseRe.test(nextLine)
    ) {
      continue;
    }

    // 数字行 = 标签行的下一行
    const numLine = lines[i + 1];
    if (!numLine) continue;
    const amounts = extractAmountsInLine(numLine);
    if (amounts.length < 1) continue;
    const marketValue = amounts[0];
    const dailyProfit = amounts.length >= 2 ? amounts[1] : undefined;
    const holdingProfit = amounts.length >= 3 ? amounts[2] : undefined;

    // 产品名行 = 标签行的上一行
    const nameLine = lines[i - 1];
    let institution: string | undefined;
    let productName: string | undefined;
    if (nameLine) {
      institution = extractInstitution(nameLine);
      let cleaned = nameLine
        .replace(/代销|代理销售/g, '')
        .replace(/[|｜/／]/g, ' ');
      if (institution) cleaned = cleaned.split(institution).join(' ');
      cleaned = cleaned
        .replace(/[+\-－—＝=]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:万元|万)?%?/g, ' ')
        .replace(/[（）()]/g, '')
        .replace(/[.．…]+$/g, '')
        .replace(/\s+/g, '')
        .trim();
      const chineseCount = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length;

      // 产品名纯度过滤：理财名称以汉字为主，含非汉字字符（<>「"」等乱码）比例过高即为噪声。
      // 阈值：噪声字符（非汉字/非数字/非常见分隔符）> 50% → 过滤；长度 < 2 也过滤。
      const noiseChars = (cleaned.match(/[^一-鿿0-9·|｜\-]/g) || []).length;
      const isNoise =
        cleaned.length === 0 ||
        chineseCount < 2 ||
        productNameNoiseRe.test(nameLine) ||
        noiseChars / cleaned.length > 0.5;

      if (!isNoise && chineseCount >= 2) productName = cleaned;
    }

    if (productName === undefined && marketValue === undefined) continue;

    items.push({
      productName,
      institution,
      marketValue,
      dailyProfit,
      dailyProfitRate: undefined,
      holdingProfit,
      holdingProfitRate: undefined,
    });
  }

  const totalMarketValue = matchAmountAfterKeyword(raw, ['持仓市值', '持仓市值合计']);
  const totalHoldingProfit = matchAmountAfterKeyword(raw, ['累计收益']);
  return { totalMarketValue, totalHoldingProfit, items, raw };
}

// ==================== 中国银行「资产管理」资产总览页（Bug①） ====================

/** 中国银行「资产管理」页 OCR 解析结果 */
export interface BocAssetsOcrResult {
  totalAssets?: number; // 总资产（元）
  wealthAmount?: number; // 理财（WEALTH）
  cashAmount?: number; // 活期存款（CASH）
  raw: string;
}

/**
 * 是否为中国银行「资产管理」资产总览页。
 * 判别特征：标题含「资产管理」+ 主资产分类（活期存款 / 理财）。
 * 与「理财」持仓列表页区分：列表页标题为「理财」而非「资产管理」，且无「活期存款」两栏主资产。
 */
export function isBocAssetsPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (!/资产管理/.test(t)) return false;
  return /活期存款/.test(t) || /理财/.test(t);
}

/**
 * 解析中国银行「资产管理」页，提取 总资产 / 理财(WEALTH) / 活期存款(CASH)。
 * 采用「标签位置 + 就近取数」策略，兼容「标签与数值同行」或「标签与数值分行」两种排版，
 * 且避免把「活期存款」旁的金额误取为「理财」的金额（两值常并列于同一行）。
 */
export function parseBocAssetsOcrText(text: string): BocAssetsOcrResult {
  const raw = normalizeOcrText(text ?? '');

  // 总资产：优先「我的资产」，其次「总资产」
  const totalAssets = matchAmountAfterKeyword(raw, [
    '我的资产', '总资产', '总资产(元)', '总资产（元）',
  ]);

  // 收集全文所有金额及其位置，用于「就近取数」避免错行串号
  const amountRe = /([0-9][0-9,]*(?:\.[0-9]+)?)/g;
  const amounts: { value: number; pos: number; end: number }[] = [];
  let am: RegExpExecArray | null;
  while ((am = amountRe.exec(raw)) !== null) {
    const value = parseFloat(am[1].replace(/,/g, ''));
    if (!Number.isNaN(value)) {
      amounts.push({ value, pos: am.index, end: am.index + am[0].length });
    }
  }
  const firstAmountAfter = (fromPos: number): { value: number; end: number } | undefined => {
    const found = amounts.find((a) => a.pos > fromPos);
    return found ? { value: found.value, end: found.end } : undefined;
  };

  // 理财（WEALTH）：取「理财」标签后第一个金额
  let wealthAmount: number | undefined;
  let wealthEnd = -1;
  const wealthLabel = raw.indexOf('理财');
  if (wealthLabel >= 0) {
    const f = firstAmountAfter(wealthLabel);
    if (f) {
      wealthAmount = f.value;
      wealthEnd = f.end;
    }
  }

  // 活期存款（CASH）：取「活期存款/活期」标签之后、且晚于理财金额位置的第一个金额
  const cashLabel = Math.max(raw.indexOf('活期存款'), raw.indexOf('活期'));
  let cashAmount: number | undefined;
  if (cashLabel >= 0) {
    const f = firstAmountAfter(Math.max(cashLabel, wealthEnd));
    if (f) cashAmount = f.value;
  }

  return { totalAssets, wealthAmount, cashAmount, raw };
}

/**
 * 中国银行「资产管理」→ 生成 WEALTH(理财) + CASH(活期存款) 的 CreateInvestmentDTO 列表。
 * 两类之和应等于总资产（自洽校验），写入后账户余额由 recalcBalanceFromHoldings 重算。
 */
export function toBocAssetsPrefills(
  r: BocAssetsOcrResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  const prefills: Partial<CreateInvestmentDTO>[] = [];
  if (r.wealthAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.WEALTH,
      accountId,
      fundName: '理财',
      marketValue: r.wealthAmount,
    });
  }
  if (r.cashAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.CASH,
      accountId,
      fundName: '活期存款',
      marketValue: r.cashAmount,
    });
  }
  return prefills;
}

// ==================== 中信证券「我的资产」总览页（Bug②） ====================

/** 中信证券「我的资产」页 OCR 解析结果 */
export interface CiticAssetsOcrResult {
  totalAssets?: number; // 人民币总资产（元）
  wealthAmount?: number; // 理财（WEALTH）
  cashAmount?: number; // 现金（CASH）
  raw: string;
}

/**
 * 是否为中信证券「我的资产」资产总览页。
 * 判别特征：含「我的资产」+（「人民币总资产」或「可用资金」）+「现金」+「理财」。
 * 与支付宝「总资产」页区分：支付宝使用「活期资产/稳健理财/进阶理财」，无「现金/人民币总资产」。
 */
export function isCiticAssetsPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (!/我的资产/.test(t)) return false;
  if (!/人民币总资产|可用资金/.test(t)) return false;
  return /现金/.test(t) && /理财/.test(t);
}

/**
 * 解析中信证券「我的资产」页，提取 人民币总资产 / 理财(WEALTH) / 现金(CASH)。
 * 两栏主资产：理财 + 现金（可用资金），之和应等于人民币总资产。
 */
export function parseCiticAssetsOcrText(text: string): CiticAssetsOcrResult {
  const raw = normalizeOcrText(text ?? '');
  // 「人民币总资产(元)」与数值间常夹「(元)」括号，距离可能 > 6，单独用宽窗口正则提取。
  const totalMatch = raw.match(
    /人民币总资产[^0-9+\-－—¥￥]{0,12}?([0-9][0-9,]*(?:\.[0-9]+)?)/,
  );
  const totalAssets =
    totalMatch !== null
      ? parseCnyAmount(totalMatch[1])
      : matchAmountAfterKeyword(raw, ['总资产', '我的资产']);
  const wealthAmount = matchAmountAfterKeyword(raw, ['理财'], { allowZero: true });
  const cashAmount = matchAmountAfterKeyword(raw, ['现金', '可用资金'], { allowZero: true });
  return { totalAssets, wealthAmount, cashAmount, raw };
}

/**
 * 中信证券「我的资产」→ 生成 WEALTH(理财) + CASH(现金) 的 CreateInvestmentDTO 列表。
 */
export function toCiticAssetsPrefills(
  r: CiticAssetsOcrResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  const prefills: Partial<CreateInvestmentDTO>[] = [];
  if (r.wealthAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.WEALTH,
      accountId,
      fundName: '理财',
      marketValue: r.wealthAmount,
    });
  }
  if (r.cashAmount !== undefined) {
    prefills.push({
      holdingType: HoldingType.CASH,
      accountId,
      fundName: '现金',
      marketValue: r.cashAmount,
    });
  }
  return prefills;
}

// ==================== 基金持仓列表解析器（Bug③/④） ====================

/**
 * 从一行文本里提取所有「带符号数值」（供基金指标行使用，支持 +/-、千分位、万）。
 */
function extractSignedAmounts(line: string): number[] {
  const re = /([+\-－—]?\s*[0-9][0-9,]*(?:\.[0-9]+)?)/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const v = parseCnyAmount(m[1]);
    if (v !== undefined && !Number.isNaN(v)) out.push(v);
  }
  return out;
}

/**
 * 是否为中信证券「公募基金持仓」列表页。
 * 判别特征：含「公募基金持仓/公募基金」+ 持有收益 + 至少一个 6 位基金代码。
 */
export function isCiticFundPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (!/公募基金持仓|公募基金/.test(t)) return false;
  return /持有收益/.test(t) && /\d{6}/.test(t);
}

/**
 * 解析中信证券「公募基金持仓」页，逐支提取：
 *   基金代码（6 位）、基金名称、市值(marketValue)、昨日收益(dailyProfit)、持有收益(holdingProfit)。
 * 结构（每支）：[名称行 代码] [昨日收益 | 持有收益 | 市值]。
 */
export function parseCiticFundOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 基金行：含 6 位基金代码
    const codeMatch = line.match(/(\d{6})/);
    if (!codeMatch) continue;
    const fundCode = codeMatch[1];
    const codeIdx = codeMatch.index ?? 0;

    // 名称：代码之前的部分，去掉「｜」分隔符与行尾孤「（」
    let namePart = line.slice(0, codeIdx).replace(/[｜|]/g, '').trim();
    namePart = namePart.replace(/[（(]\s*$/g, '').trim();

    // 指标：代码之后的数字，按出现顺序 昨日收益 / 持有收益 / 市值
    let after = line.slice(codeIdx + fundCode.length);
    // 若下一行无基金代码，则并入其数值（兼容「名称/代码」与「指标」分行排版）
    const nextLine = lines[i + 1];
    if (nextLine && !/\d{6}/.test(nextLine)) {
      after += ' ' + nextLine;
    }
    const metricNums = extractSignedAmounts(after);
    const dailyProfit = metricNums[0];
    const holdingProfit = metricNums[1];
    const marketValue = metricNums[2];

    if (!namePart && marketValue === undefined) continue;

    items.push({
      productName: namePart || undefined,
      institution: undefined,
      fundCode,
      marketValue,
      dailyProfit,
      holdingProfit,
    });
  }

  return { items, raw };
}

/**
 * 是否为招商银行「基金持仓」页。
 * 判别特征：含「基金」+「总金额」+「金额」+「昨日收益」+「持有收益率/持仓收益率」。
 * 关键坑：顶部「总金额(元) X」实为昨日收益汇总，并非基金市值；真市值在下方的单只基金卡片「金额」里。
 */
export function isCmbFundPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  if (!/基金/.test(t)) return false;
  if (!/总金额/.test(t)) return false;
  if (!/金额/.test(t)) return false;
  if (!/昨日收益/.test(t)) return false;
  return /持有收益率|持仓收益率/.test(t);
}

/**
 * 解析招商银行「基金持仓」页（单只基金卡片视图）。
 * 提取：基金名称、市值(marketValue=卡片「金额」，绝非顶部「总金额」)、
 *       昨日收益(dailyProfit=卡片「昨日收益」)、持有收益率(holdingProfitRate) 与 持有收益(holdingProfit)。
 */
export function parseCmbFundOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  // 顶部/页脚噪声（非卡片）
  const noiseRe = /(总金额|昨日收益|持仓收益|收益明细|交易记录|我的定投|收益提醒|推荐|按金额排序|单只基金|这些基金公司|招财号|季度报告|查看详情)/;

  let nameLine = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 卡片「金额」行：排除顶部「总金额」
    const isCardAmountLine = /金额/.test(line) && line.indexOf('总金额') === -1;
    if (!isCardAmountLine) {
      // 候选基金名行：含 ETF / 联接 / 基金 主题词，且非噪声
      if (!noiseRe.test(line) && /(ETF|联接|基金|主题|指数)/.test(line)) {
        nameLine = line
          .replace(/「[^」]*」/g, '')
          .replace(/[＞>]/g, '')
          .replace(/\s+/g, '')
          .trim();
      }
      continue;
    }

    // 卡片市值（卡片「金额」，与顶部「总金额」严格区分）
    const mvMatch = line.match(
      /金额[^0-9+\\-－—¥￥]{0,6}([+\-－—]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?)/,
    );
    const marketValue = mvMatch ? parseCnyAmount(mvMatch[1]) : undefined;

    // 卡片内「昨日收益」「持有收益率」：向后看至多 3 行
    let dailyProfit: number | undefined;
    let holdingProfit: number | undefined;
    let holdingProfitRate: number | undefined;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const lj = lines[j];
      if (/昨日收益/.test(lj)) {
        const m = lj.match(
          /昨日收益[^0-9+\\-－—¥￥]{0,6}([+\-－—]?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]+)?)/,
        );
        if (m) dailyProfit = parseCnyAmount(m[1]);
      }
      if (/持有收益率|持仓收益率/.test(lj)) {
        const nums = extractSignedAmounts(lj);
        if (nums.length >= 1) holdingProfit = nums[0];
        const pct = lj.match(/([+\-－—]?\s*[0-9][0-9,]*(?:\.[0-9]+)?)\s*%/);
        if (pct) holdingProfitRate = parseCnyAmount(pct[1]);
      }
    }

    if (nameLine || marketValue !== undefined) {
      items.push({
        productName: nameLine || undefined,
        institution: undefined,
        marketValue,
        dailyProfit,
        holdingProfit,
        holdingProfitRate,
      });
    }
    nameLine = '';
  }

  return { items, raw };
}

/**
 * 是否为招商银行「基金详情页」（点进单只基金后的页面）。
 * 判别特征（避免与列表页混淆，严格按收窄闸门）：
 *  - 强信号：含「持有份额」（列表页绝无此字段）→ 直接判定详情页；
 *  - 次信号：含「成本净值」或「当前净值」且同时含 6 位基金代码 → 判定详情页。
 * 刻意排除「净值估算」与「单位净值」单独作为闸门：二者也可能出现在列表页单只卡片
 * （如「净值估算 X.XXXX」），若放行会被误判为详情页、改走详情解析器后贪心抓到顶部
 * 「总金额」、丢失正确的卡片「金额」。
 * 与列表页 isCmbFundPage 互补：详情页带「持有份额/净值」，列表页只有「金额/收益率」。
 */
export function isCmbFundDetailPage(text: string): boolean {
  const t = normalizeOcrText(text ?? '');
  // 强信号：持有份额 是详情页独有字段（列表页绝无）
  if (/持有份额/.test(t)) return true;
  // 次信号：成本净值/当前净值 + 6 位基金代码；排除「净值估算」「单位净值」误伤列表页
  if (/(成本净值|当前净值)/.test(t) && /\d{6}/.test(t)) return true;
  return false;
}

/**
 * 解析招商银行「基金详情页」（点进单只基金后的页面）。
 * 与列表页 parseCmbFundOcrText 不同，详情页含持仓明细：
 *   持有份额(shares) / 当前净值(currentPrice) / 成本净值(costPrice) / 基金代码 / 基金名称。
 * 这些字段是 FUND 表单必填/可填项，列表页无法提供，故单列解析。
 *
 * 字段提取：
 *  - 持有份额：持有份额/持仓份额/份额 后金额（单位「份」）
 *  - 当前净值：当前净值/最新净值/单位净值/净值估算 后净值小数
 *  - 成本净值：成本净值/持仓成本/成本 后净值小数（与「持仓收益」区分：成本后跟净值小数非金额）
 *  - 基金代码：复用 (\d{6})
 *  - 基金名称：含 ETF/联接/基金/指数 主题词且非噪声的中文短语
 * best-effort 复用金额/昨日/持有收益字段，保持与列表页一致。
 */
export function parseCmbFundDetailOcrText(text: string): WealthOcrParseResult {
  const raw = normalizeOcrText(text ?? '');
  const lines = raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const items: WealthItemOcrResult[] = [];

  // 基金代码（6 位），复用通用规则
  const codeMatch = raw.match(/(\d{6})/);
  const fundCode = codeMatch ? codeMatch[1] : undefined;

  // 名称：含 ETF/联接/基金/指数 主题词且非噪声/标签行的中文短语
  const nameRe = /(ETF|联接|基金|主题|指数)/;
  const nameNoiseRe = /(持有份额|当前净值|成本净值|持仓成本|净值|收益|交易|记录|详情|定投|提醒|推荐|季度|报告|管理|查看|代码)/;
  let productName: string | undefined;
  for (const line of lines) {
    if (nameNoiseRe.test(line)) continue;
    if (nameRe.test(line)) {
      const cleaned = line
        .replace(/「[^」]*」/g, '')
        .replace(/[＞>]/g, '')
        .replace(/\b\d{6}\b/g, '')
        .replace(/\s+/g, '')
        .trim();
      if (cleaned.length >= 2) {
        productName = cleaned;
        break;
      }
    }
  }

  // 持有份额：单位「份」
  const shares = matchAmountAfterKeyword(raw, ['持有份额', '持仓份额', '份额']);
  // 当前净值：净值小数
  const currentPrice = matchAmountAfterKeyword(raw, [
    '当前净值', '最新净值', '单位净值', '净值估算',
  ]);
  // 成本净值：净值小数（与「持仓收益」区分——成本后跟净值小数，非金额）
  const costPrice = matchAmountAfterKeyword(raw, ['成本净值', '持仓成本', '成本']);

  // best-effort 复用列表页字段
  const marketValue = matchAmountAfterKeyword(raw, ['持仓市值', '市值', '金额']);
  const dailyProfit = matchAmountAfterKeyword(raw, ['昨日收益', '当日收益', '最新收益'], { allowZero: true });
  const holdingProfit = matchAmountAfterKeyword(raw, ['持有收益', '累计收益', '收益'], { allowZero: true });
  const holdingProfitRate = matchAmountAfterKeyword(raw, ['持有收益率', '持仓收益率']);

  items.push({
    productName,
    institution: undefined,
    fundCode,
    marketValue,
    dailyProfit,
    dailyProfitRate: undefined,
    holdingProfit,
    holdingProfitRate,
    shares,
    costPrice,
    currentPrice,
  });

  return { items, raw };
}

/**
 * 基金持仓列表 → 生成多条 FUND 的 CreateInvestmentDTO（挂 accountId）。
 * 供 Bug③ 中信证券 / Bug④ 招商银行 基金列表页使用，经 WealthConfirmDialog 批量确认后写入。
 */
export function toFundPrefills(
  r: WealthOcrParseResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  return r.items
    .filter((it) => it.productName || it.marketValue !== undefined || it.fundCode)
    .map((it) => ({
      holdingType: HoldingType.FUND,
      accountId,
      fundName: it.productName ?? '',
      fundCode: it.fundCode,
      institution: it.institution,
      marketValue: it.marketValue,
      dailyProfit: it.dailyProfit,
      dailyProfitRate: it.dailyProfitRate,
      holdingProfit: it.holdingProfit,
      holdingProfitRate: it.holdingProfitRate,
      shares: it.shares,
      costPrice: it.costPrice,
      currentPrice: it.currentPrice,
    }));
}

// ==================== prefill 转换 ====================

/**
 * 理财持仓 → 生成多条 WEALTH 的 CreateInvestmentDTO（挂 accountId）。
 * @param r parseWealthOcrText 结果
 * @param accountId 归属账户 id
 */
export function toWealthPrefills(
  r: WealthOcrParseResult,
  accountId: string,
): Partial<CreateInvestmentDTO>[] {
  return r.items
    .filter((item) => item.productName || item.marketValue !== undefined)
    .map((item) => {
      const dto: Partial<CreateInvestmentDTO> = {
        holdingType: HoldingType.WEALTH,
        accountId,
        fundName: item.productName ?? '',
        institution: item.institution,
        marketValue: item.marketValue,
        dailyProfit: item.dailyProfit,
        dailyProfitRate: item.dailyProfitRate,
        holdingProfit: item.holdingProfit,
        holdingProfitRate: item.holdingProfitRate,
      };
      return dto;
    });
}

/**
 * 资产分布 → 生成/更新账户下 CASH 记录（活期）。
 * @param r parseAssetDistributionOcrText 结果
 * @param accountId 归属账户 id
 */
export function toAssetDistributionPrefill(
  r: AssetDistributionOcrResult,
  accountId: string,
): { cash?: Partial<CreateInvestmentDTO> } {
  if (r.cashAmount === undefined) return {};
  return {
    cash: {
      holdingType: HoldingType.CASH,
      accountId,
      fundName: '活期存款',
      marketValue: r.cashAmount,
    },
  };
}

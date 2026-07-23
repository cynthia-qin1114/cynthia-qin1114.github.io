/**
 * fundOcrParser — 基金持仓截图文本解析器
 *
 * 从 OCR 识别出的原始文本中，尽力解析出基金持仓相关字段：
 * 基金代码、基金名称、持有份额、成本价、持仓金额/市值。
 *
 * 设计原则：
 * 1. 健壮容错——不同 App 截图排版差异大，识别不到的字段返回 undefined，绝不抛异常。
 * 2. 多别名匹配——同一字段在不同 App 有不同叫法（如"成本价"/"持仓成本"/"成本单价"）。
 * 3. 容忍空格与换行——OCR 常在数字/关键词间插入空格、冒号、换行，正则统一放宽。
 *
 * 已适配的常见截图格式（关键词覆盖）：
 * - 养基宝：持有份额 / 持仓成本 / 持仓金额 / 参考市值
 * - 支付宝基金：持有份额 / 持仓成本价 / 金额 / 持有收益
 * - 天天基金：持有份额 / 摊薄成本 / 持仓金额 / 最新市值
 * - 通用：份额 / 成本 / 市值 / 金额
 */

/** 基金 OCR 解析结果 */
export interface FundOcrParseResult {
  /** 基金代码（6 位数字），未识别为 undefined */
  fundCode?: string;
  /** 基金名称（中文为主），未识别为 undefined */
  fundName?: string;
  /** 持有份额 */
  shares?: number;
  /** 成本价 / 持仓成本单价 */
  costPrice?: number;
  /** 持仓金额 / 市值（可用于反推份额或校验） */
  amount?: number;
  /** 原始 OCR 文本，便于调试与用户手动核对 */
  raw: string;
}

/**
 * 将 OCR 文本按数字关键词就近匹配，返回第一个命中的数值。
 *
 * @param text  OCR 全文
 * @param keywords  关键词别名列表（正则安全的普通字符串）
 * @param opts  可选：max 用于过滤明显不合理的超大值
 * @returns 匹配到的数值，或 undefined
 */
function matchNumberAfterKeyword(
  text: string,
  keywords: string[],
  opts?: { max?: number },
): number | undefined {
  for (const kw of keywords) {
    // 关键词后允许出现：冒号/空格/换行/￥/¥ 等，再跟数字（可含千分位逗号与小数）
    const pattern = new RegExp(
      `${kw}\\s*[：:¥￥]?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)`,
    );
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        if (opts?.max !== undefined && value > opts.max) continue;
        return value;
      }
    }
  }
  return undefined;
}

/**
 * 解析基金代码：优先取紧邻"代码"关键词的 6 位数字，
 * 否则回退取文本中第一个"看起来像基金代码"的 6 位数字（排除日期/年份误匹配）。
 */
function parseFundCode(text: string): string | undefined {
  // 1) 关键词优先："基金代码 161725" / "代码：161725"
  const kwMatch = text.match(/(?:基金代码|代码)\s*[：:]?\s*(\d{6})\b/);
  if (kwMatch) return kwMatch[1];

  // 2) 回退：找所有独立的 6 位数字，排除疑似日期（如 20240115 会是 8 位，天然排除；
  //    但 202401 这类 6 位年月需排除，规则：开头为 19/20 且 <= 当前年份的视为疑似日期）。
  const candidates = text.match(/\b\d{6}\b/g);
  if (candidates) {
    for (const c of candidates) {
      const prefix2 = parseInt(c.slice(0, 2), 10);
      const asYearMonth = parseInt(c.slice(0, 4), 10);
      const currentYear = new Date().getFullYear();
      // 疑似 年份+月份 组合（199001 ~ 当前年12）跳过
      if (
        (prefix2 === 19 || prefix2 === 20) &&
        asYearMonth >= 1990 &&
        asYearMonth <= currentYear
      ) {
        continue;
      }
      return c;
    }
    // 若全部被判为疑似日期，则退而取第一个候选，避免漏识别
    return candidates[0];
  }
  return undefined;
}

/**
 * 解析基金名称：
 * 1) 关键词形式："基金名称：招商中证白酒指数"
 * 2) 回退：取包含常见基金机构/主题关键词的中文行（如"招商""易方达""白酒""指数"等）。
 */
function parseFundName(text: string): string | undefined {
  // 1) 关键词优先
  const kwMatch = text.match(/(?:基金名称|名称)\s*[：:]\s*([\u4e00-\u9fa5A-Za-z0-9（）()·]+)/);
  if (kwMatch && kwMatch[1].length >= 2) {
    return kwMatch[1].trim();
  }

  // 2) 回退：逐行扫描，寻找像基金名的中文行
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const nameHints = [
    '基金', '指数', '混合', '股票', '债券', '联接', '精选', '成长', '价值',
    '白酒', '医药', '消费', '科技', '新能源', '半导体', '沪深', '中证', '创业板',
    '招商', '易方达', '天弘', '广发', '富国', '南方', '嘉实', '华夏', '汇添富',
    '博时', '工银', '兴全', '中欧', '景顺', '银华', '鹏华', '国泰', 'ETF',
  ];
  for (const line of lines) {
    // 至少含 2 个中文字符，且命中至少一个基金相关关键词
    const chineseCount = (line.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (chineseCount >= 2 && nameHints.some((h) => line.includes(h))) {
      // 去掉行内可能夹带的代码/数字尾巴，保留名称主体
      const cleaned = line.replace(/\s*\d{6}\b.*$/, '').trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }
  return undefined;
}

/**
 * 从 OCR 文本解析基金持仓信息。
 *
 * @param text  ocrService.recognize 返回的原始文本
 * @returns 解析结果（字段尽量宽松，识别不到即 undefined）
 */
export function parseFundOcrText(text: string): FundOcrParseResult {
  const raw = text ?? '';

  const fundCode = parseFundCode(raw);
  const fundName = parseFundName(raw);

  // 份额：份额通常较大且可能无小数或带小数
  const shares = matchNumberAfterKeyword(raw, [
    '持有份额', '持仓份额', '份额',
  ]);

  // 成本价：单价通常 4 位小数，量级较小，过滤掉明显是金额的大数（max 设为 10000）
  const costPrice = matchNumberAfterKeyword(
    raw,
    ['持仓成本价', '持仓成本', '成本单价', '摊薄成本', '成本价', '成本'],
    { max: 10000 },
  );

  // 持仓金额/市值：用于反推或校验
  const amount = matchNumberAfterKeyword(raw, [
    '持仓金额', '参考市值', '最新市值', '市值', '金额',
  ]);

  return {
    fundCode,
    fundName,
    shares,
    costPrice,
    amount,
    raw,
  };
}

/**
 * 将解析结果转换为 InvestmentForm 可用的 prefill 数据。
 * 仅包含已识别到的字段；当有金额但缺份额或成本价时，尝试互相反推。
 *
 * @param result parseFundOcrText 的返回值
 * @returns 部分 CreateInvestmentDTO 字段（fundCode/fundName/shares/costPrice）
 */
export function toInvestmentPrefill(result: FundOcrParseResult): {
  fundCode?: string;
  fundName?: string;
  shares?: number;
  costPrice?: number;
} {
  let { shares, costPrice } = result;
  const { amount } = result;

  // 反推：金额 = 份额 × 成本价
  if (amount && amount > 0) {
    if (shares && shares > 0 && (!costPrice || costPrice <= 0)) {
      costPrice = parseFloat((amount / shares).toFixed(4));
    } else if (costPrice && costPrice > 0 && (!shares || shares <= 0)) {
      shares = parseFloat((amount / costPrice).toFixed(2));
    }
  }

  return {
    fundCode: result.fundCode,
    fundName: result.fundName,
    shares,
    costPrice,
  };
}

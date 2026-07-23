import { db } from '../db/database';
import { defaultPlatformRules } from '../utils/platformRules';
import { MatchType } from '../types';
import type { PlatformMatchResult } from '../types';
import type { PlatformRule } from '../utils/platformRules';

/**
 * ClassificationService — 三级分类引擎
 * 1. 精确匹配 — 关键词完全匹配
 * 2. 模糊匹配 — Levenshtein距离相似度
 * 3. 兜底 — "其他"分类
 * 
 * 具备学习记忆：用户修改分类后，下次相同平台自动应用
 */

// 学习记忆缓存（platform -> category 映射）
const learningMemory = new Map<string, string>();

/**
 * 计算Levenshtein编辑距离
 * @param s1 字符串1
 * @param s2 字符串2
 * @returns 编辑距离
 */
const levenshteinDistance = (s1: string, s2: string): number => {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
};

/**
 * 计算相似度（0~1）
 * @param s1 字符串1
 * @param s2 字符串2
 * @returns 相似度，1表示完全相同
 */
const similarity = (s1: string, s2: string): number => {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
};

class ClassificationService {
  private rules: PlatformRule[] = [];
  private loaded: boolean = false;

  /**
   * 从数据库加载平台映射规则
   */
  async loadRules(): Promise<void> {
    if (this.loaded) return;
    try {
      const dbRules = await db.platformMappings.toArray();
      if (dbRules.length > 0) {
        this.rules = dbRules as unknown as PlatformRule[];
      } else {
        this.rules = defaultPlatformRules;
      }
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load platform rules:', error);
      this.rules = defaultPlatformRules;
      this.loaded = true;
    }
  }

  /**
   * 分类入口：根据平台名称匹配分类
   * 三级匹配：精确 → 模糊 → 兜底
   * @param platformText 平台文本（如OCR识别出的商户名）
   * @returns 匹配结果
   */
  async classify(platformText: string): Promise<PlatformMatchResult> {
    await this.loadRules();

    if (!platformText || platformText.trim().length === 0) {
      return {
        platform: '未知',
        category: '其他支出',
        matchType: MatchType.EXACT,
        matched: false,
      };
    }

    const text = platformText.trim();

    // 0. 先检查学习记忆
    const memoryCategory = learningMemory.get(text.toLowerCase());
    if (memoryCategory) {
      return {
        platform: text,
        category: memoryCategory,
        matchType: MatchType.EXACT,
        matched: true,
      };
    }

    // 1. 精确匹配
    const exactResult = this.exactMatch(text);
    if (exactResult.matched) {
      return exactResult;
    }

    // 2. 模糊匹配
    const fuzzyResult = this.fuzzyMatch(text);
    if (fuzzyResult.matched) {
      return fuzzyResult;
    }

    // 3. 兜底
    return {
      platform: text,
      category: '其他支出',
      matchType: MatchType.EXACT,
      matched: false,
    };
  }

  /**
   * 精确匹配：关键词完全包含在文本中
   */
  private exactMatch(text: string): PlatformMatchResult {
    const lowerText = text.toLowerCase();

    for (const rule of this.rules) {
      if (rule.matchType !== MatchType.EXACT) continue;
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return {
            platform: rule.platform,
            category: rule.category,
            matchType: MatchType.EXACT,
            matched: true,
          };
        }
      }
    }

    // 检查模糊类型的精确关键词
    for (const rule of this.rules) {
      if (rule.matchType !== MatchType.FUZZY) continue;
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return {
            platform: rule.platform,
            category: rule.category,
            matchType: MatchType.EXACT,
            matched: true,
          };
        }
      }
    }

    return {
      platform: text,
      category: '其他支出',
      matchType: MatchType.EXACT,
      matched: false,
    };
  }

  /**
   * 模糊匹配：基于Levenshtein距离的相似度
   * 阈值：0.6（60%相似度）
   */
  private fuzzyMatch(text: string): PlatformMatchResult {
    const THRESHOLD = 0.6;
    let bestMatch: PlatformMatchResult | null = null;
    let bestScore = 0;

    for (const rule of this.rules) {
      for (const keyword of rule.keywords) {
        const score = similarity(text.toLowerCase(), keyword.toLowerCase());
        if (score >= THRESHOLD && score > bestScore) {
          bestScore = score;
          bestMatch = {
            platform: rule.platform,
            category: rule.category,
            matchType: MatchType.FUZZY,
            matched: true,
          };
        }
      }
    }

    return bestMatch ?? {
      platform: text,
      category: '其他支出',
      matchType: MatchType.FUZZY,
      matched: false,
    };
  }

  /**
   * 学习记忆：用户修改了分类后调用
   * 下次相同平台名称自动应用相同分类
   * @param platform 平台名称
   * @param category 用户指定的分类
   */
  learn(platform: string, category: string): void {
    if (platform && category) {
      learningMemory.set(platform.toLowerCase(), category);
    }
  }

  /**
   * 清除学习记忆
   */
  clearMemory(): void {
    learningMemory.clear();
  }

  /**
   * 获取所有规则
   */
  getRules(): PlatformRule[] {
    return this.rules;
  }

  /**
   * 重新加载规则（用于规则更新后）
   */
  async reloadRules(): Promise<void> {
    this.loaded = false;
    await this.loadRules();
  }
}

/** 分类服务单例 */
export const classificationService = new ClassificationService();

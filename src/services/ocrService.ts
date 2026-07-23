import Tesseract from 'tesseract.js';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * OcrService — Tesseract.js OCR封装
 * 提供图片文字识别功能，支持中文+英文
 * 使用Worker模式，初始化一次后复用
 */
class OcrService {
  private worker: Tesseract.Worker | null = null;
  private initialized: boolean = false;
  private initializing: Promise<void> | null = null;

  /**
   * 初始化OCR Worker
   * @param language 语言模型，默认 chi_sim+eng
   */
  async initialize(language?: string): Promise<void> {
    if (this.initialized && this.worker) return;

    // 避免重复初始化
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = this._doInitialize(language);
    await this.initializing;
  }

  private async _doInitialize(language?: string): Promise<void> {
    try {
      const lang = language ?? useSettingsStore.getState().ocrLanguage ?? 'chi_sim+eng';
      this.worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: Tesseract.LoggerMessage) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.initialized = true;
    } catch (error) {
      console.error('OCR initialization failed:', error);
      this.worker = null;
      this.initialized = false;
      throw new Error(`OCR初始化失败: ${(error as Error).message}`);
    } finally {
      this.initializing = null;
    }
  }

  /**
   * 识别图片中的文字
   * @param image 图片URL、File或Blob
   * @returns 识别出的文本
   */
  async recognize(image: string | File | Blob): Promise<string> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('OCR Worker未初始化');
    }

    try {
      const result = await this.worker.recognize(image);
      return result.data.text;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw new Error(`OCR识别失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从识别文本中提取金额
   * 匹配模式：¥123.45, ￥123.45, 123.45元, 123.45
   * @param text OCR识别出的文本
   * @returns 提取到的金额数组
   */
  extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    // 匹配 ¥123.45 / ￥123.45 / 123.45元 / 123.45
    const patterns = [
      /[¥￥]\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d{1,2})?)\s*元/g,
      /金额[：:]\s*(\d+(?:\.\d+)?)/g,
      /实付[：:]\s*(\d+(?:\.\d+)?)/g,
      /合计[：:]\s*(\d+(?:\.\d+)?)/g,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
    }

    // 去重并返回
    return [...new Set(amounts)];
  }

  /**
   * 从识别文本中提取日期
   * @param text OCR识别出的文本
   * @returns ISO格式日期字符串
   */
  extractDate(text: string): string | null {
    // 匹配 2024-01-15 / 2024/01/15 / 2024年1月15日
    const patterns = [
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    return null;
  }

  /**
   * 终止OCR Worker，释放资源
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (error) {
        console.error('OCR termination error:', error);
      }
      this.worker = null;
      this.initialized = false;
    }
  }

  /**
   * 检查Worker是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/** OCR服务单例 */
export const ocrService = new OcrService();

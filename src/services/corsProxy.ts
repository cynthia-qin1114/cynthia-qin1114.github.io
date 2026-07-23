import axios from 'axios';
import { CORS_PROXIES } from '../config/constants';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * CorsProxyService — CORS代理工具
 * 多代理源切换 + 降级缓存
 * 
 * 当请求失败时，自动切换到下一个代理源
 * 所有代理都失败时，返回缓存数据（如果可用）
 */

// 缓存：url -> { data, timestamp }
const responseCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

class CorsProxyService {
  /**
   * 获取当前配置的代理URL
   */
  getProxyUrl(): string {
    return useSettingsStore.getState().corsProxy || CORS_PROXIES[0];
  }

  /**
   * 构建代理URL
   * @param targetUrl 目标URL
   * @param proxyUrl 代理地址（可选，默认使用用户设置）
   * @returns 完整的代理URL
   */
  buildProxyUrl(targetUrl: string, proxyUrl?: string): string {
    const proxy = proxyUrl ?? this.getProxyUrl();
    // corsproxy.io 格式: https://corsproxy.io/?url=<encoded_url>
    // allorigins 格式: https://api.allorigins.win/raw?url=<encoded_url>
    // cors.sh 格式: https://proxy.cors.sh/<url>
    if (proxy.includes('?url=')) {
      return `${proxy}${encodeURIComponent(targetUrl)}`;
    }
    return `${proxy}${targetUrl}`;
  }

  /**
   * 通过CORS代理发送GET请求
   * 自动降级：当前代理失败 → 切换下一个代理 → 缓存降级
   * @param targetUrl 目标URL
   * @returns 响应文本
   */
  async get(targetUrl: string): Promise<string> {
    // 检查缓存
    const cached = responseCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('CorsProxy: using cached response for', targetUrl);
      return cached.data;
    }

    // 尝试所有代理
    const proxies = [this.getProxyUrl(), ...CORS_PROXIES.filter((p) => p !== this.getProxyUrl())];
    let lastError: Error | null = null;

    for (let i = 0; i < proxies.length; i++) {
      const proxyUrl = proxies[i];
      try {
        const fullUrl = this.buildProxyUrl(targetUrl, proxyUrl);
        console.log(`CorsProxy: trying proxy ${i + 1}/${proxies.length}:`, proxyUrl);

        const response = await axios.get(fullUrl, {
          timeout: 10000,
          responseType: 'text',
          headers: {
            Accept: '*/*',
          },
        });

        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // 缓存成功响应
        responseCache.set(targetUrl, { data, timestamp: Date.now() });

        return data;
      } catch (error) {
        console.warn(`CorsProxy: proxy ${i + 1} failed:`, (error as Error).message);
        lastError = error as Error;
      }
    }

    // 所有代理都失败，尝试缓存降级
    if (cached) {
      console.warn('CorsProxy: all proxies failed, using stale cache');
      return cached.data;
    }

    throw new Error(`CORS代理请求失败: ${lastError?.message ?? '所有代理源均不可用'}`);
  }

  /**
   * 直接请求（不走代理）
   * 用于JSONP或已支持CORS的API
   */
  async getDirect(targetUrl: string): Promise<string> {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      responseType: 'text',
    });
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    responseCache.clear();
  }

  /**
   * 获取所有可用代理列表
   */
  getAvailableProxies(): string[] {
    return CORS_PROXIES;
  }
}

/** CORS代理服务单例 */
export const corsProxyService = new CorsProxyService();

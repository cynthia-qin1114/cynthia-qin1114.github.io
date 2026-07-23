import { corsProxyService } from './corsProxy';
import { FUND_API_URL } from '../config/constants';

/**
 * 基金净值数据接口
 */
export interface FundNavData {
  fundCode: string;
  fundName: string;
  nav: number;        // 单位净值
  navDate: string;    // 净值日期
  gszzl: string;      // 估算涨跌幅
  gszz: string;       // 估算净值
  gztime: string;     // 估值时间
}

/**
 * FundApiService — 天天基金净值获取服务
 * 
 * API: http://fundgz.1234567.com.cn/js/{code}.js
 * 返回格式: jsonpgz({"fundcode":"161725","name":"招商中证白酒指数(LOF)A","jzrq":"2024-01-15","dwjz":"0.8234","gszzl":"1.23","gszz":"0.8336","gztime":"2024-01-16 15:00"});
 * 
 * 也可能返回: jsonpgz({...}); 或空内容（基金不存在）
 */
class FundApiService {
  /**
   * 获取基金估值数据
   * @param fundCode 基金代码
   * @returns 基金净值数据
   */
  async getFundNav(fundCode: string): Promise<FundNavData | null> {
    const url = FUND_API_URL.replace('{code}', fundCode);

    try {
      // 先尝试通过CORS代理
      const responseText = await corsProxyService.get(url);
      const parsed = this.parseJsonpResponse(responseText, fundCode);
      if (parsed) return parsed;
    } catch (error) {
      console.warn(`FundApi: proxy request failed for ${fundCode}:`, error);
    }

    // 降级：尝试JSONP直接请求
    try {
      const jsonpResult = await this.jsonpRequest(fundCode);
      if (jsonpResult) return jsonpResult;
    } catch (error) {
      console.warn(`FundApi: JSONP request failed for ${fundCode}:`, error);
    }

    return null;
  }

  /**
   * 批量获取基金净值
   * @param fundCodes 基金代码数组
   * @returns 基金净值数据Map
   */
  async batchGetFundNavs(fundCodes: string[]): Promise<Map<string, FundNavData | null>> {
    const results = new Map<string, FundNavData | null>();
    // 并行请求，但限制并发数
    const batchSize = 5;
    for (let i = 0; i < fundCodes.length; i += batchSize) {
      const batch = fundCodes.slice(i, i + batchSize);
      const promises = batch.map(async (code) => {
        const nav = await this.getFundNav(code);
        results.set(code, nav);
      });
      await Promise.all(promises);
    }
    return results;
  }

  /**
   * 解析JSONP响应
   * 格式: jsonpgz({"fundcode":"161725",...});
   */
  private parseJsonpResponse(text: string, fundCode: string): FundNavData | null {
    try {
      // 提取JSON内容
      const match = text.match(/jsonpgz\((.+)\)/);
      if (!match) {
        // 可能直接是JSON
        const directJson = JSON.parse(text);
        return this.normalizeFundData(directJson, fundCode);
      }

      const jsonStr = match[1].trim();
      const data = JSON.parse(jsonStr);
      return this.normalizeFundData(data, fundCode);
    } catch (error) {
      console.error('FundApi: parse error:', error, 'text:', text.substring(0, 200));
      return null;
    }
  }

  /**
   * 标准化基金数据
   * 天天基金返回字段: fundcode, name, jzrq, dwjz, gszzl, gszz, gztime
   */
  private normalizeFundData(data: Record<string, string>, fundCode: string): FundNavData {
    return {
      fundCode: data.fundcode || fundCode,
      fundName: data.name || '',
      nav: parseFloat(data.dwjz) || 0,
      navDate: data.jzrq || '',
      gszzl: data.gszzl || '0',
      gszz: data.gszz || '0',
      gztime: data.gztime || '',
    };
  }

  /**
   * JSONP方式请求（绕过CORS）
   * 动态创建script标签，利用JSONP回调
   */
  private jsonpRequest(fundCode: string): Promise<FundNavData | null> {
    return new Promise((resolve) => {
      const callbackName = 'jsonpgz'; // 天天基金固定回调名

      const script = document.createElement('script');
      const url = FUND_API_URL.replace('{code}', fundCode);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(script);
          resolve(null);
        }
      }, 8000);

      // 天天基金的JSONP固定使用 jsonpgz 作为回调名
      // 我们临时覆盖 window.jsonpgz
      const win = window as unknown as Record<string, unknown>;
      const originalCallback = win[callbackName];
      win[callbackName] = (data: Record<string, string>) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(script);
          // 恢复原始回调
          if (originalCallback) {
            win[callbackName] = originalCallback;
          } else {
            delete win[callbackName];
          }
          resolve(this.normalizeFundData(data, fundCode));
        }
      };

      script.src = url;
      script.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(script);
          resolve(null);
        }
      };

      document.body.appendChild(script);
    });
  }

  /**
   * 获取估算净值（优先使用估值）
   * @param fundCode 基金代码
   * @returns 当前估值或最新净值
   */
  async getCurrentPrice(fundCode: string): Promise<number | null> {
    const nav = await this.getFundNav(fundCode);
    if (!nav) return null;

    // 优先使用估算净值
    const gszz = parseFloat(nav.gszz);
    if (!isNaN(gszz) && gszz > 0) return gszz;

    // 降级使用单位净值
    if (!isNaN(nav.nav) && nav.nav > 0) return nav.nav;

    return null;
  }
}

/** 基金API服务单例 */
export const fundApiService = new FundApiService();

import { useEffect } from 'react';
import { goldPriceService } from '../services/goldPriceService';
import { investmentRepository } from '../db/repositories/investmentRepository';
import { HoldingType } from '../types';

/**
 * useGoldPriceScheduler — 金价同步调度
 *
 * APP 启动 / 切回前台自动刷新金价，并同步到所有 GOLD 持仓：
 * - 始终更新 currentPrice（元/克）用于展示参考；
 * - ⚠️ 持仓金额（marketValue）以用户录入的市值为准，金价同步**绝不**重算或覆盖。
 *
 * @param onSynced 同步完成回调（用于刷新 UI store）
 */
export function useGoldPriceScheduler(onSynced?: () => void): void {
  const sync = async () => {
    const price = await goldPriceService.getGoldPrice();
    if (!price) return;
    // revalue=false 以保持用户录入的市值不变；但 holdingProfit 仍按 (currentPrice - costPrice) * shares 重算
    const revalue = false;
    const all = await investmentRepository.getAll();
    for (const inv of all) {
      if (inv.holdingType === HoldingType.GOLD) {
        await investmentRepository.applyGoldPrice(inv.id, price.price, revalue);
      }
    }
    if (onSynced) onSynced();
  };

  useEffect(() => {
    void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

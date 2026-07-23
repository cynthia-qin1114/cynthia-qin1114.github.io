import { useEffect } from 'react';
import { useDcaStore } from '../store/useDcaStore';

/**
 * useDcaScheduler — 定投自动扣款调度 Hook
 *
 * PWA 无后台，故在 APP 启动（挂载）即跑一次 `runDueDeductions`，
 * 并监听 `visibilitychange` / `focus` 在切回前台时再跑，保证到期计划及时扣款。
 * 该 Hook 需被顶层组件（App 中的 <DcaScheduler/>）挂载一次。
 */
export const useDcaScheduler = (): void => {
  const runDueDeductions = useDcaStore((state) => state.runDueDeductions);

  useEffect(() => {
    // 启动即跑一次
    void runDueDeductions();

    // 切回前台再跑
    const handleForeground = (): void => {
      if (document.visibilityState === 'visible') {
        void runDueDeductions();
      }
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);

    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
    };
  }, [runDueDeductions]);
};

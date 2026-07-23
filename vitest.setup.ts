// vitest 全局 setup：为组件测试注册 jest-dom 自定义匹配器（toBeInTheDocument 等）。
// 既有 node 环境逻辑测试不会用到这些匹配器，引入本文件无副作用。
import '@testing-library/jest-dom/vitest';

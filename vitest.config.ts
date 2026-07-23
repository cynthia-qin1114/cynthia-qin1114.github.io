import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 独立的 vitest 配置（不复用 vite.config.ts，避免加载 PWA/React 插件）。
 * - environment: node（Dexie 集成测试用 fake-indexeddb 提供 IndexedDB）
 * - 仅收集 *.test.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // 既有逻辑测试（repository/service/util）沿用 node 环境；
    // 组件测试文件用文件级 `// @vitest-environment jsdom` 覆盖为 jsdom。
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
});

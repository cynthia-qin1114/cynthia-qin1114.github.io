// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import InstitutionLogo from './InstitutionLogo';

/**
 * 可视化核对产物：用 react-dom/server 把 26 家机构 logo 各渲染成静态 SVG 字符串，
 * 组装成一个独立 HTML 画廊，写到项目根目录 logo-gallery.html（深色背景，便于肉眼核对）。
 *
 * 注意：
 * - 本文件仅用于生成核对产物，不纳入应用构建 / 部署；
 * - 复用项目既有 vitest 环境执行（无需自建 babel / tsx）。
 */

// REGISTRY 覆盖的机构名（含别名），与冒烟测试保持一致
const INSTITUTIONS: string[] = [
  '支付宝',
  '蚂蚁财富',
  '微信',
  '理财通',
  '中国银行',
  '中行',
  '招商银行',
  '招行',
  '中信证券',
  '中信银行',
  '中信',
  '工商银行',
  '工行',
  '建设银行',
  '建行',
  '农业银行',
  '农行',
  '交通银行',
  '交行',
  '平安银行',
  '兴业银行',
  '微众银行',
  '余额宝',
  '华泰证券',
  '东方财富',
  '同花顺',
  '光大银行',
  '浦发银行',
  '民生银行',
  '华夏银行',
  '邮储',
  '宁波银行',
  '南京银行',
  '杭州银行',
  '江苏银行',
  '北京银行',
];

describe('logo gallery artifact', () => {
  it('writes logo-gallery.html for visual review', () => {
    const cards = INSTITUTIONS.map((name) => {
      const svg = renderToStaticMarkup(<InstitutionLogo name={name} size={64} />);
      const label = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `    <div class="card">
      <div class="logo">${svg}</div>
      <div class="label">${label}</div>
    </div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>机构 Logo 重绘核对画廊</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #0f172a; color: #e2e8f0;
    font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 24px; }
  h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .sub { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
    padding: 16px 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .logo { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }
  .label { font-size: 13px; text-align: center; color: #cbd5e1; }
</style>
</head>
<body>
  <h1>机构 Logo 重绘核对画廊</h1>
  <div class="sub">共 ${INSTITUTIONS.length} 个机构名（覆盖 REGISTRY 的 26 家机构，含别名）。</div>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;

    const outPath = path.resolve(process.cwd(), 'logo-gallery.html');
    writeFileSync(outPath, html, 'utf-8');

    // 基本健全性检查：文件已写出且覆盖了代表机构
    expect(html.includes('中国银行')).toBe(true);
    expect(html.includes('建设银行')).toBe(true);
    expect(html.length).toBeGreaterThan(1000);
  });
});

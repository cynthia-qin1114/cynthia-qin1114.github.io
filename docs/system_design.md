# smart-finance-app 增量系统设计 + 任务分解

> 架构师：高见远 | 迭代：invest-v2（黄金 / 分组排序 / 招行总览OCR / 定投计划）
> 原则：**最小变更、复用为主、零数据丢失**。所有新增严格对齐现有分层（types → db/repositories → services → store → hooks → components/pages）与既有代码风格。

---

## Part A：系统设计

### 1. 实现方案概述 + 框架选型

**技术基线不变**：Vite 5 + React 18 + MUI 5 + Tailwind 3 + Zustand + Dexie 4 + Recharts + Tesseract.js + axios + date-fns。**预计无新增依赖包**（见 §6）。

五个需求的技术难点与方案：

| 需求 | 难点 | 方案（复用点） |
|------|------|--------------|
| **需求1** 招行总览页OCR错乱 | 总览页布局 ≠ 理财列表页，现有锚点匹配不上退回通用解析器 | 新增 `parseCmbOverviewOcrText`，锚点改为"持仓收益/持仓金额市值"标签结构；接入 `WealthSyncOcrButton` 候选打分路由（复用现有打分机制）。总览页混排理财+基金+黄金分组，解析器按分组标题切段并给每条打 `holdingType` 标记。 |
| **需求2** 账户管理+持仓排序 | 账户总金额口径 = balance + 持仓市值合计，需统一函数 | 新增 `accountRepository.getAccountTotalAmount()` 作为唯一口径函数；新增账户管理页 `AccountsPage`（复用 `AccountList/AccountForm`）；列表按账户总金额降序。 |
| **需求3** 投资页按类别分组 | 平铺改分组+可折叠+组内排序 | `InvestmentList` 增加 `groupByCategory` 模式（复用现有 `groupByAccount` 模式的写法），用 MUI `Collapse` 实现折叠；分组枚举顺序常量集中定义。 |
| **需求4** 黄金识别+金价同步 | 新增 GOLD 类型；金价近似实时；单位换算元/克 | `HoldingType` 加 `GOLD`；新增 `goldPriceService`（复用 `corsProxyService.get()` + JSONP 降级模式，完全对齐 `fundApiService`）；GOLD 市值 = 克重 × 最新金价；新增 `parseCmbGoldOcrText` 或并入总览解析器识别 GOLD 分组。 |
| **需求5** 基金定投计划 | 新增独立实体，两类型，OCR+手动 | 新增 `InvestmentPlan` 实体 + `investmentPlans` 表（Dexie v4）+ `investmentPlanRepository` + `useInvestmentPlanStore` + 定投管理区块；SMART 支持截图OCR（`parseSmartPlanOcrText`），FIXED 纯手动。扣款不自动推进。 |

**架构模式**：延续 Repository + Service + Zustand Store + Hooks 分层；OCR 解析器保持纯函数、无副作用、识别不到返回 undefined 绝不抛异常。

---

### 2. 文件清单

#### 新增文件

| 文件 | 职责 |
|------|------|
| `src/services/goldPriceService.ts` | 现货金/上海金近似金价获取，复用 corsProxy + JSONP 降级，统一输出「元/克」；美元/盎司换算（1oz=31.1035g，汇率近似）。 |
| `src/db/repositories/investmentPlanRepository.ts` | 定投计划 CRUD 数据访问层。 |
| `src/store/useInvestmentPlanStore.ts` | 定投计划 Zustand Store。 |
| `src/hooks/useInvestmentPlan.ts` | 定投计划 Hook 封装。 |
| `src/pages/AccountsPage.tsx` | 账户管理页：账户增删改 + 按账户总金额降序列表。 |
| `src/components/investment/InvestmentPlanList.tsx` | 定投计划列表（SMART/FIXED 分区展示）。 |
| `src/components/investment/InvestmentPlanForm.tsx` | 定投计划增删改表单（SMART 支持OCR预填，FIXED 纯手动）。 |
| `src/components/investment/SmartPlanOcrButton.tsx` | 聪明定投截图 OCR 录入按钮（复用 ocrService + 向导交互）。 |
| `src/config/smartPlanRates.ts` | 聪明定投扣款率规则表（内置静态展示数据）。 |
| `scripts/ocr-cmb-gold.mjs` | 招行黄金/总览截图 Tesseract dump 脚本（工程师写解析前先跑）。 |
| `src/services/goldPriceService.test.ts` | 金价换算单测。 |
| `src/services/investmentPlanRepository.test.ts` | 定投计划 CRUD 单测（可选）。 |

#### 修改文件

| 文件 | 修改内容 |
|------|--------|
| `src/types/index.ts` | `HoldingType` 加 `GOLD`；新增 `PlanType`/`DeductCycle` 枚举；`Investment` 加 `goldPricePerGram?`、`goldPriceSyncAt?`；新增 `InvestmentPlan` + `CreateInvestmentPlanDTO`/`UpdateInvestmentPlanDTO`；`AccountHoldingSummary` 可加 `totalAmount`；新增 `GoldPriceData`。 |
| `src/db/database.ts` | Dexie **v3→v4**：新增 `investmentPlans` 表；`investments` 表 upgrade 幂等补 GOLD 相关默认值（老数据不含 GOLD，无需回填但保持迁移链完整）。 |
| `src/services/wealthOcrParser.ts` | 新增 `parseCmbOverviewOcrText`（总览页，识别理财/基金/黄金分组）、`parseCmbGoldOcrText`（黄金分组，或并入总览）、`parseSmartPlanOcrText`（聪明定投）；`WealthItemOcrResult` 加 `holdingType?`、`grams?`；`toWealthPrefills` 透传 holdingType/grams。 |
| `src/components/investment/WealthSyncOcrButton.tsx` | 候选数组加 `parseCmbOverviewOcrText`（放候选首位或按打分）；prefills 支持 GOLD。 |
| `src/db/repositories/investmentRepository.ts` | `create/update` 增加 GOLD 分支（marketValue = shares×currentPrice，shares 复用为克重）；新增 `refreshGoldPrices()`；`getSummary` 将 GOLD 计入投资市值。 |
| `src/db/repositories/accountRepository.ts` | 新增 `getAccountTotalAmount(accountId)` = balance? 或 Σ持仓市值（口径见 §7 共享知识）；说明：现有 `recalcBalanceFromHoldings` 已把 balance 覆盖为 Σ持仓市值，需按口径调整避免重复计算。 |
| `src/services/investmentService.ts` | 新增 `refreshGoldPrices` 编排（拉金价→批量重算 GOLD→账户余额联动）；`refreshAllPrices` 末尾追加金价刷新。 |
| `src/store/useInvestmentStore.ts` | `refreshPrices` 流程追加金价刷新；GOLD 纳入。 |
| `src/pages/InvestPage.tsx` | 列表由平铺改 `groupByCategory`；新增定投计划区块入口；WEALTH 向导结果支持 GOLD 分组确认。 |
| `src/components/investment/InvestmentList.tsx` | 新增 `groupByCategory` 分组模式（基金/理财/黄金/现金），可折叠 + 组内排序。 |
| `src/components/investment/InvestmentForm.tsx` | ToggleButtonGroup 加「黄金」；GOLD 分支字段（克重/成本/当前金价，市值只读=克重×金价）。 |
| `src/components/investment/InvestmentCard.tsx` | GOLD 视图：展示克重、当前金价（元/克）、市值、今日收益。 |
| `src/components/investment/WealthConfirmDialog.tsx` | 支持 GOLD 条目字段（克重/金价）编辑。 |
| `src/config/constants.ts` | 新增 `GOLD_API_URL`、金价换算常量（`OZ_TO_GRAM=31.1035`、`DEFAULT_USD_CNY`）、`HoldingTypeLabels`、`CATEGORY_GROUP_ORDER`、`ROUTES.ACCOUNTS`。 |
| `src/components/common/BottomNav.tsx` / `src/App.tsx` | 注册账户管理页路由（若走独立页）。 |

---

### 3. 数据结构与接口设计

#### 3.1 HoldingType 扩展（`src/types/index.ts`）

```ts
export enum HoldingType {
  FUND = 'FUND',
  WEALTH = 'WEALTH',
  CASH = 'CASH',
  GOLD = 'GOLD',   // 新增：黄金（招行黄金等），shares 复用为「克重」
}
```

#### 3.2 Investment 字段增量

GOLD **复用现有字段**，最小化 schema 变更：
- `shares` → 复用为**克重（g）**
- `costPrice` → 复用为**成本金价（元/克）**
- `currentPrice` → 复用为**最新金价（元/克）**
- `marketValue` = `shares(克重) × currentPrice(最新金价)`
- `dailyProfit` → 今日收益（沿用截图识别值，不随金价重算）

仅新增 2 个可选元字段：

```ts
export interface Investment {
  // ... 现有字段不变 ...
  /** GOLD：最近一次金价同步时的元/克单价（= currentPrice 冗余留痕，展示用） */
  goldPricePerGram?: number;
  /** GOLD：金价同步时间戳 */
  goldPriceSyncAt?: string;
}
```

#### 3.3 InvestmentPlan 实体（新增，完整接口）

```ts
/** 定投计划类型 */
export enum PlanType {
  SMART = 'SMART',   // 聪明定投（简化记录 + 截图OCR + 手动编辑）
  FIXED = 'FIXED',   // 定额定投（纯手动）
}

/** 扣款间隔 */
export enum DeductCycle {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

/** 定投计划 */
export interface InvestmentPlan {
  id: string;
  planType: PlanType;
  /** 归属账户 id */
  accountId: string;
  /** 计划名称 / 标的基金名 */
  planName: string;
  /** 基金代码（可空） */
  fundCode?: string;
  /** 基准/每期金额（元）：SMART=基准金额，FIXED=每期固定金额 */
  amount: number;
  // —— SMART 专用（简化记录，不接指数计算）——
  /** 对标指数名，如「沪深300」 */
  benchmarkIndex?: string;
  /** 对标均线，如「250日均线」 */
  benchmarkMa?: string;
  // —— 通用扣款信息（手动维护，不自动推进）——
  deductCycle: DeductCycle;
  /** 下一扣款日 YYYY-MM-DD */
  nextDeductDate?: string;
  /** 已投期数 */
  investedPeriods: number;
  note?: string;
  /** SMART 最近截图同步时间 */
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestmentPlanDTO {
  planType: PlanType;
  accountId: string;
  planName: string;
  fundCode?: string;
  amount: number;
  benchmarkIndex?: string;
  benchmarkMa?: string;
  deductCycle?: DeductCycle;      // 默认 MONTHLY
  nextDeductDate?: string;
  investedPeriods?: number;       // 默认 0
  note?: string;
  lastSyncAt?: string;
}

export interface UpdateInvestmentPlanDTO {
  accountId?: string;
  planName?: string;
  fundCode?: string;
  amount?: number;
  benchmarkIndex?: string;
  benchmarkMa?: string;
  deductCycle?: DeductCycle;
  nextDeductDate?: string;
  investedPeriods?: number;
  note?: string;
  lastSyncAt?: string;
}
```

#### 3.4 Dexie schema 升级方案（v3 → v4）

在 `database.ts` 构造函数末尾追加 v4（保持既有 v1–v3 不动）：

```ts
// Schema v4（invest-v2）
// 1. 新增 investmentPlans 表（定投计划）
// 2. investments 表结构未变（GOLD 复用 shares/costPrice/currentPrice，无需新索引）
//    upgrade 幂等：老数据无 GOLD，无需回填；仅为触发迁移链并预留 gold 字段一致性。
this.version(4).stores({
  accounts: 'id, type, createdAt',
  transactions: 'id, accountId, type, category, platform, date, createdAt',
  categories: 'id, type, parentId, sortOrder',
  investments: 'id, fundCode, accountId, holdingType, buyDate, createdAt',
  platformMappings: 'id, platform, category',
  budgets: 'id, category, period',
  // 新增表：按账户/类型查询
  investmentPlans: 'id, accountId, planType, nextDeductDate, createdAt',
}).upgrade(async (tx) => {
  // 幂等：GOLD 相关字段为可选，老 investment 记录保持不变（undefined 即可）。
  // investmentPlans 为新表，无历史数据需迁移。
  await tx.table('investments').toCollection().modify((inv: any) => {
    // 预留：若未来需要为存量数据补 gold 字段可在此处理，当前无需。
    void inv;
  });
});
```

并在 `SmartFinanceDB` 类中声明表：
```ts
investmentPlans!: Table<InvestmentPlan, string>;
```

> ⚠️ 迁移风险点（工程师注意）：Dexie 新增表必须**新起一个 version()**，不能改动 v3 的 stores 定义；`investments` 的 stores 字符串在 v4 与 v3 完全一致（GOLD 不加新索引），仅为携带新表。

#### 3.5 goldPriceService 接口签名

```ts
export interface GoldPriceData {
  /** 元/克（统一单位） */
  pricePerGram: number;
  /** 数据源标识，如 'spot-xau' | 'sh-gold' | 'fallback' */
  source: string;
  /** 同步时间 ISO */
  syncAt: string;
}

class GoldPriceService {
  /** 获取近似实时金价（元/克）。失败返回 null，绝不抛异常。 */
  async getGoldPricePerGram(): Promise<GoldPriceData | null>;

  /** 现货金原始拉取（USD/oz 或 CNY/g），经 corsProxyService.get()。 */
  private async fetchSpotGold(): Promise<{ raw: string } | null>;

  /** 盎司→克换算：usdPerOz / OZ_TO_GRAM × usdCnyRate。 */
  private ozToGram(usdPerOz: number, usdCnyRate: number): number;

  /** 解析响应文本抽取金价数值。 */
  private parseResponse(text: string): number | null;
}
export const goldPriceService = new GoldPriceService();
```

常量（`constants.ts`）：`OZ_TO_GRAM = 31.1035`；`DEFAULT_USD_CNY = 7.2`（近似固定，可后续再取）；`GOLD_API_URL`（现货金/上海金接口，工程师按可用源确定，走 corsProxy）。

#### 3.6 新增 / 修改的 OCR 解析函数签名（`wealthOcrParser.ts`）

```ts
// WealthItemOcrResult 增量字段
export interface WealthItemOcrResult {
  productName?: string;
  institution?: string;
  marketValue?: number;
  dailyProfit?: number;
  dailyProfitRate?: number;
  holdingProfit?: number;
  holdingProfitRate?: number;
  holdingType?: HoldingType;   // 新增：总览页分组标记 FUND/WEALTH/GOLD
  grams?: number;              // 新增：GOLD 克重
}

/** 招行「账户总览」页解析器（混排 理财+基金+黄金 分组）。
 *  锚点：产品名行 → 持仓收益(左)/持仓金额市值(右)行 → 日期可申赎行；
 *  按分组标题（理财/基金/黄金/专项）切段，为每条打 holdingType。 */
export function parseCmbOverviewOcrText(text: string): WealthOcrParseResult;

/** 招行黄金分组解析器（可独立或被 overview 复用）：克重/成本/今日收益。 */
export function parseCmbGoldOcrText(text: string): WealthOcrParseResult;

/** 聪明定投截图解析器：基准金额/对标指数/对标均线/扣款间隔/下一扣款日/已投期数。 */
export interface SmartPlanOcrResult {
  planName?: string;
  amount?: number;
  benchmarkIndex?: string;
  benchmarkMa?: string;
  nextDeductDate?: string;
  investedPeriods?: number;
  raw: string;
}
export function parseSmartPlanOcrText(text: string): SmartPlanOcrResult;
```

`WealthSyncOcrButton` 候选路由（WEALTH 分支）更新为：
```ts
const candidates = [
  parseCmbOverviewOcrText(text),  // 新增，总览页优先参与打分
  parseBocWealthOcrText(text),
  parseCmbWealthOcrText(text),
  parseAlipayFundOcrText(text),
  parseWealthOcrText(text),
];
// 打分沿用：score = 有市值条目数×100 + 总条目数
```

---

### 4. 关键流程时序图

见 `docs/sequence-diagram.mermaid`（①招行总览页 OCR 录入流程 ②黄金金价同步流程）。类图见 `docs/class-diagram.mermaid`。

---

### 5. Anything UNCLEAR / 假设

1. **金价数据源**：现货金公开免费接口稳定性不一，假设工程师用 corsProxy 可拉到 USD/oz 或 CNY/g 文本；汇率先用 `DEFAULT_USD_CNY=7.2` 近似固定，后续可接汇率源。若所有源失败，`getGoldPricePerGram` 返回 null，GOLD 市值保持上次值（不清零）。
2. **账户总金额口径与 balance 重算的关系**：现有 `recalcBalanceFromHoldings` 已将有持仓账户的 `balance` 覆盖为 Σ持仓市值。需求2「总金额 = balance(活期) + 持仓市值合计」若直接相加会与现状**重复计 CASH**。已拍板口径见 §7，工程师须按共享知识实现 `getAccountTotalAmount`，避免双算。
3. **招行总览页真实文本**：工程师须先跑 `scripts/ocr-cmb-overview.mjs`（及新增 `ocr-cmb-gold.mjs`）拿原始 dump 再写解析锚点，不可凭空猜。
4. **定投扣款自动推进**：本期明确不做，`nextDeductDate`/`investedPeriods` 纯手动。

---

## Part B：任务分解

### 6. 依赖包增量

**无新增依赖包。** 全部复用现有栈：

- 金价获取：复用 `axios` + `corsProxyService`（现有）。
- OCR：复用 `tesseract.js` + `ocrService`（现有）。
- 日期：复用 `date-fns`（现有）。
- 状态：复用 `zustand`；存储复用 `dexie`；UI 复用 `@mui/material` + `@mui/icons-material`（Collapse/Accordion 均在 @mui/material 内）。

> 若工程师最终选用的金价源需要额外解析库，请先反馈 team-lead 评估，默认不引入。

---

### 7. 共享知识（跨文件约定，工程师必读）

1. **账户总金额口径（唯一出处 `accountRepository.getAccountTotalAmount`）**
   - 已拍板定义：账户总金额 = 活期余额 balance + 该账户下所有持仓（FUND/WEALTH/GOLD）当前市值合计。
   - ⚠️ 但现有 `recalcBalanceFromHoldings` 在「账户有持仓时」已把 `balance` 覆盖成 Σ（该账户全部持仓 marketValue，**含 CASH 活期**）。因此**实现口径统一为**：
     ```
     totalAmount =
       Σ(该账户下所有 holding.marketValue，含 CASH/WEALTH/FUND/GOLD)   // 有持仓账户：等于当前 balance
       ‖ 若账户无任何持仓，则 = 用户手填 balance
     ```
   - 即：`getAccountTotalAmount` 直接返回「有持仓 → Σ全部持仓市值；无持仓 → account.balance」，**不要**再把 balance 与持仓市值相加，避免 CASH 双算。活期是以 CASH 持仓形式落库的（见 `toAssetDistributionPrefill`）。
   - 账户排序（需求2）、投资页组内排序均调用此函数取值，禁止各处自行汇总。

2. **金额单位统一「元」**：所有落库金额一律元；OCR「万元」在解析层用 `parseCnyAmount` 换算；金价统一「元/克」，盎司换算常量 `OZ_TO_GRAM = 31.1035`。

3. **黄金 GOLD 字段复用约定**（见 §3.2）：`shares`=克重、`costPrice`=成本金价、`currentPrice`=最新金价、`marketValue`=克重×最新金价、`dailyProfit`=截图今日收益（不随金价重算）。GOLD 计入 `getSummary` 投资市值，但独立成组展示。

4. **资产类别分组顺序（常量 `CATEGORY_GROUP_ORDER`，constants.ts）**：`[FUND(基金), WEALTH(理财), GOLD(黄金), CASH(现金)]`。投资列表 `groupByCategory` 与向导确认均按此序；CASH 现金默认不进投资持仓列表（沿用 `InvestmentList` 现有过滤），但作为独立可折叠组可选展示（按 team 决定，默认保持隐藏）。

5. **持仓变动 → 账户余额联动**：任何 create/update/delete/updatePrice/refreshGoldPrices 后必须触发 `accountRepository.recalcBalanceFromHoldings(accountId)`（现有原子约定），GOLD 金价刷新同样要联动。

6. **OCR 解析器纯函数约定**：识别不到返回 undefined，绝不抛异常；新增解析器（overview/gold/smartPlan）必须先跑 dump 脚本拿真实文本再写锚点。

7. **OCR 路由打分**：沿用 `score = 有市值条目数×100 + 总条目数`；`parseCmbOverviewOcrText` 加入候选，因其能切出多分组条目，通常在总览页得分最高而胜出。

8. **HoldingType 标签映射（`HoldingTypeLabels`）**：`{ FUND:'基金', WEALTH:'理财', GOLD:'黄金', CASH:'现金' }`，卡片徽章、分组标题、表单 Toggle 统一引用。

9. **Dexie 迁移铁律**：v1–v3 定义一律不动；新增表只能在**新的 `version(4)`** 声明；`investments` 的 stores 字符串 v4 与 v3 保持一致。

---

### 8. 任务列表（有序，按实现顺序，含依赖 + 验收）

> 遵循硬性上限：共 **5 个任务**，第一个为数据/类型基础设施，后续按功能模块分组，尽量仅依赖 T01。

#### T01　数据模型与存储基础设施（P0）
- **涉及文件**：`src/types/index.ts`、`src/db/database.ts`、`src/config/constants.ts`、`src/db/repositories/investmentPlanRepository.ts`
- **内容**：
  1. `HoldingType` 加 `GOLD`；`Investment` 加 `goldPricePerGram?`/`goldPriceSyncAt?`；新增 `PlanType`/`DeductCycle`/`InvestmentPlan`/`CreateInvestmentPlanDTO`/`UpdateInvestmentPlanDTO`/`GoldPriceData`/`InvestmentPlanStoreState`。
  2. Dexie v3→v4：新增 `investmentPlans` 表 + 声明 `investmentPlans!: Table<...>`；upgrade 幂等空迁移。
  3. constants：`OZ_TO_GRAM=31.1035`、`DEFAULT_USD_CNY=7.2`、`GOLD_API_URL`、`HoldingTypeLabels`、`CATEGORY_GROUP_ORDER`、`ROUTES.ACCOUNTS`。
  4. `investmentPlanRepository`：`getAll/getById/create/update/delete`（对齐现有 repository 风格 + `generateId/now`）。
- **依赖**：无
- **验收**：`npm run build` 通过；打开应用 IndexedDB 升级到 v4 且不丢历史数据；investmentPlans 表存在。

#### T02　黄金金价服务 + 投资计算/账户口径（P0）
- **涉及文件**：`src/services/goldPriceService.ts`、`src/services/investmentService.ts`、`src/db/repositories/investmentRepository.ts`、`src/db/repositories/accountRepository.ts`、`src/services/goldPriceService.test.ts`
- **内容**：
  1. `goldPriceService`：复用 corsProxy+降级，输出元/克；盎司换算；失败返回 null；5min 缓存。
  2. `investmentRepository.create/update` 增 GOLD 分支（market=克重×金价）；`getSummary` 纳入 GOLD。
  3. `investmentService.refreshGoldPrices()` 编排（拉金价→重算 GOLD→账户联动）；`calcGoldMetrics`（若采用）。
  4. `accountRepository.getAccountTotalAmount()` 按 §7 口径实现（有持仓→Σ市值；无持仓→balance）。
- **依赖**：T01
- **验收**：金价换算单测通过；手动新增一条 GOLD 持仓刷新后 market 随金价更新；账户总金额不双算 CASH。

#### T03　招行总览页 / 黄金 / 定投 OCR 解析器（P0）
- **涉及文件**：`src/services/wealthOcrParser.ts`、`src/components/investment/WealthSyncOcrButton.tsx`、`scripts/ocr-cmb-gold.mjs`、`src/services/wealthOcrParser.test.ts`
- **内容**：
  1. **先跑** `node scripts/ocr-cmb-overview.mjs`（已存在）+ 新增 `ocr-cmb-gold.mjs` 拿真实 dump。
  2. `WealthItemOcrResult` 加 `holdingType?`/`grams?`；新增 `parseCmbOverviewOcrText`（分组切段 + 打 holdingType）、`parseCmbGoldOcrText`、`parseSmartPlanOcrText` + `SmartPlanOcrResult`。
  3. `toWealthPrefills` 透传 holdingType/grams；新增 GOLD prefill 支持。
  4. `WealthSyncOcrButton` 候选加入 `parseCmbOverviewOcrText`；prefills 支持 GOLD 分组。
- **依赖**：T01（GOLD 枚举/字段）
- **验收**：用 `samples/cmb-overview.jpg` 跑通，产品名不再错位为「持仓收益」，理财/基金/黄金分组正确切分；解析器单测覆盖总览样本。

#### T04　投资页分组展示 + 黄金持仓 UI（P1）
- **涉及文件**：`src/pages/InvestPage.tsx`、`src/components/investment/InvestmentList.tsx`、`src/components/investment/InvestmentForm.tsx`、`src/components/investment/InvestmentCard.tsx`、`src/components/investment/WealthConfirmDialog.tsx`、`src/store/useInvestmentStore.ts`
- **内容**：
  1. `InvestmentList` 新增 `groupByCategory` 模式（按 `CATEGORY_GROUP_ORDER`，MUI Collapse 折叠，组内排序）。
  2. `InvestPage` 平铺改分组；刷新按钮流程追加金价刷新（GOLD）。
  3. `InvestmentForm` 加「黄金」Toggle + GOLD 字段（克重/成本金价/当前金价，市值只读）。
  4. `InvestmentCard` GOLD 视图；`WealthConfirmDialog` 支持 GOLD 条目字段编辑；徽章用 `HoldingTypeLabels`。
  5. `useInvestmentStore.refreshPrices` 纳入金价刷新。
- **依赖**：T02、T03
- **验收**：投资页按 基金/理财/黄金 分组、可折叠、组内可排序；黄金卡片显示克重/金价/市值；OCR 黄金分组可确认落库。

#### T05　账户管理页 + 基金定投计划模块（P1）
- **涉及文件**：`src/store/useInvestmentPlanStore.ts`、`src/hooks/useInvestmentPlan.ts`、`src/pages/AccountsPage.tsx`、`src/components/investment/InvestmentPlanList.tsx`、`src/components/investment/InvestmentPlanForm.tsx`、`src/components/investment/SmartPlanOcrButton.tsx`、`src/config/smartPlanRates.ts`、`src/pages/InvestPage.tsx`（挂载区块）、`src/components/common/BottomNav.tsx`+`src/App.tsx`（路由，若独立页）
- **内容**：
  1. `useInvestmentPlanStore` + `useInvestmentPlan`：定投计划 CRUD 状态。
  2. `AccountsPage`：账户增删改（复用 `AccountList/AccountForm`），列表按 `getAccountTotalAmount` 降序；注册 `ROUTES.ACCOUNTS` 路由 + 底部导航入口（或从概览页进入）。
  3. `InvestmentPlanList/Form`：SMART（截图OCR预填 + 手动编辑：基准金额/对标指数/对标均线/扣款间隔/下一扣款日/已投期数）与 FIXED（纯手动：每天/每周固定金额）动态字段。
  4. `SmartPlanOcrButton`：复用 ocrService + `parseSmartPlanOcrText` 预填。
  5. `smartPlanRates.ts`：扣款率规则表静态展示数据。
  6. `InvestPage` 挂载「定投计划」可折叠区块。
- **依赖**：T01（实体/表/repository）、T02（账户总金额口径，供账户排序）、T03（parseSmartPlanOcrText）
- **验收**：账户管理页可增删改且按总金额降序；定投计划可增删改；SMART 支持截图录入并可编辑，FIXED 纯手动；扣款不自动推进（手动改 nextDeductDate/investedPeriods 生效）。

---

### 9. 任务依赖图

见 `docs/task-dependency.mermaid`。文字概述：

```
T01（数据/类型/存储基础） ─┬─→ T02（金价服务+计算+账户口径）
                          ├─→ T03（OCR 解析器）
                          └─→ T05（账户页+定投模块）
T02 ─┐
T03 ─┴─→ T04（投资页分组+黄金UI）
T02 ─→ T05 ；T03 ─→ T05
```
- T01 是所有任务的根依赖（类型/表/常量/repository）。
- T02、T03 可在 T01 后并行。
- T04 依赖 T02+T03（分组展示需 GOLD 计算与 OCR 分组）。
- T05 依赖 T01+T02+T03（账户排序口径 + 定投 OCR）。

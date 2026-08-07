import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import { ocrService } from '../../services/ocrService';
import {
  parseWealthOcrText,
  parseAlipayFundOcrText,
  parseCmbWealthOcrText,
  parseBocWealthOcrText,
  toWealthPrefills,
  parseAssetDistributionOcrText,
  toAssetDistributionPrefill,
  parseAlipayTotalAssetsOcrText,
  toAlipayTotalAssetsPrefills,
  isAlipayTotalAssetsPage,
  parseAlipayAdvancedFundOcrText,
  isAlipayAdvancedFundPage,
  isAlipayFundPage,
  // Bug① 中国银行「资产管理」资产总览页
  isBocAssetsPage,
  parseBocAssetsOcrText,
  toBocAssetsPrefills,
  // Bug② 中信证券「我的资产」资产总览页
  isCiticAssetsPage,
  parseCiticAssetsOcrText,
  toCiticAssetsPrefills,
  // Bug③/④ 基金持仓列表页（中信证券公募基金 / 招商银行基金）
  isCiticFundPage,
  parseCiticFundOcrText,
  isCmbFundPage,
  parseCmbFundOcrText,
  // Bug④ 招行基金「详情页」：含 持有份额/当前净值/成本净值，优先于列表页解析
  isCmbFundDetailPage,
  parseCmbFundDetailOcrText,
  toFundPrefills,
} from '../../services/wealthOcrParser';
import { parseFundOcrText, toInvestmentPrefill } from '../../services/fundOcrParser';
import { resolveFundCodesInPrefills, getUserFundEntries } from '../../services/fundCodeDictionary';
import { HoldingType } from '../../types';
import type { Account, CreateInvestmentDTO } from '../../types';
import AccountPickerDialog from './AccountPickerDialog';

/** OCR 截图类型 */
export type WealthSyncOcrType = 'ASSET' | 'WEALTH' | 'FUND';

/** 向导识别完成后的结果载荷 */
export interface WealthSyncOcrPayload {
  ocrType: WealthSyncOcrType;
  account: Account;
  /** WEALTH/FUND：多条预填；ASSET：活期 + 理财分类预填（统一走 prefills） */
  prefills: Partial<CreateInvestmentDTO>[];
  /** 是否识别到有效字段 */
  matched: boolean;
  raw: string;
}

/**
 * WealthSyncOcrButton — 资产同步录入向导（三步）
 *
 * 步骤 1：选择归属账户（AccountPickerDialog）
 * 步骤 2：选择截图类型（资产分布录入 / 理财录入 / 基金录入）
 * 步骤 3：拍照 / 选图 → OCR 识别 → 解析 → onResult 回传
 */
interface WealthSyncOcrButtonProps {
  accounts: Account[];
  onResult: (payload: WealthSyncOcrPayload) => void;
  /** 预置归属账户：提供时跳过「选择账户」步骤，直接录入该账户 */
  presetAccount?: Account | null;
}

const WealthSyncOcrButton: React.FC<WealthSyncOcrButtonProps> = ({ accounts, onResult, presetAccount }) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [ocrType, setOcrType] = useState<WealthSyncOcrType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(0);
    setAccountPickerOpen(false);
    setSelectedAccount(null);
    setOcrType(null);
    setLoading(false);
    setError(null);
  };

  const handleStart = () => {
    setError(null);
    if (presetAccount) {
      setSelectedAccount(presetAccount);
      setStep(1);
    } else {
      setAccountPickerOpen(true);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setAccountPickerOpen(false);
    setStep(1);
  };

  const handleTypeSelect = (type: WealthSyncOcrType) => {
    setOcrType(type);
    setStep(2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedAccount || !ocrType) return;

    setLoading(true);
    setError(null);
    try {
      const text = await ocrService.recognize(file);
      const account = selectedAccount;
      // 用户字典（来自本地持仓）：OCR 抓不到基金代码时用来补码
      const userFundEntries = getUserFundEntries();

      // 支付宝「基金」持有列表页：无论用户在向导选「理财」还是「基金」录入，
      // 一律按 FUND 处理——否则会误派到理财批量确认对话框（与招行/CITIC 基金同一类坑）。
      // 顶层拦截，确保在 ocrType 分支判定之前生效，避免被 WEALTH 分支的通用打分误胜。
      if (isAlipayFundPage(text)) {
        const parsed = parseAlipayFundOcrText(text);
        const prefills = resolveFundCodesInPrefills(toFundPrefills(parsed, account.id), userFundEntries);
        onResult({ ocrType: 'FUND', account, prefills, matched: prefills.length > 0, raw: text });
        reset();
        return;
      }

      if (ocrType === 'WEALTH') {
        // 支付宝「进阶理财」基金列表：专用解析器（提前跑一次，后续打分兜底复用）。
        const advancedParsed = parseAlipayAdvancedFundOcrText(text);
        const advancedWithMv = advancedParsed.items.filter(
          (it) => it.marketValue !== undefined,
        ).length;
        // 判别器命中且解析出 ≥ 1 个有效条目 → 专用解析器直出（避免打分误判）
        if (isAlipayAdvancedFundPage(text) && advancedWithMv > 0) {
          const prefills = toWealthPrefills(advancedParsed, account.id);
          onResult({
            ocrType,
            account,
            prefills,
            matched: prefills.length > 0,
            raw: text,
          });
          reset();
          return;
        }
        // 五解析器自动适配：中行 / 招行列表 / 支付宝基金 / 通用理财 / 支付宝进阶理财(兜底)。
        // 打分优先「有市值的有效条目数」，其次总条目数——避免通用解析器切出空壳条目误胜。
        // 进阶理财解析器也参与打分兜底：判别器 false 但解析器仍能切出有效条目时胜出。
        const candidates = [
          advancedParsed,
          parseBocWealthOcrText(text),
          parseCmbWealthOcrText(text),
          parseAlipayFundOcrText(text),
          parseWealthOcrText(text),
        ];
        const score = (r: (typeof candidates)[number]) => {
          const withMv = r.items.filter((it) => it.marketValue !== undefined).length;
          return withMv * 100 + r.items.length;
        };
        const parsed = candidates.reduce((best, cur) =>
          score(cur) > score(best) ? cur : best,
        );
        const prefills = toWealthPrefills(parsed, account.id);
        onResult({ ocrType, account, prefills, matched: prefills.length > 0, raw: text });
      } else if (ocrType === 'ASSET') {
        // Bug① 中国银行「资产管理」资产总览页：理财(WEALTH) + 活期存款(CASH)
        if (isBocAssetsPage(text)) {
          const parsed = parseBocAssetsOcrText(text);
          const prefills = toBocAssetsPrefills(parsed, account.id);
          onResult({ ocrType, account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        // Bug② 中信证券「我的资产」资产总览页：理财(WEALTH) + 现金(CASH)
        if (isCiticAssetsPage(text)) {
          const parsed = parseCiticAssetsOcrText(text);
          const prefills = toCiticAssetsPrefills(parsed, account.id);
          onResult({ ocrType, account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        // 支付宝「总资产」页：三栏资产分类（活期/稳健/进阶）专用解析器。
        if (isAlipayTotalAssetsPage(text)) {
          const parsed = parseAlipayTotalAssetsOcrText(text);
          const prefills = toAlipayTotalAssetsPrefills(parsed, account.id);
          onResult({ ocrType, account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        const parsed = parseAssetDistributionOcrText(text);
        const { cash } = toAssetDistributionPrefill(parsed, account.id);
        onResult({
          ocrType,
          account,
          prefills: cash ? [cash] : [],
          matched: cash !== undefined,
          raw: text,
        });
      } else {
        // Bug③ 中信证券「公募基金持仓」列表页：逐支解析
        // 关键：派发 ocrType='FUND'，与用户在向导选择的「基金录入」一致，
        // 避免错派到 WeALTH 批量确认对话框导致「录入后跳到理财页」的体验错乱。
        if (isCiticFundPage(text)) {
          const parsed = parseCiticFundOcrText(text);
          const prefills = resolveFundCodesInPrefills(toFundPrefills(parsed, account.id), userFundEntries);
          onResult({ ocrType: 'FUND', account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        // Bug④ 招商银行「基金详情页」：含 持有份额/当前净值/成本净值，
        // 优先解析（能自动填出份额与净值），失败再回退列表页解析。
        if (isCmbFundDetailPage(text)) {
          const parsed = parseCmbFundDetailOcrText(text);
          const prefills = resolveFundCodesInPrefills(toFundPrefills(parsed, account.id), userFundEntries);
          onResult({ ocrType: 'FUND', account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        // Bug④ 招商银行「基金持仓」列表页：单只基金卡片（仅金额/收益率，无份额/净值）
        // 同样派发 ocrType='FUND'，由 InvestPage/AccountDetailDialog 决定
        // 单支走 InvestmentForm 预填、多支走 WealthConfirmDialog 批量确认。
        if (isCmbFundPage(text)) {
          const parsed = parseCmbFundOcrText(text);
          const prefills = resolveFundCodesInPrefills(toFundPrefills(parsed, account.id), userFundEntries);
          onResult({ ocrType: 'FUND', account, prefills, matched: prefills.length > 0, raw: text });
          reset();
          return;
        }
        const parsed = parseFundOcrText(text);
        const nums = toInvestmentPrefill(parsed);
        const prefill: Partial<CreateInvestmentDTO> = {
          holdingType: HoldingType.FUND,
          accountId: account.id,
          fundName: nums.fundName ?? '',
        };
        if (nums.fundCode) prefill.fundCode = nums.fundCode;
        if (nums.shares !== undefined) prefill.shares = nums.shares;
        if (nums.costPrice !== undefined) prefill.costPrice = nums.costPrice;
        const resolved = resolveFundCodesInPrefills([prefill], userFundEntries);
        const finalPrefill = resolved[0];
        const matched =
          Boolean(finalPrefill.fundCode) ||
          nums.shares !== undefined ||
          nums.costPrice !== undefined;
        onResult({ ocrType, account, prefills: [finalPrefill], matched, raw: text });
      }
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR识别失败，请重试';
      setError(message);
      setLoading(false);
    }
  };

  const typeOptions: {
    type: WealthSyncOcrType;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    { type: 'ASSET', label: '资产分布录入', desc: '总资产/理财/活期/基金 概览截图（自动拆分活期与理财）', icon: <PieChartIcon color="primary" /> },
    { type: 'WEALTH', label: '理财录入', desc: '中行/招行/支付宝 理财持仓（多条批量确认）', icon: <SavingsIcon color="primary" /> },
    { type: 'FUND', label: '基金录入', desc: '公募基金持仓（可自动刷净值）', icon: <ShowChartIcon color="primary" /> },
  ];

  return (
    <Box>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Button variant="contained" startIcon={<SyncAltIcon />} onClick={handleStart} fullWidth>
        同步资产（截图识别）
      </Button>

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}

      {/* 步骤1：选择账户（预置账户时跳过） */}
      {!presetAccount && (
        <AccountPickerDialog
          open={accountPickerOpen}
          accounts={accounts}
          onClose={() => setAccountPickerOpen(false)}
          onSelect={handleAccountSelect}
          title="第 1 步 · 选择归属账户"
        />
      )}

      {/* 步骤2：选择截图类型 */}
      <Dialog open={step === 1} onClose={reset} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          第 2 步 · 选择截图类型
          {selectedAccount && (
            <Chip
              size="small"
              icon={<AccountBalanceWalletIcon />}
              label={selectedAccount.name}
              sx={{ ml: 1 }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {typeOptions.map((opt) => (
              <Button
                key={opt.type}
                variant="outlined"
                onClick={() => handleTypeSelect(opt.type)}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, px: 2 }}
                startIcon={opt.icon}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {opt.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.desc}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={reset}>取消</Button>
        </DialogActions>
      </Dialog>

      {/* 步骤3：拍照 / 选图 */}
      <Dialog open={step === 2} onClose={loading ? undefined : reset} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>第 3 步 · 拍照或选择截图</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                识别中，请稍候...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CameraAltIcon />}
                onClick={() => cameraInputRef.current?.click()}
                fullWidth
              >
                拍照
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                选择图片
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={reset} disabled={loading}>
            取消
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WealthSyncOcrButton;

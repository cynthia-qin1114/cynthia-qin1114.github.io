import { describe, it, expect } from 'vitest';
import { HoldingType } from '../types';
import type { Investment, CreateInvestmentDTO } from '../types';
import {
  SEED_FUND_DICTIONARY,
  normalizeFundNameKey,
  lookupFundCode,
  buildUserFundEntries,
  combineFundEntries,
  resolveFundCodesInPrefills,
} from './fundCodeDictionary';

describe('fundCodeDictionary', () => {
  describe('normalizeFundNameKey', () => {
    it('去空格、统一半角括号、ASCII 转大写', () => {
      expect(normalizeFundNameKey('建 信 纳 斯 达 克 100 指 数（QDII）A')).toBe(
        '建信纳斯达克100指数(QDII)A',
      );
      expect(normalizeFundNameKey('南方有色金属ETF联接e')).toBe('南方有色金属ETF联接E');
    });
  });

  describe('lookupFundCode', () => {
    it('种子表精确命中（用户真实基金）', () => {
      expect(lookupFundCode('南方有色金属ETF联接E')).toBe('010990');
      expect(lookupFundCode('长城短债债券E')).toBe('019873');
      expect(lookupFundCode('建信纳斯达克100指数(QDII)A')).toBe('539001');
      expect(lookupFundCode('嘉实中证稀土产业ETF联接C')).toBe('011036');
    });

    it('OCR 逐字空格 / 全角括号也能命中', () => {
      expect(lookupFundCode('南 方 有 色 金 属 ETF 联 接 E')).toBe('010990');
      expect(lookupFundCode('建信纳斯达克100指数（QDII）A')).toBe('539001');
    });

    it('双向包含兜底：OCR 吞掉份额字母仍能命中', () => {
      expect(lookupFundCode('长城短债债券')).toBe('019873');
      expect(lookupFundCode('南方有色金属ETF联接')).toBe('010990');
    });

    it('未命中返回 null', () => {
      expect(lookupFundCode('一只不存在的基金XYZ')).toBeNull();
      expect(lookupFundCode('')).toBeNull();
    });

    it('extra 参数可覆盖 / 增补', () => {
      expect(lookupFundCode('我的自定义基金', [{ code: '888888', name: '我的自定义基金' }])).toBe(
        '888888',
      );
    });
  });

  describe('buildUserFundEntries / combineFundEntries', () => {
    const investments = [
      {
        holdingType: HoldingType.FUND,
        fundCode: '161725',
        fundName: '招商中证白酒指数(LOF)A',
      },
      {
        holdingType: HoldingType.FUND,
        fundCode: '005827',
        fundName: '易方达蓝筹精选混合',
      },
      {
        holdingType: HoldingType.WEALTH, // 非 FUND 应忽略
        fundCode: '999999',
        fundName: '某理财',
      },
      {
        holdingType: HoldingType.FUND, // 缺代码应忽略
        fundCode: '',
        fundName: '无名基金',
      },
    ] as unknown as Investment[];

    it('仅取 FUND 且有代码的条目', () => {
      const entries = buildUserFundEntries(investments);
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.code).sort()).toEqual(['005827', '161725']);
    });

    it('合并后用户字典按 code 覆盖种子', () => {
      const merged = combineFundEntries(buildUserFundEntries(investments));
      // 总数 = 种子数 + 用户新增（用户两个 code 都在种子里有？005827 在种子，161725 在种子）
      // 两者均在种子中，故总数等于种子数（覆盖，不新增）
      expect(merged.length).toBe(SEED_FUND_DICTIONARY.length);
      const baijiu = merged.find((e) => e.code === '161725');
      expect(baijiu?.name).toBe('招商中证白酒指数(LOF)A');
    });
  });

  describe('resolveFundCodesInPrefills', () => {
    it('FUND 缺代码时按名称补码', () => {
      const prefills: Partial<CreateInvestmentDTO>[] = [
        { holdingType: HoldingType.FUND, fundName: '南方有色金属ETF联接E', marketValue: 991.8 },
      ];
      const out = resolveFundCodesInPrefills(prefills);
      expect(out[0].fundCode).toBe('010990');
    });

    it('FUND 已有代码不覆盖', () => {
      const prefills: Partial<CreateInvestmentDTO>[] = [
        { holdingType: HoldingType.FUND, fundName: '某基金', fundCode: '123456' },
      ];
      const out = resolveFundCodesInPrefills(prefills);
      expect(out[0].fundCode).toBe('123456');
    });

    it('WEALTH 类型不补码', () => {
      const prefills: Partial<CreateInvestmentDTO>[] = [
        { holdingType: HoldingType.WEALTH, fundName: '某理财', marketValue: 100 },
      ];
      const out = resolveFundCodesInPrefills(prefills);
      expect(out[0].fundCode).toBeUndefined();
    });

    it('extra 参数生效', () => {
      const prefills: Partial<CreateInvestmentDTO>[] = [
        { holdingType: HoldingType.FUND, fundName: '自定义基金X' },
      ];
      const out = resolveFundCodesInPrefills(prefills, [
        { code: '777777', name: '自定义基金X' },
      ]);
      expect(out[0].fundCode).toBe('777777');
    });
  });
});

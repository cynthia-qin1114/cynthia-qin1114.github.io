import { parseWealthOcrText, parseBocWealthOcrText, parseCmbWealthOcrText, parseAlipayFundOcrText } from '../src/services/wealthOcrParser';
import type { WealthOcrParseResult } from '../src/services/wealthOcrParser';
import { BOC_WEALTH, CMB_WEALTH_LIST, ALIPAY_FUND_LIST } from '../src/services/__fixtures__/realOcrSamples';

const score = (r: WealthOcrParseResult) => {
  const withMv = r.items.filter((it) => it.marketValue !== undefined).length;
  return withMv * 100 + r.items.length;
};

const samples: [string, string][] = [
  ['BOC_WEALTH', BOC_WEALTH],
  ['CMB_WEALTH_LIST', CMB_WEALTH_LIST],
  ['ALIPAY_FUND_LIST', ALIPAY_FUND_LIST],
];

for (const [name, text] of samples) {
  const cands: [string, WealthOcrParseResult][] = [
    ['boc', parseBocWealthOcrText(text)],
    ['cmb', parseCmbWealthOcrText(text)],
    ['alipay', parseAlipayFundOcrText(text)],
    ['generic', parseWealthOcrText(text)],
  ];
  const scored = cands.map(([n, r]) => `${n}=${score(r)}(${r.items.length})`);
  const winner = cands.reduce((b, c) => (score(c[1]) > score(b[1]) ? c : b));
  console.log(`${name}: [${scored.join(', ')}] -> winner=${winner[0]}`);
}

import { parseAlipayFundOcrText } from '../src/services/wealthOcrParser';
import { ALIPAY_FUND_LIST } from '../src/services/__fixtures__/realOcrSamples';

const r = parseAlipayFundOcrText(ALIPAY_FUND_LIST);
console.log('ALIPAY items=' + r.items.length);
r.items.forEach((it, i) =>
  console.log(`  [${i}] name=${it.productName} mv=${it.marketValue} daily=${it.dailyProfit} hold=${it.holdingProfit} rate=${it.holdingProfitRate}`),
);

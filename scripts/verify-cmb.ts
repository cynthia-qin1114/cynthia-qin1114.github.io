import { parseCmbWealthOcrText } from '../src/services/wealthOcrParser';
import { CMB_WEALTH_LIST } from '../src/services/__fixtures__/realOcrSamples';

const r = parseCmbWealthOcrText(CMB_WEALTH_LIST);
console.log('CMB items=' + r.items.length);
r.items.forEach((it, i) =>
  console.log(`  [${i}] name=${it.productName} inst=${it.institution} mv=${it.marketValue} hold=${it.holdingProfit}`),
);

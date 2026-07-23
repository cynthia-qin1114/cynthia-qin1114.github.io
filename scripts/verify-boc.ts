import { parseBocWealthOcrText } from '../src/services/wealthOcrParser';
import { BOC_WEALTH } from '../src/services/__fixtures__/realOcrSamples';

const r = parseBocWealthOcrText(BOC_WEALTH);
console.log('BOC items=' + r.items.length);
for (let i = 0; i < r.items.length; i++) {
  const it = r.items[i];
  console.log(`  [${i}] name=${it.productName} inst=${it.institution} mv=${it.marketValue} daily=${it.dailyProfit} hold=${it.holdingProfit}`);
}

import { parseWealthOcrText, parseAssetDistributionOcrText } from '../src/services/wealthOcrParser';
import { CMB_WEALTH_LIST, BOC_WEALTH, WEALTH_HOLDING_DETAIL, BOC_ASSETS } from '../src/services/__fixtures__/realOcrSamples';

const wealth = { CMB_WEALTH_LIST, BOC_WEALTH, WEALTH_HOLDING_DETAIL };
for (const [name, txt] of Object.entries(wealth)) {
  const r = parseWealthOcrText(txt);
  console.log('\n===== ' + name + ' =====  items=' + r.items.length);
  r.items.forEach((it, i) =>
    console.log(`  [${i}] mv=${it.marketValue} inst=${it.institution} name=${it.productName} daily=${it.dailyProfit} hold=${it.holdingProfit}`),
  );
}
const a = parseAssetDistributionOcrText(BOC_ASSETS);
console.log('\n===== BOC_ASSETS =====');
console.log('  total=' + a.totalAssets + ' wealth=' + a.wealthAmount + ' cash=' + a.cashAmount + ' fund=' + a.fundAmount);

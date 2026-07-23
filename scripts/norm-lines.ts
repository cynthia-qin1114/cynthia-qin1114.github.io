import { normalizeOcrText } from '../src/services/wealthOcrParser';
import { CMB_WEALTH_LIST, BOC_WEALTH, WEALTH_HOLDING_DETAIL, BOC_ASSETS } from '../src/services/__fixtures__/realOcrSamples';

for (const [name, txt] of Object.entries({ CMB_WEALTH_LIST, BOC_WEALTH, WEALTH_HOLDING_DETAIL, BOC_ASSETS })) {
  console.log('\n===== ' + name + ' (normalized) =====');
  const n = normalizeOcrText(txt);
  n.split(/\r?\n/).forEach((l, i) => console.log(String(i).padStart(2, '0'), '|', l));
}

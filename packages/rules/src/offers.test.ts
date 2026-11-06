import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_RULE } from './earning.ts';
import { offerValueRatio, offerWithinGuideline } from './offers.ts';

test('₱60 of value at 120 network points is 2.5%, within the guideline', () => {
  const offer = { pointsCost: 120, retailValueCentavos: 6000 };
  assert.equal(offerValueRatio(offer, NETWORK_RULE), 0.025);
  assert.equal(offerWithinGuideline(offer), true);
});
test('a free ₱150 pastry at 40 points is too generous', () => {
  const offer = { pointsCost: 40, retailValueCentavos: 15000 };
  assert.equal(offerValueRatio(offer, NETWORK_RULE), 0.1875);
  assert.equal(offerWithinGuideline(offer), false);
});
test('₱25 off at 120 points is too stingy', () => {
  assert.equal(offerWithinGuideline({ pointsCost: 120, retailValueCentavos: 2500 }), false);
});

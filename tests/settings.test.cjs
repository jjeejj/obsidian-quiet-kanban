const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
test('settings reject unsafe CSS values and normalize property names', () => {
  const s = normalizeSettings({ statusProperty: '状态', dateProperty: '', columnWidth: Infinity, cardTint: 999, colors: { a: 'url(x)', b: 'red' } });
  assert.equal(s.statusProperty, 'note.状态'); assert.equal(s.dateProperty, '');
  assert.equal(s.columnWidth, 310); assert.equal(s.cardTint, 35);
  assert.deepEqual(s.colors, { b: 'red' });
});

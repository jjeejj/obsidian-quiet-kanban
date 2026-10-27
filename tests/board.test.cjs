const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stableColor, buildGroups, nextStatus } = require('../src/board/model.cjs');
test('hide empty columns without losing saved order or new statuses', () => {
  const rows = [{ id: 1, statuses: ['测试中'] }, { id: 2, statuses: ['开发中'] }, { id: 3, statuses: ['新状态'] }];
  assert.deepEqual(buildGroups(rows, ['开发中', '完成', '测试中']).map(g => g.key), ['开发中', '测试中', '新状态']);
  assert.deepEqual(buildGroups(rows, ['开发中', '完成', '测试中'], false).map(g => g.key), ['开发中', '完成', '测试中', '新状态']);
  assert.deepEqual(buildGroups([...rows, { id: 4, statuses: ['完成'] }], ['开发中', '完成', '测试中']).map(g => g.key), ['开发中', '完成', '测试中', '新状态']);
});
test('multi-value and missing statuses are rendered without mutating inputs', () => {
  const row = { statuses: ['A', 'A', 'B'] }; const rows = [row, { statuses: [] }];
  const groups = buildGroups(rows, [['B'], ['A']]);
  assert.deepEqual(groups.map(g => [g.key, g.rows.length]), [['B', 1], ['A', 1], ['', 1]]);
  assert.deepEqual(row.statuses, ['A', 'A', 'B']);
});
test('status colors do not change when columns reorder or disappear', () => {
  const before = stableColor('research', {});
  buildGroups([], ['new', 'research'], false);
  assert.equal(stableColor('research', {}), before);
  assert.equal(stableColor('测试中', { '测试中': 'purple' }), 'purple');
  assert.doesNotThrow(() => stableColor('__proto__', {}));
});
test('moving multi-status notes preserves unrelated statuses and scalar types', () => {
  assert.deepEqual(nextStatus(['开发中', '其他'], '开发中', '测试中'), ['其他', '测试中']);
  assert.equal(nextStatus('开发中', '开发中', '测试中'), '测试中');
  assert.deepEqual(nextStatus(['开发中'], '开发中', ''), []);
  assert.equal(nextStatus('开发中', '开发中', ''), null);
});

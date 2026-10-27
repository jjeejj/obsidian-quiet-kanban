const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { resolveViewSettings, groupKey, viewLayout, makePreset } = require('../src/board/fields.cjs');
const { BoardView } = loadModule('src/board/view.cjs', { BasesView: class {}, Modal: class {}, FuzzySuggestModal: class {} });

function config(data) {
  return { get: key => data[key], set: (key, value) => { data[key] = value; } };
}

test('dragged column order survives serialization with native groupOrder kept out of custom data', async () => {
  const settings = normalizeSettings({ statusProperty: '状态', dateProperty: '', projectProperty: '' });
  let data = { groupProperty: 'note.状态', groupOrderProperty: 'note.状态', statusProperty: 'note.状态', statusOrder: ['A', 'Empty', 'B'] };
  const nativeGroupOrder = [['A'], ['Empty'], ['B']];
  const view = { config: config(data), groups: [{ key: groupKey('A') }, { key: groupKey('B') }],
    plugin: {}, options() { return resolveViewSettings(settings, this.config, normalizeSettings); } };
  view.plugin.drag = { view, kind: 'column', from: groupKey('B') };
  const column = { dataset: { status: groupKey('A') }, classList: { remove() {} } };
  await BoardView.prototype.onDrop.call(view, { target: { closest: () => column }, preventDefault() {} });
  assert.deepEqual(data.columnOrder, ['B', 'A', 'Empty']);
  assert.equal(Object.hasOwn(data, 'groupOrder'), false);
  // Reopening a Base reconstructs custom data separately from reserved native keys.
  const serialized = JSON.stringify({ ...data, groupOrder: nativeGroupOrder });
  const { groupOrder, ...reopened } = JSON.parse(serialized);
  assert.deepEqual(groupOrder, nativeGroupOrder);
  assert.deepEqual(resolveViewSettings(settings, config(reopened), normalizeSettings).groupOrder, ['B', 'A', 'Empty']);
});

test('persisted preset/config layouts use columnOrder and preserve false and zero', () => {
  const preset = viewLayout(makePreset('task'));
  assert.deepEqual(preset.columnOrder, ['待办', '进行中', '已完成']);
  assert.equal(Object.hasOwn(preset, 'groupOrder'), false);
  const data = viewLayout({ groupProperty: 'note.bucket', fields: [], groupOrder: [false, true, 0, '0'] });
  const result = resolveViewSettings(normalizeSettings(), config(JSON.parse(JSON.stringify(data))), normalizeSettings);
  assert.deepEqual(result.groupOrder, [false, true, 0, '0']);
});

test('legacy order remains readable with a migrated grouping property; explicit new empty order wins', () => {
  const settings = normalizeSettings({ statusProperty: '状态' });
  const legacy = { groupProperty: 'note.状态', statusProperty: 'note.状态', statusOrder: ['B', 'A'] };
  assert.deepEqual(resolveViewSettings(settings, config(legacy), normalizeSettings).groupOrder, ['B', 'A']);
  assert.deepEqual(resolveViewSettings(settings, config({ ...legacy, columnOrder: [] }), normalizeSettings).groupOrder, []);
  assert.deepEqual(resolveViewSettings(settings, config({ ...legacy, groupProperty: 'note.owner' }), normalizeSettings).groupOrder, []);
});

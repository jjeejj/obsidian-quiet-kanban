const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { layoutFrom, makePreset, normalizeFields, resolveViewSettings, groupKey, groupValue, nextGroupValue } = require('../src/board/fields.cjs');
const { loadModule } = require('./helpers/load-module.cjs');

test('old global and per-view fields migrate without mutating input; new boards start blank', () => {
  const legacy = { statusProperty: '阶段', dateProperty: '开始日期', projectProperty: '项目', titleProperty: 'file.name' };
  const snapshot = JSON.stringify(legacy);
  const global = normalizeSettings(legacy);
  assert.equal(global.groupProperty, 'note.阶段');
  assert.deepEqual(global.fields.map(f => [f.property, f.display, f.showLabel, f.hideEmpty]), [
    ['note.开始日期', 'date', true, false], ['note.项目', 'tags', false, false]
  ]);
  assert.equal(JSON.stringify(legacy), snapshot);
  const local = { statusProperty: 'note.负责人', dateProperty: '', projectProperty: 'note.标签', statusOrder: ['A', 'B'] };
  const resolved = resolveViewSettings(global, { get: key => local[key] }, normalizeSettings);
  assert.equal(resolved.groupProperty, 'note.负责人');
  assert.deepEqual(resolved.fields.map(f => f.property), ['note.标签']);
  assert.deepEqual(resolved.groupOrder, ['A', 'B']);
  assert.equal(normalizeSettings().groupProperty, '');
  assert.deepEqual(normalizeSettings().fields, []);
  assert.deepEqual(layoutFrom({ fields: [], groupProperty: '' }), {
    groupProperty: '', titleProperty: 'file.name', fields: [], fieldsSource: 'custom', groupOrder: [], groupOrderProperty: ''
  });
});

test('scene presets are independent starting points; field lists replace global lists', () => {
  const task = makePreset('task');
  assert.equal(task.groupProperty, 'note.状态');
  assert.deepEqual(task.fields.map(f => f.property), ['note.负责人', 'note.截止日期', 'note.优先级']);
  task.fields[0].property = 'note.changed';
  assert.equal(makePreset('task').fields[0].property, 'note.负责人');
  assert.equal(makePreset('project').fields.at(-1).display, 'number');
  assert.equal(makePreset('content').fields.at(-1).display, 'checkbox');
  assert.deepEqual(makePreset('blank').fields, []);
  const options = resolveViewSettings(normalizeSettings(makePreset('task')), { get: key => key === 'fields' ? [] : undefined }, normalizeSettings);
  assert.deepEqual(options.fields, []);
});

test('Bases property menu order and explicit aliases share one field list', () => {
  const options = resolveViewSettings(normalizeSettings(makePreset('task')), {
    get: key => key === 'fieldsSource' ? 'bases' : undefined,
    getOrder: () => ['file.name', 'note.priority', 'formula.total', 'note.owner']
  }, normalizeSettings);
  assert.deepEqual(options.fields.map(f => f.property), ['note.priority', 'formula.total', 'note.owner']);
  assert.deepEqual(normalizeFields(['owner', { property: 'note.owner', display: 'date' }, { property: 'formula.total', display: 'invalid' }]).map(f => [f.property, f.display]), [
    ['note.owner', 'auto'], ['formula.total', 'auto']
  ]);
});

test('typed group keys distinguish booleans and numbers from text and preserve multi-values', () => {
  const values = [false, true, 0, 1, 'false', 'true', '0', '1', '["string","x"]'];
  assert.equal(new Set(values.map(groupKey)).size, values.length);
  assert.deepEqual(values.map(value => groupValue(groupKey(value))), values);
  assert.equal(groupValue(''), null);
  assert.equal(nextGroupValue(true, true, false), false);
  assert.equal(nextGroupValue(1, 1, 0), 0);
  assert.deepEqual(nextGroupValue(['A', 'Other'], 'A', 'B'), ['Other', 'B']);
  assert.deepEqual(nextGroupValue([false, 'Other'], false, null), ['Other']);
});

class NumberValue { constructor(value) { this.value = value; } toString() { return String(this.value); } }
class BooleanValue extends NumberValue {}
class DateValue { constructor(value) { this.value = value; } toString() { return String(this.value); } }
class ListValue { constructor(items) { this.items = items; } length() { return this.items.length; } get(i) { return this.items[i]; } }
class NullValue {}
const obsidian = { NumberValue, BooleanValue, DateValue, ListValue, NullValue, Modal: class {} };
const { typedValues, valueKind, resolvedFields, renderField } = loadModule('src/board/values.cjs', obsidian);

test('Bases values retain types and field rendering respects aliases, false, zero and hidden empties', () => {
  assert.deepEqual(typedValues(new ListValue([new BooleanValue(false), new NumberValue(0), '0'])), [false, 0, '0']);
  assert.equal(valueKind(new DateValue('2026-10-26')), 'date');
  assert.equal(valueKind(new NullValue()), 'text');
  const data = { 'note.done': new BooleanValue(false), 'formula.budget': new NumberValue(0), 'note.missing': new NullValue() };
  const entry = { getValue: key => data[key] };
  const fields = resolvedFields(entry, { titleProperty: 'file.name', fields: normalizeFields([
    'note.done', 'formula.budget', 'note.missing', { property: 'note.other', hideEmpty: false, emptyText: 'Empty' }
  ]) }, { getDisplayName: key => 'Alias: ' + key });
  const doc = { createElement: () => ({ children: [], classList: { add() {} }, appendChild(node) { this.children.push(node); } }) };
  const parent = { ownerDocument: doc, children: [], appendChild(node) { this.children.push(node); } };
  for (const field of fields) renderField(parent, entry, field, text => text);
  assert.equal(parent.children.length, 3);
  assert.equal(parent.children[0].children[0].textContent, 'Alias: note.done');
  assert.equal(parent.children[0].children[1].textContent, '☐');
  assert.equal(parent.children[1].children[1].textContent, '0');
  assert.equal(parent.children[2].children[1].textContent, 'Empty');
});

const { saveCardEdits } = loadModule('src/board/quick-edit.cjs', obsidian);
test('generic editor saves typed numbers, booleans and lists; calculated fields stay read-only', async () => {
  const fields = [
    { property: 'note.budget', kind: 'number' }, { property: 'note.done', kind: 'boolean' },
    { property: 'note.people', kind: 'list' }, { property: 'formula.total', kind: 'number' }
  ];
  const fm = { unrelated: 42 };
  const app = { fileManager: { processFrontMatter: async (_file, change) => change(fm) } };
  const initial = { title: 'Task', 'note.budget': '1', 'note.done': true, 'note.people': 'A', 'formula.total': '9' };
  const draft = { ...initial, 'note.budget': '0', 'note.done': false, 'note.people': 'A\nB\nA', 'formula.total': '10' };
  await saveCardEdits(app, {}, { titleProperty: 'file.name', fields }, initial, draft, text => text);
  assert.deepEqual(fm, { unrelated: 42, budget: 0, done: false, people: ['A', 'B'] });
  const bad = { ...draft, 'note.budget': 'NaN' };
  await assert.rejects(saveCardEdits(app, {}, { titleProperty: 'file.name', fields }, initial, bad, text => text), /有效数字/);
  assert.deepEqual(fm, { unrelated: 42, budget: 0, done: false, people: ['A', 'B'] });
});


test('column order belongs to its grouping property and does not leak into another group', () => {
  const global = normalizeSettings(makePreset('task'));
  const config = { get: key => key === 'groupProperty' ? 'note.负责人' : undefined };
  assert.deepEqual(resolveViewSettings(global, config, normalizeSettings).groupOrder, []);
  assert.deepEqual(layoutFrom({ ...makePreset('task'), groupProperty: 'note.负责人' }).groupOrder, []);
});

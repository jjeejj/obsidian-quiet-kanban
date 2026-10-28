const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { makePreset } = require('../src/board/fields.cjs');
function fixture(board = false) {
  const rows = [];
  const container = () => ({ empty() { rows.length = 0; }, createEl() {}, createDiv: () => container() });
  class Modal {
    constructor(app) { this.app = app; this.contentEl = container(); this.modalEl = { classList: { add() {} } }; }
    close() { this.closed = true; }
  }
  class Setting {
    constructor() { rows.push(this); this.buttons = []; this.inputs = []; this.toggles = []; }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    control() { return { setValue(value) { this.value = value; return this; }, setButtonText(text) { this.text = text; return this; },
      addOptions(options) { this.options = options; return this; }, setPlaceholder() { return this; }, setTooltip() { return this; }, setDisabled() { return this; }, setCta() { return this; },
      onChange(fn) { this.change = fn; return this; }, onClick(fn) { this.click = fn; return this; } }; }
    addButton(fn) { const c = this.control(); fn(c); this.buttons.push(c); return this; }
    addDropdown(fn) { this.dropdown = this.control(); fn(this.dropdown); return this; }
    addText(fn) { const c = this.control(); fn(c); this.inputs.push(c); return this; }
    addToggle(fn) { const c = this.control(); fn(c); this.toggles.push(c); return this; }
  }
  const { FieldConfigModal } = loadModule('src/board/field-config.cjs', { Modal, Setting, FuzzySuggestModal: class {} });
  let saves = 0; let refreshes = 0;
  const plugin = { app: {}, t: text => text, settings: normalizeSettings(makePreset('task')), async save() { saves++; }, refresh() { refreshes++; } };
  const writes = [];
  const view = board ? { options: () => plugin.settings, config: { set: (key, value) => writes.push([key, value]) } } : null;
  const modal = new FieldConfigModal(plugin, view); modal.onOpen();
  return { modal, plugin, rows, writes, saves: () => saves, refreshes: () => refreshes };
}

test('preset and custom changes stay in the draft until saved; cancel leaves global settings intact', async () => {
  const f = fixture();
  const original = structuredClone(f.plugin.settings);
  f.rows[0].dropdown.change('project');
  assert.equal(f.modal.draft.groupProperty, 'note.负责人');
  assert.equal(f.modal.draft.fields.at(-1).display, 'number');
  assert.deepEqual(f.plugin.settings, original);
  f.rows.at(-1).buttons[0].click();
  assert.equal(f.modal.closed, true);
  assert.equal(f.saves(), 0);
  const g = fixture();
  g.rows[0].dropdown.change('content');
  g.rows.find(row => row.name === '显示名称').inputs[0].change('Custom date');
  await g.rows.at(-1).buttons[1].click();
  assert.equal(g.plugin.settings.groupProperty, 'note.发布平台');
  assert.equal(g.plugin.settings.fields[0].label, 'Custom date');
  assert.equal(g.saves(), 1);
  assert.equal(g.refreshes(), 1);
});

test('per-board save replaces its layout only, with independent order, aliases and empty-value choices', async () => {
  const f = fixture(true);
  const original = structuredClone(f.plugin.settings);
  const first = f.rows.find(row => row.name === '1. 展示字段');
  first.buttons[2].click(); // Move first field down.
  assert.equal(f.modal.draft.fields[0].property, 'note.截止日期');
  const details = f.rows.find(row => row.name === '显示字段名');
  details.toggles[0].change(false); details.dropdown.change('show'); details.inputs[0].change('Unknown');
  await f.rows.at(-1).buttons[1].click();
  const saved = Object.fromEntries(f.writes);
  assert.equal(saved.fields[0].property, 'note.截止日期');
  assert.equal(saved.fields[0].showLabel, false);
  assert.equal(saved.fields[0].hideEmpty, false);
  assert.equal(saved.fields[0].emptyText, 'Unknown');
  assert.deepEqual(f.plugin.settings, original);
  assert.equal(f.saves(), 0);
});

test('property choices use board scope and configured layouts without scanning vault notes', () => {
  const { availableProperties } = loadModule('src/board/field-config.cjs', { Modal: class {}, FuzzySuggestModal: class {} });
  const app = new Proxy({}, { get() { throw Error('Property choices must not access vault or metadata cache'); } });
  const layouts = [{ groupProperty: 'Bucket', titleProperty: 'note.Name', fields: [{ property: 'Cost' }] }];
  const global = availableProperties(app, null, layouts);
  assert.ok(global.includes('note.Bucket'));
  assert.ok(global.includes('note.Name'));
  assert.ok(global.includes('note.Cost'));
  assert.ok(global.includes('file.name'));
  const board = availableProperties(app, { allProperties: ['note.Team', 'formula.Total', 'note.Cost'] }, layouts);
  assert.ok(board.includes('formula.Total'));
  assert.ok(board.includes('note.Team'));
  assert.equal(board.filter(p => p === 'note.Cost').length, 1);
  assert.ok(!global.includes('note.Team'));
});

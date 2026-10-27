const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
function fixture() {
  function container() {
    return { rows: [], children: [], empty() { this.rows = []; this.children = []; }, createDiv() { const child = container(); this.children.push(child); return child; } };
  }
  class Setting {
    constructor(parent) { parent.rows.push(this); this.buttons = []; this.style = {}; this.settingEl = { classList: { add() {} }, style: { setProperty: (key, value) => { this.style[key] = value; } } }; }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    control() { return { setValue(value) { this.value = value; return this; }, setPlaceholder() { return this; },
      addOptions(options) { this.options = options; return this; }, setButtonText() { return this; },
      setDisabled(value) { this.disabled = value; return this; }, onChange(fn) { this.change = fn; return this; }, onClick(fn) { this.click = fn; return this; } }; }
    addDropdown(fn) { this.dropdown = this.control(); fn(this.dropdown); return this; }
    addText(fn) { this.input = this.control(); fn(this.input); return this; }
    addButton(fn) { const button = this.control(); fn(button); this.buttons.push(button); return this; }
  }
  const { renderColorSettings } = loadModule('src/settings/colors.cjs', { Setting });
  const parent = container(); let saves = 0;
  const plugin = { t: text => text, settings: { colors: { Doing: 'blue', Done: 'green' }, templateFile: 'Template.md' },
    async save() { saves++; }, refresh() {} };
  renderColorSettings(parent, plugin);
  return { section: parent.children[0], plugin, saves: () => saves };
}

test('visual color editor changes/removes only the chosen mapping and updates the preview', async () => {
  const f = fixture();
  const row = f.section.children[0].rows[0];
  assert.equal(row.name, 'Doing');
  assert.equal(row.dropdown.options.blue, '蓝色');
  await row.dropdown.change('purple');
  assert.equal(row.style['--qk-group-color'], 'var(--color-purple)');
  assert.deepEqual(f.plugin.settings.colors, { Doing: 'purple', Done: 'green' });
  await row.buttons[0].click();
  assert.deepEqual(f.plugin.settings.colors, { Done: 'green' });
  assert.equal(f.plugin.settings.templateFile, 'Template.md');
  assert.equal(f.saves(), 2);
});

test('adding a color trims the group name and ignores empty/invalid values', async () => {
  const f = fixture();
  const add = f.section.rows[0];
  assert.equal(add.buttons[0].disabled, true);
  await add.buttons[0].click();
  assert.equal(f.saves(), 0);
  add.input.change('  Research  ');
  assert.equal(add.buttons[0].disabled, false);
  add.dropdown.change('cyan');
  await add.buttons[0].click();
  assert.deepEqual(f.plugin.settings.colors, { Doing: 'blue', Done: 'green', Research: 'cyan' });
  assert.equal(f.saves(), 1);
});

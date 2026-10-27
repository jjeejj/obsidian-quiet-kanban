const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');

for (const filename of ['src/main.cjs', 'main.js']) {
  test(`${filename}: language dropdown saves, refreshes UI and commands, and survives reload`, async () => {
    let appLanguage = 'en';
    let saved = {};
    const rows = [];
    const pickers = [];
    const events = new Map();
    const openedModals = [];
    class Setting {
      constructor() { rows.push(this); this.settingEl = { classList: { add() {} }, style: { setProperty() {} } }; }
      setName(name) { this.name = name; return this; }
      setDesc() { return this; }
      addDropdown(callback) {
        const control = { addOptions(options) { this.options = options; return this; },
          setValue(value) { this.value = value; return this; },
          onChange(fn) { this.change = fn; return this; } };
        callback(control); this.dropdown = control; return this;
      }
      addText() { return this; }
      addToggle() { return this; }
      addSlider() { return this; }
      addTextArea() { return this; }
      addButton(callback) {
        const control = { setButtonText(text) { this.text = text; return this; }, setDisabled() { return this; }, onClick(fn) { this.click = fn; return this; } };
        callback(control); (this.buttons ||= []).push(control); return this;
      }
    }
    class Plugin {
      constructor() {
        this.app = { workspace: { onLayoutReady() {}, on(name, callback) { events.set(name, callback); return { name }; } } };
        this.manifest = { id: 'quiet-kanban', name: 'Quiet Kanban' };
      }
      registerEvent(event) { (this.events ||= []).push(event); }
      async loadData() { return saved; }
      async saveData(data) { saved = JSON.parse(JSON.stringify(data)); }
      registerBasesView(_type, registration) { this.registration = registration; return true; }
      addSettingTab(tab) { this.tab = tab; }
      addCommand(command) { return { ...command, name: `Quiet Kanban: ${command.name}` }; }
    }
    const obsidian = { Plugin, Setting, AbstractInputSuggest: class {}, getLanguage: () => appLanguage, BasesView: class {}, Modal: class { open() { openedModals.push(this); } }, TFolder: class { constructor(path) { this.path = path; } }, FuzzySuggestModal: class {
      constructor(app) { this.app = app; }
      setPlaceholder() {}
      open() { pickers.push(this); }
    },
      PluginSettingTab: class {
        constructor(app) { this.app = app; this.containerEl = { classList: { add() {} }, empty() { rows.length = 0; }, createEl() {}, createDiv() { return { empty() {}, createDiv: this.createDiv }; } }; }
      } };
    const QuietKanban = loadModule(filename, obsidian);
    const plugin = new QuietKanban();
    await plugin.onload();
    const menuItems = [];
    const folderMenu = { addItem(callback) {
      const item = { setTitle(value) { this.title = value; return this; }, setIcon() { return this; }, setSection(value) { this.section = value; return this; }, onClick(fn) { this.click = fn; return this; } };
      callback(item); menuItems.push(item);
    } };
    events.get('file-menu')(folderMenu, { path: 'Note.md' });
    assert.equal(menuItems.length, 0);
    events.get('file-menu')(folderMenu, new obsidian.TFolder('Projects/App'));
    assert.equal(menuItems[0].title, 'Create board');
    assert.equal(menuItems[0].section, 'action-primary');
    menuItems[0].click();
    assert.equal(openedModals.at(-1).targetFolder, 'Projects/App');
    assert.equal(plugin.events[0].name, 'file-menu');
    plugin.tab.display();
    assert.equal(rows[0].name, 'Language');
    assert.equal(rows[0].dropdown.value, 'auto');
    assert.equal(rows[0].dropdown.options.zh, '中文');
    assert.equal(rows[0].dropdown.options.en, 'English');
    let renders = 0;
    plugin.views.add({ render() { renders++; } });
    const button = { setAttribute(key, value) { this[key] = value; } };
    await rows[0].dropdown.change('zh');
    assert.equal(saved.settings.language, 'zh');
    assert.equal(rows[0].name, '语言');
    assert.equal(plugin.registration.options()[0].displayName, '分组字段');
    assert.match(plugin.localizedCommands.find(([command]) => command.id === 'create-board')[0].name, /创建增强看板/);
    assert.equal(renders, 1);
    plugin.previews.records.set('test', { button });
    plugin.refreshLanguage();
    assert.equal(button['aria-label'], '收起需求详情');
    plugin.previews.records.clear();
    const reloaded = new QuietKanban();
    await reloaded.onload();
    assert.equal(reloaded.settings.language, 'zh');
    assert.equal(reloaded.t('增强看板'), '增强看板');
    await rows[0].dropdown.change('en');
    assert.equal(rows[0].name, 'Language');
    assert.match(plugin.localizedCommands.find(([command]) => command.id === 'create-board')[0].name, /Create enhanced Kanban board/);
    await rows[0].dropdown.change('auto');
    appLanguage = 'zh-TW';
    assert.equal(plugin.t('增强看板'), '增强看板');
    assert.equal(plugin.settings.language, 'auto');
    const globalRow = rows.find(row => row.name === 'Global new item template');
    globalRow.buttons[0].click();
    await pickers.at(-1).onChooseItem({ path: 'Templates/Task.md' });
    assert.equal(saved.settings.templateFile, 'Templates/Task.md');
    const { BoardView } = loadModule('src/board/view.cjs', obsidian);
    const options = override => BoardView.prototype.options.call({ plugin, config: { get: key => key === 'templateFile' ? override : undefined } });
    assert.equal(options(undefined).templateFile, 'Templates/Task.md');
    assert.equal(options('Board template.md').templateFile, 'Board template.md');
    assert.equal(options('').templateFile, '');
    const restored = new QuietKanban();
    await restored.onload();
    assert.equal(restored.settings.templateFile, 'Templates/Task.md');
    rows.find(row => row.name === '全局新建需求模板').buttons[1].click();
    await plugin.saveQueue;
    assert.equal(saved.settings.templateFile, '');
  });
}

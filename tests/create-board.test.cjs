const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { normalizeSettings } = require('../src/settings/defaults.cjs');

function fixture(targetFolder) {
  const rows = []; const writes = []; const notices = []; const opened = [];
  const folders = new Set(['Projects/App', 'OtherNotes']);
  const existing = new Set(['Projects/App/增强看板.base']);
  class Modal {
    constructor(app) { this.app = app; this.contentEl = { createEl() {}, empty() {} }; }
    close() { this.closed = true; }
  }
  class Setting {
    constructor() { rows.push(this); }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    control() { return { setValue(value) { this.value = value; return this; }, onChange(fn) { this.change = fn; return this; },
      addOptions() { return this; }, setButtonText() { return this; }, setCta() { return this; }, onClick(fn) { this.click = fn; return this; } }; }
    addText(fn) { this.input = this.control(); fn(this.input); return this; }
    addDropdown(fn) { this.dropdown = this.control(); fn(this.dropdown); return this; }
    addButton(fn) { this.button = this.control(); fn(this.button); return this; }
  }
  const { CreateBoardModal } = loadModule('src/files/create-modal.cjs', {
    Modal, Setting, AbstractInputSuggest: class { constructor(app) { this.app = app; } close() { this.closed = true; } }, stringifyYaml: JSON.stringify, Notice: class { constructor(text) { notices.push(text); } }
  });
  const plugin = { settings: normalizeSettings(), t: text => text, app: {
    vault: {
      getAllFolders: () => [{ path: '/' }, ...[...folders].map(path => ({ path }))],
      getFolderByPath: value => folders.has(value), getAbstractFileByPath: value => existing.has(value),
      async create(path, text) { writes.push({ path, document: JSON.parse(text) }); return { path }; }
    }, workspace: { getLeaf: () => ({ openFile: async file => opened.push(file.path) }) }
  } };
  const modal = new CreateBoardModal(plugin, targetFolder === undefined ? undefined : { targetFolder });
  modal.onOpen();
  return { modal, rows, writes, notices, folders, opened };
}

test('folder context creation defaults the note scope and resolves name collisions inside that folder', async () => {
  const f = fixture('Projects/App');
  assert.equal(f.rows.find(row => row.name === '文档所在文件夹').input.value, 'Projects/App');
  await f.rows.at(-1).button.click();
  assert.equal(f.writes[0].path, 'Projects/App/增强看板 1.base');
  assert.deepEqual(f.writes[0].document.views[0].filters.and, ['file.ext == "md"', 'file.inFolder("Projects/App")']);
  assert.deepEqual(f.opened, ['Projects/App/增强看板 1.base']);
  assert.equal(f.modal.closed, true);
});

test('document scope can change without moving the destination; missing destination does not create a file', async () => {
  const f = fixture('Projects/App');
  f.rows.find(row => row.name === '文档所在文件夹').input.change('OtherNotes');
  await f.rows.at(-1).button.click();
  assert.equal(f.writes[0].path, 'Projects/App/增强看板 1.base');
  assert.ok(f.writes[0].document.views[0].filters.and.includes('file.inFolder("OtherNotes")'));
  const missing = fixture('Projects/App'); missing.folders.delete('Projects/App');
  await missing.rows.at(-1).button.click();
  assert.equal(missing.writes.length, 0);
  assert.deepEqual(missing.notices, ['目标文件夹不存在']);
});

test('root folder and command entry retain root creation with no folder filter', async () => {
  for (const target of ['/', undefined]) {
    const f = fixture(target);
    await f.rows.at(-1).button.click();
    assert.equal(f.writes[0].path, '增强看板.base');
    assert.deepEqual(f.writes[0].document.views[0].filters.and, ['file.ext == "md"']);
  }
});

test('creation keeps the selected destination and offers matching folder suggestions', async () => {
  const f = fixture('Projects/App');
  assert.equal(f.rows.some(row => row.name === '看板保存位置'), false);
  assert.deepEqual(f.modal.folderSuggest.getSuggestions('other').map(folder => folder.path), ['OtherNotes']);
  f.modal.folderSuggest.selectSuggestion({ path: 'OtherNotes' });
  assert.equal(f.rows.find(row => row.name === '文档所在文件夹').input.value, 'OtherNotes');
  await f.rows.at(-1).button.click();
  assert.equal(f.writes[0].path, 'Projects/App/增强看板 1.base');
  assert.ok(f.writes[0].document.views[0].filters.and.includes('file.inFolder("OtherNotes")'));
  const root = fixture('Projects/App');
  assert.ok(root.modal.folderSuggest.getSuggestions('').some(folder => folder.path === '/'));
  root.modal.folderSuggest.selectSuggestion({ path: '/' });
  await root.rows.at(-1).button.click();
  assert.deepEqual(root.writes[0].document.views[0].filters.and, ['file.ext == "md"']);
  assert.equal(root.writes[0].path, 'Projects/App/增强看板 1.base');
});

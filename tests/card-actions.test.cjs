const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');

function fixture() {
  const buttons = [];
  const menus = [];
  const modals = [];
  const trashed = [];
  class Modal {
    constructor(app) { this.app = app; this.modalEl = { classList: { add() {} }, setAttribute() {} }; this.contentEl = { createEl() {}, empty() {} }; }
    open() { modals.push(this); this.onOpen(); }
    close() { this.closed = true; }
  }
  class Setting {
    constructor() {}
    addButton(callback) {
      const button = { setButtonText(value) { this.text = value; return this; }, setWarning() { return this; },
        setDisabled() { return this; }, onClick(fn) { this.click = fn; return this; } };
      callback(button); buttons.push(button); return this;
    }
  }
  class Menu {
    constructor() { this.items = []; menus.push(this); }
    addItem(callback) {
      const item = { setTitle(title) { this.title = title; return this; }, setIcon() { return this; },
        onClick(fn) { this.click = fn; return this; } };
      callback(item); this.items.push(item); return this;
    }
    showAtPosition(position) { this.position = position; }
    showAtMouseEvent(event) { this.event = event; }
  }
  const obsidian = { Modal, Setting, Menu, Notice: class {}, BasesView: class {}, FuzzySuggestModal: class {} };
  const app = { vault: { getFolderByPath: p => p === 'Archive', getAbstractFileByPath: () => null },
    fileManager: { trashFile: async file => trashed.push(file) } };
  const file = { path: 'Tasks/Task.md', basename: 'Task', name: 'Task.md', extension: 'md', parent: { path: 'Tasks' } };
  return { ...loadModule('src/board/card-actions.cjs', obsidian), obsidian, app, file,
    plugin: { app, t: text => text }, buttons, menus, modals, trashed };
}

test('card rename/move validates destinations, collisions and root-folder moves', () => {
  const f = fixture();
  const target = (mode, value) => f.destinationPath(f.app, f.file, mode, value, text => text);
  assert.equal(target('rename', 'New.md'), 'Tasks/New.md');
  assert.equal(target('move', 'Archive'), 'Archive/Task.md');
  assert.equal(target('move', ''), 'Task.md');
  assert.throws(() => target('rename', '../Other'), /文件名/);
  assert.throws(() => target('move', '../Archive'), /已有的文件夹/);
  assert.throws(() => target('move', 'Missing'), /已有的文件夹/);
  f.app.vault.getAbstractFileByPath = () => f.file;
  assert.equal(target('rename', 'Task'), f.file.path);
  assert.throws(() => target('rename', 'Other'), /同名文件/);
});

test('more menu supports keyboard placement; delete requires explicit confirmation', async () => {
  const f = fixture();
  f.showCardMenu(f.plugin, f.file, { detail: 0 }, { getBoundingClientRect: () => ({ left: 10, bottom: 20 }) });
  assert.deepEqual(f.menus[0].position, { x: 10, y: 20 });
  assert.deepEqual(f.menus[0].items.map(item => item.title), ['重命名', '移动到文件夹', '删除']);
  f.menus[0].items[2].click();
  assert.equal(f.trashed.length, 0);
  f.buttons.find(button => button.text === '取消').click();
  assert.equal(f.trashed.length, 0);
  f.menus[0].items[2].click();
  await f.buttons.filter(button => button.text === '删除').at(-1).click();
  assert.deepEqual(f.trashed, [f.file]);
});

test('more opens the menu without opening a detail pane', async () => {
  const f = fixture();
  const { BoardView } = loadModule('src/board/view.cjs', f.obsidian);
  const opens = [];
  const edits = [];
  const card = { dataset: { path: f.file.path } };
  let actionName = 'more';
  const action = { get dataset() { return { action: actionName }; }, getBoundingClientRect: () => ({ left: 0, bottom: 0 }) };
  const event = { detail: 0, preventDefault() {}, stopPropagation() {}, target: {
    closest(selector) { return selector === '.qk-card' ? card : selector === '.qk-card-action' ? action : null; }
  } };
  const view = { entries: new Map([[f.file.path, { file: f.file }]]), plugin: f.plugin, app: f.app,
    ownerLeaf: () => ({ id: 'board' }), options: () => ({ openMode: 'split', togglePreview: true }),
    fail: error => { throw error; } };
  f.plugin.previews = { open: async (...args) => opens.push(args), snapshot: () => [{ boardId: 'board', leafId: 'detail' }] };
  f.app.workspace = { getLeafById: () => ({ openFile: async (...args) => edits.push(args) }) };
  await BoardView.prototype.onClick.call(view, event);
  assert.equal(opens.length, 0);

});

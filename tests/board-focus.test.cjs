const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { PreviewManager } = require('../src/preview/manager.cjs');

function fixture() {
  const events = [];
  const doc = { defaultView: {} };
  const card = { dataset: { path: 'Task.md' }, connected: true };
  function element() {
    return { ownerDocument: doc, dataset: {}, classList: { add() {}, remove() {} },
      appendChild() {}, remove() {}, setAttribute() {}, style: { setProperty() {} },
      querySelectorAll: () => [], replaceChildren() { card.connected = false; } };
  }
  doc.createElement = element;
  class BasesView {
    constructor(controller) { this.app = controller.app; this.config = { get() {} }; }
    register() {}
    registerDomEvent(target, name, callback) { events.push({ target, name, callback }); }
  }
  const { BoardView } = loadModule('src/board/view.cjs', {
    BasesView, Modal: class {}, FuzzySuggestModal: class {}, Notice: class {}, setIcon() {}
  });
  const board = { id: 'board' };
  const leaves = new Map([['board', board], ['detail', {
    id: 'detail', view: { getState: () => ({ file: 'Task.md' }) }, detach() { leaves.delete('detail'); }
  }]]);
  const app = { workspace: { getLeafById: id => leaves.get(id), setActiveLeaf() {} } };
  const plugin = { views: new Set(), settings: normalizeSettings(), t: text => text, previews: new PreviewManager(app.workspace) };
  plugin.previews.records.set('board', { leafId: 'detail', path: 'Task.md', mode: 'split' });
  const view = new BoardView({ app }, element(), plugin);
  view.data = { data: [] };
  view.entries = new Map([['Task.md', { file: { path: 'Task.md' } }]]);
  view.ownerLeaf = () => board;
  const target = { closest: selector => selector === '.qk-card' ? card : null };
  const fire = (name, event = {}) => events.filter(e => e.name === name).forEach(e => e.callback({ target, button: 0, ...event }));
  return { view, card, leaves, target, fire };
}

test('focus-triggered query refresh preserves the pressed card so the first click collapses details', async () => {
  const f = fixture();
  f.fire('pointerdown');
  // Obsidian activates the Bases leaf and updates its query between down and up.
  f.view.onDataUpdated();
  assert.equal(f.card.connected, true);
  assert.equal(f.view.renderPending, true);
  f.fire('pointerup');
  assert.equal(f.card.connected, true);
  await f.view.onClick({ target: f.target });
  assert.equal(f.leaves.has('detail'), false);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(f.card.connected, false);
  assert.equal(f.view.cardPointerDown, false);
  assert.equal(f.view.renderPending, false);
});

test('cancelled gestures or window blur release deferred query updates', () => {
  for (const end of ['pointercancel', 'blur']) {
    const f = fixture();
    f.fire('pointerdown');
    f.view.onDataUpdated();
    f.fire(end);
    assert.equal(f.view.cardPointerDown, false);
    assert.equal(f.view.renderPending, false);
    assert.equal(f.card.connected, false);
  }
});

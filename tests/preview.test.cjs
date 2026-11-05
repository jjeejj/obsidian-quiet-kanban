const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PreviewManager } = require('../src/preview/manager.cjs');
function fixture() {
  const leaves = new Map(); let counter = 0; const buttons = [];
  function leaf(id, initial) {
    let path = initial;
    const node = { id, view: { getState: () => ({ file: path }) },
      async openFile(file) { await Promise.resolve(); path = file.path; },
      detach() { leaves.delete(id); }, navigate(next) { path = next; } };
    leaves.set(id, node); return node;
  }
  const board = leaf('board', 'board.base');
  const ws = { getLeafById: id => leaves.get(id), setActiveLeaf() {},
    createLeafBySplit() { return leaf(`detail-${++counter}`); }, getLeaf() { return leaf(`tab-${++counter}`); } };
  const manager = new PreviewManager(ws, { button(_leaf, close) { const b = { close, removed: false, remove() { this.removed = true; } }; buttons.push(b); return b; } });
  return { manager, leaves, board, buttons, count: () => counter };
}
test('different cards reuse one detail pane; repeated card collapses it', async () => {
  const f = fixture();
  await f.manager.open(f.board, { path: 'A.md' }); const id = f.manager.snapshot()[0].leafId;
  await f.manager.open(f.board, { path: 'B.md' });
  assert.equal(f.count(), 1); assert.equal(f.manager.snapshot()[0].leafId, id);
  assert.equal(f.leaves.get(id).view.getState().file, 'B.md');
  await f.manager.open(f.board, { path: 'B.md' });
  assert.ok(!f.leaves.has(id)); assert.ok(f.leaves.has('board'));
  await f.manager.open(f.board, { path: 'C.md' }); assert.equal(f.count(), 2);
});
test('fast clicks are serialized, and an explicit close also queues', async () => {
  const f = fixture();
  await Promise.all(['A', 'B', 'C'].map(path => f.manager.open(f.board, { path })));
  assert.equal(f.count(), 1); assert.equal(f.manager.snapshot()[0].path, 'C');
  await Promise.all([f.manager.open(f.board, { path: 'D' }), f.manager.close('board')]);
  assert.equal(f.leaves.size, 1);
});
test('card clicks leave a manually navigated pane intact and open a new detail', async () => {
  const f = fixture();
  await f.manager.open(f.board, { path: 'A' }); const first = f.manager.snapshot()[0].leafId;
  f.leaves.get(first).navigate('unrelated.md');
  await f.manager.open(f.board, { path: 'A' });
  assert.equal(f.count(), 2); assert.equal(f.leaves.get(first).view.getState().file, 'unrelated.md');
  await f.manager.close('board');
  assert.ok(f.leaves.has(first)); assert.ok(f.leaves.has('board'));
});
test('explicit collapse closes the detail after its document path changes', async () => {
  for (const mode of ['split', 'tab']) {
    for (const viaButton of [true, false]) {
      const f = fixture();
      await f.manager.open(f.board, { path: 'A.md' }, mode);
      const id = f.manager.snapshot()[0].leafId;
      f.leaves.get(id).navigate('renamed-or-navigated.md');
      if (viaButton) await f.buttons[0].close();
      else await f.manager.close('board');
      assert.ok(!f.leaves.has(id)); assert.ok(f.leaves.has('board'));
      assert.equal(f.buttons[0].removed, true);
      assert.equal(f.manager.snapshot().length, 0);
    }
  }
});
test('a stale collapse button cannot close a replacement detail pane', async () => {
  const f = fixture();
  await f.manager.open(f.board, { path: 'A.md' });
  const oldButton = f.buttons[0];
  const opening = f.manager.open(f.board, { path: 'B.md' }, 'tab');
  const closing = oldButton.close();
  await Promise.all([opening, closing]);
  assert.equal(f.manager.snapshot().length, 1);
  assert.equal(f.manager.snapshot()[0].path, 'B.md');
  assert.ok(f.leaves.has(f.manager.snapshot()[0].leafId));
  assert.equal(f.buttons.at(-1).removed, false);
});
test('failed detach keeps the collapse button and record available for retry', async () => {
  const f = fixture();
  await f.manager.open(f.board, { path: 'A.md' });
  const id = f.manager.snapshot()[0].leafId;
  const leaf = f.leaves.get(id);
  const detach = leaf.detach;
  leaf.detach = () => { throw Error('detach failed'); };
  await assert.rejects(f.buttons[0].close(), /detach failed/);
  assert.equal(f.buttons[0].removed, false);
  assert.equal(f.manager.snapshot()[0].leafId, id);
  assert.ok(f.leaves.has(id));
  leaf.detach = detach;
  await f.buttons[0].close();
  assert.ok(!f.leaves.has(id)); assert.ok(f.leaves.has('board'));
});
test('tab mode, restore, button close and unload preserve the board', async () => {
  const f = fixture();
  await f.manager.open(f.board, { path: 'A' }, 'tab');
  assert.match(f.manager.snapshot()[0].leafId, /^tab-/);
  const snapshot = f.manager.snapshot(); f.manager.dispose();
  assert.equal(f.leaves.size, 2); assert.equal(f.buttons[0].removed, true);
  const restored = new PreviewManager({ getLeafById: id => f.leaves.get(id), setActiveLeaf() {} });
  restored.restore(snapshot); assert.equal(restored.snapshot().length, 1);
  await restored.close('board'); assert.equal(f.leaves.size, 1);
});
test('closing a detached detail is safe, with no effect on unrelated panes', async () => {
  const f = fixture(); await f.manager.open(f.board, { path: 'A' });
  f.leaves.get(f.manager.snapshot()[0].leafId).detach();
  await f.manager.close('board'); assert.equal(f.leaves.size, 1);
});
test('unload during a queued open does not attach more controls', async () => {
  const f = fixture(); const opening = f.manager.open(f.board, { path: 'A' });
  f.manager.dispose(); await opening;
  assert.equal(f.buttons.length, 0); assert.equal(f.leaves.size, 1);
});

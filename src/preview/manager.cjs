'use strict';
// Only panes created or explicitly restored by this manager may be reused/closed.
// Queued operations prevent fast clicks from creating duplicate splits.
class PreviewManager {
  constructor(workspace, hooks = {}) {
    this.workspace = workspace;
    this.hooks = hooks;
    this.records = new Map();
    this.queues = new Map();
    this.disposed = false;
  }
  enqueue(boardId, operation) {
    const previous = this.queues.get(boardId) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => this.disposed ? undefined : operation());
    this.queues.set(boardId, current);
    current.finally(() => { if (this.queues.get(boardId) === current) this.queues.delete(boardId); }).catch(() => {});
    return current;
  }
  resolve(boardId) {
    const record = this.records.get(boardId);
    if (!record) return null;
    const leaf = this.workspace.getLeafById(record.leafId);
    if (!leaf || leaf.id === boardId || leaf.view?.getState().file !== record.path) {
      record.button?.remove();
      this.records.delete(boardId);
      this.hooks.changed?.();
      return null;
    }
    return { record, leaf };
  }
  open(board, file, mode = 'split', toggle = true) {
    return this.enqueue(board.id, async () => {
      let existing = this.resolve(board.id);
      if (existing && existing.record.path === file.path && toggle) return this.closeNow(board.id);
      if (existing && existing.record.mode !== mode) { this.closeNow(board.id); existing = null; }
      let leaf = existing?.leaf;
      if (!leaf) {
        this.workspace.setActiveLeaf(board, { focus: false });
        leaf = mode === 'tab' ? this.workspace.getLeaf('tab') : this.workspace.createLeafBySplit(board, 'vertical', false);
      }
      const previousPath = leaf.view?.getState().file;
      try { await leaf.openFile(file, { active: true }); }
      catch (error) {
        if (!existing && !leaf.view?.getState().file && !previousPath) leaf.detach();
        throw error;
      }
      // Plugin unload must not leave a new managed button or save stale state.
      if (this.disposed) return;
      existing?.record.button?.remove();
      const record = { leafId: leaf.id, path: file.path, mode };
      this.records.set(board.id, record);
      record.button = this.hooks.button?.(leaf, () => this.close(board.id));
      this.hooks.changed?.();
    });
  }
  close(boardId) { return this.enqueue(boardId, () => this.closeNow(boardId)); }
  closeNow(boardId) {
    const found = this.resolve(boardId);
    if (!found) return;
    found.record.button?.remove();
    this.records.delete(boardId);
    found.leaf.detach();
    const board = this.workspace.getLeafById(boardId);
    if (board) this.workspace.setActiveLeaf(board, { focus: true });
    this.hooks.changed?.();
  }
  snapshot() {
    return [...this.records].map(([boardId, { leafId, path, mode }]) => ({ boardId, leafId, path, mode }));
  }
  restore(records) {
    for (const saved of Array.isArray(records) ? records : []) {
      if (!saved || saved.boardId === saved.leafId || typeof saved.path !== 'string') continue;
      const board = this.workspace.getLeafById(saved.boardId);
      const leaf = this.workspace.getLeafById(saved.leafId);
      if (!board || !leaf || leaf.view?.getState().file !== saved.path) continue;
      const record = { leafId: saved.leafId, path: saved.path, mode: saved.mode === 'tab' ? 'tab' : 'split' };
      this.records.set(saved.boardId, record);
      record.button = this.hooks.button?.(leaf, () => this.close(saved.boardId));
    }
  }
  dispose() {
    this.disposed = true;
    for (const record of this.records.values()) record.button?.remove();
  }
}
module.exports = { PreviewManager };

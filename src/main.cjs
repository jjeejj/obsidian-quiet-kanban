'use strict';
const { Plugin, Notice, getLanguage } = require('obsidian');
const i18n = require('./i18n/index.cjs');
const { normalizeSettings } = require('./settings/defaults.cjs');
const { BoardSettings } = require('./settings/tab.cjs');
const { BoardView } = require('./board/view.cjs');
const { TYPE, getViewOptions } = require('./board/options.cjs');
const { PreviewManager } = require('./preview/manager.cjs');
const { CreateBoardModal } = require('./files/create-modal.cjs');
const { convertBase } = require('./files/convert.cjs');
const { FieldConfigModal } = require('./board/field-config.cjs');
const { addFolderMenuItem } = require('./files/folder-menu.cjs');
module.exports = class QuietKanban extends Plugin {
  t(text, params) { return i18n.translate(this.settings.language, getLanguage(), text, params); }
  refreshLanguage() {
    for (const [command, text] of this.localizedCommands) command.name = `${this.manifest.name}: ${this.t(text)}`;
    for (const record of this.previews.records.values()) {
      record.button?.setAttribute('aria-label', this.t('收起需求详情'));
    }
    this.refresh();
  }
  addLocalizedCommand(text, command) {
    const registered = this.addCommand({ ...command, name: this.t(text) });
    this.localizedCommands.push([registered, text]);
  }
  async onload() {
    const saved = await this.loadData() || {};
    this.settings = normalizeSettings(saved.settings);
    this.views = new Set();
    this.localizedCommands = [];
    this.saveQueue = Promise.resolve();
    this.previews = new PreviewManager(this.app.workspace, {
      button: (leaf, close) => {
        const button = leaf.view.addAction('panel-right-close', this.t('收起需求详情'), () => close().catch(error => new Notice(error.message)));
        button.classList.add('qk-close-detail');
        // Keep collapse beside the board, before the detail pane's navigation arrows.
        const header = leaf.view.containerEl?.querySelector('.view-header');
        const navigation = header?.querySelector('.view-header-nav-buttons');
        (navigation || header)?.prepend(button);
        return button;
      },
      changed: () => this.save()
    });
    const plugin = this;
    const registered = this.registerBasesView(TYPE, {
      get name() { return plugin.t('增强看板'); }, icon: 'columns-3',
      factory: (controller, container) => new BoardView(controller, container, this),
      options: () => getViewOptions(this)
    });
    if (!registered) new Notice(this.t('请启用 Obsidian 核心插件「数据库 / Bases」后重新启用本插件'));
    this.addSettingTab(new BoardSettings(this.app, this));
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => addFolderMenuItem(this, menu, file)));
    this.addLocalizedCommand('配置看板字段', { id: 'configure-fields', checkCallback: checking => {
      const leaf = this.app.workspace.getMostRecentLeaf();
      const view = [...this.views].find(view => view.ownerLeaf() === leaf);
      if (!view) return false;
      if (!checking) new FieldConfigModal(this, view).open();
      return true;
    } });
    this.addLocalizedCommand('创建增强看板', { id: 'create-board', callback: () => new CreateBoardModal(this).open() });
    this.addLocalizedCommand('将当前原生看板转换为增强看板（自动备份）', { id: 'convert-board', checkCallback: checking => {
      const file = this.app.workspace.getActiveFile();
      if (file?.extension !== 'base') return false;
      if (!checking) convertBase(this, file).catch(error => new Notice(error.message));
      return true;
    } });
    this.addLocalizedCommand('收起看板需求详情', { id: 'close-detail', callback: () => {
      const active = this.app.workspace.getMostRecentLeaf();
      const record = this.previews.snapshot().find(r => r.boardId === active?.id || r.leafId === active?.id);
      if (record) this.previews.close(record.boardId).catch(error => new Notice(error.message));
      else new Notice(this.t('当前没有可收起的看板详情'));
    } });
    this.app.workspace.onLayoutReady(() => this.previews.restore(saved.previews));
  }
  refresh() { for (const view of this.views) view.render(); }
  save() {
    const data = { settings: this.settings, previews: this.previews.snapshot() };
    this.saveQueue = this.saveQueue.catch(() => {}).then(() => this.saveData(data)).catch(error => {
      console.error('Quiet Kanban: settings save failed', error);
      new Notice(this.t('看板设置保存失败，请检查仓库写入权限'));
    });
    return this.saveQueue;
  }
  onunload() {
    this.unloading = true;
    this.previews?.dispose();
    this.drag = null;
  }
};

'use strict';
const { Modal, Setting, Menu, Notice, normalizePath, getFrontMatterInfo, parseYaml } = require('obsidian');

class TemplatePicker extends Modal {
  constructor(app, translate, onSelect, initialPath = '') {
    super(app);
    this.translate = translate;
    this.onSelect = onSelect;
    this.path = initialPath;
  }
  onOpen() {
    const t = this.translate;
    this.contentEl.createEl('h2', { text: t('选择模板笔记') });
    new Setting(this.contentEl).setName(t('模板路径'))
      .setDesc(t('输入仓库相对路径（包含 .md），或使用当前打开的笔记。'))
      .addText(input => {
        this.input = input;
        input.setPlaceholder('Templates/Task.md').setValue(this.path).onChange(value => { this.path = value; });
      });
    const active = this.app.workspace.getActiveFile();
    if (active?.extension === 'md') {
      new Setting(this.contentEl).setName(active.path)
        .addButton(button => button.setButtonText(t('使用当前笔记')).onClick(() => {
          this.path = active.path;
          this.input.setValue(this.path);
        }));
    }
    this.errorEl = this.contentEl.createEl('p', { attr: { role: 'alert' } });
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(t('取消')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(t('保存')).setCta().onClick(() => this.submit()));
  }
  async submit() {
    if (this.saving) return;
    this.errorEl.textContent = '';
    const path = this.path.trim();
    // Resolve one explicit vault path. Never enumerate notes to locate a template.
    const file = path && !path.startsWith('/') && !path.split(/[\\/]/).includes('..')
      ? this.app.vault.getFileByPath(normalizePath(path)) : null;
    if (!file || file.extension !== 'md') {
      this.errorEl.textContent = this.translate('模板笔记不存在：{path}').replace('{path}', path);
      return;
    }
    this.saving = true;
    try { await this.onSelect(file); this.close(); }
    catch (error) { this.errorEl.textContent = error.message || String(error); }
    finally { this.saving = false; }
  }
  onClose() { this.contentEl.empty(); }
}

function parseTemplate(content) {
  const info = getFrontMatterInfo(content);
  const frontmatter = info.exists ? parseYaml(info.frontmatter) : {};
  if (frontmatter != null && (typeof frontmatter !== 'object' || Array.isArray(frontmatter))) {
    throw Error('Template frontmatter must be a YAML object');
  }
  return { frontmatter: frontmatter || {}, body: content.slice(info.contentStart) };
}

function suppressNativeCreatePopover(view) {
  const body = view.root?.ownerDocument?.body;
  if (!body) return () => {};
  const key = 'qkSuppressNewItemPopover';
  body.dataset[key] = String((Number(body.dataset[key]) || 0) + 1);
  return () => {
    const remaining = (Number(body.dataset[key]) || 1) - 1;
    if (remaining > 0) body.dataset[key] = String(remaining);
    else delete body.dataset[key];
  };
}

async function createItem(view, status) {
  const options = view.options();
  const property = options.groupProperty ?? options.statusProperty ?? '';
  if (property && !property.startsWith('note.')) throw Error(view.plugin.t('只读分组不支持在列中新建或拖动'));
  let template;
  if (options.templateFile) {
    const file = view.app.vault.getFileByPath(options.templateFile);
    if (!file || file.extension !== 'md') throw Error(view.plugin.t('模板笔记不存在：{path}', { path: options.templateFile }));
    // Validate before creating anything, so a broken association cannot leave a blank note.
    template = parseTemplate(await view.app.vault.read(file));
  }
  let created;
  let releasePopoverSuppression = suppressNativeCreatePopover(view);
  try {
    await view.createFileForView('', (frontmatter, file) => {
      // Keep the template's property order while allowing Bases-derived filter
      // values to override its defaults. Properties only supplied by Bases are
      // appended after the template fields.
      const derived = { ...frontmatter };
      for (const key of Object.keys(frontmatter)) delete frontmatter[key];
      for (const [key, value] of Object.entries(template?.frontmatter || {})) {
        Object.defineProperty(frontmatter, key, {
          value: Object.hasOwn(derived, key) ? derived[key] : value,
          enumerable: true, writable: true, configurable: true
        });
      }
      for (const [key, value] of Object.entries(derived)) {
        if (!Object.hasOwn(frontmatter, key)) {
          Object.defineProperty(frontmatter, key, { value, enumerable: true, writable: true, configurable: true });
        }
      }
      if (property && status != null && status !== '') {
        const key = property.slice(5);
        // Preserve list/scalar storage; legacy statusProperty used list values.
        frontmatter[key] = Array.isArray(frontmatter[key]) || options.groupProperty === undefined ? [status] : status;
      } else if (property && template) delete frontmatter[property.slice(5)];
      created = file;
    });
    if (created && template?.body) {
      await view.app.vault.process(created, current => {
        const info = getFrontMatterInfo(current);
        // Keep native frontmatter and any content added while the creation UI opened.
        const prefix = current.slice(0, info.contentStart);
        const existingBody = current.slice(info.contentStart);
        const separator = prefix && !prefix.endsWith('\n') ? '\n' : '';
        return prefix + separator + template.body + (existingBody ? '\n' + existingBody : '');
      });
    }
    if (created) {
      const board = view.ownerLeaf?.();
      if (board) {
        // Bases opens its own editor popover during createFileForView. Close it
        // while still visually suppressed, then hand the file to our detail pane.
        view.queryController?.newItemMenu?.close?.();
        releasePopoverSuppression();
        releasePopoverSuppression = null;
        await view.plugin.previews.open(board, created, options.openMode, false);
      }
    }
  } finally { releasePopoverSuppression?.(); }
}

function showNewItemMenu(view, button, status, event) {
  const templateFile = view.options().templateFile;
  const menu = new Menu();
  menu.addItem(item => item.setTitle(view.plugin.t(templateFile ? '使用关联模板新建文档' : '新建文档'))
    .setIcon('plus').onClick(() => createItem(view, status).catch(error => view.fail(error))));
  menu.addSeparator();
  menu.addItem(item => item.setTitle(view.plugin.t('关联模板…')).setIcon('file-input')
    .onClick(() => new TemplatePicker(view.app, text => view.plugin.t(text), file => view.config.set('templateFile', file.path), templateFile).open()));
  if (templateFile) {
    menu.addItem(item => item.setTitle(view.plugin.t('打开关联模板')).setIcon('file-text').onClick(async () => {
      const file = view.app.vault.getFileByPath(templateFile);
      if (file) await view.app.workspace.getLeaf('tab').openFile(file);
      else new Notice(view.plugin.t('模板笔记不存在：{path}', { path: templateFile }));
    }));
    menu.addItem(item => item.setTitle(view.plugin.t('取消关联模板')).setIcon('unlink')
      .onClick(() => view.config.set('templateFile', '')));
  }
  const rect = button.getBoundingClientRect();
  menu.showAtPosition({ x: event.clientX || rect.left, y: event.clientY || rect.bottom });
}
module.exports = { TemplatePicker, parseTemplate, createItem, showNewItemMenu };

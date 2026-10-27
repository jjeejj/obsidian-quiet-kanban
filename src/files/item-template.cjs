'use strict';
const { FuzzySuggestModal, Menu, Notice, getFrontMatterInfo, parseYaml } = require('obsidian');

class TemplatePicker extends FuzzySuggestModal {
  constructor(app, translate, onSelect) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder(translate('选择模板笔记'));
  }
  getItems() { return this.app.vault.getMarkdownFiles(); }
  getItemText(file) { return file.path; }
  async onChooseItem(file) {
    try { await this.onSelect(file); }
    catch (error) { new Notice(error.message || String(error)); }
  }
}

function parseTemplate(content) {
  const info = getFrontMatterInfo(content);
  const frontmatter = info.exists ? parseYaml(info.frontmatter) : {};
  if (frontmatter != null && (typeof frontmatter !== 'object' || Array.isArray(frontmatter))) {
    throw Error('Template frontmatter must be a YAML object');
  }
  return { frontmatter: frontmatter || {}, body: content.slice(info.contentStart) };
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
  await view.createFileForView('', (frontmatter, file) => {
    // Bases-derived filter properties take priority over template defaults.
    for (const [key, value] of Object.entries(template?.frontmatter || {})) {
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
}

function showNewItemMenu(view, button, status, event) {
  const templateFile = view.options().templateFile;
  const menu = new Menu();
  menu.addItem(item => item.setTitle(view.plugin.t(templateFile ? '使用关联模板新建文档' : '新建文档'))
    .setIcon('plus').onClick(() => createItem(view, status).catch(error => view.fail(error))));
  menu.addSeparator();
  menu.addItem(item => item.setTitle(view.plugin.t('关联模板…')).setIcon('file-input')
    .onClick(() => new TemplatePicker(view.app, text => view.plugin.t(text), file => view.config.set('templateFile', file.path)).open()));
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

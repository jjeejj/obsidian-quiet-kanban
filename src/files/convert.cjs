'use strict';
const { Notice, parseYaml, stringifyYaml } = require('obsidian');
const { propertyId } = require('../settings/defaults.cjs');
const { viewLayout, isGroupValue } = require('../board/fields.cjs');
const { TYPE } = require('../board/options.cjs');
async function convertBase(plugin, file) {
  const original = await plugin.app.vault.read(file);
  const doc = parseYaml(original);
  if (!Array.isArray(doc?.views)) throw Error(plugin.t('这个文件没有有效的 Bases 视图'));
  const active = plugin.app.workspace.getMostRecentLeaf();
  const name = active?.view?.getState().viewName;
  const view = doc.views.find(v => v.name === name && v.type === 'kanban') || doc.views.find(v => v.type === 'kanban');
  if (!view) throw Error(plugin.t('没有可转换的原生看板视图；可在视图菜单中添加「增强看板」'));
  const order = Array.isArray(view.groupOrder) ? view.groupOrder.flat().filter(isGroupValue) : [];
  const status = propertyId(view.groupBy?.property, plugin.settings.groupProperty);
  view.type = TYPE;
  Object.assign(view, viewLayout({ ...plugin.settings, groupProperty: status || plugin.settings.groupProperty, groupOrder: order, groupOrderProperty: status || plugin.settings.groupProperty, fieldsSource: Array.isArray(view.order) ? 'bases' : 'custom' }));
  // Preserve original filters, sorting, other views and property configuration.
  const backupDir = `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}/backups`;
  if (!await plugin.app.vault.adapter.exists(backupDir)) await plugin.app.vault.adapter.mkdir(backupDir);
  const backupPath = `${backupDir}/${Date.now()}-${file.name}.json`;
  await plugin.app.vault.adapter.write(backupPath, JSON.stringify({ path: file.path, content: original }, null, 2));
  await plugin.app.vault.process(file, current => {
    if (current !== original) throw Error(plugin.t('看板已被其他操作修改，请重试转换'));
    return stringifyYaml(doc);
  });
  new Notice(plugin.t('已转换为增强看板，原始配置已保存到插件 backups 目录'));
  return backupPath;
}
module.exports = { convertBase };

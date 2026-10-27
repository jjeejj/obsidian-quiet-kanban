'use strict';
const TYPE = 'quiet-kanban';
function getViewOptions(plugin) {
  return [
    { type: 'property', key: 'groupProperty', displayName: plugin.t('分组字段'), default: plugin.settings.groupProperty },
    { type: 'property', key: 'titleProperty', displayName: plugin.t('标题字段'), default: plugin.settings.titleProperty },
    { type: 'dropdown', key: 'fieldsSource', displayName: plugin.t('展示字段来源'), default: plugin.settings.fieldsSource,
      options: { custom: plugin.t('自定义字段列表'), bases: plugin.t('跟随 Bases 属性菜单') } },
    { type: 'file', key: 'templateFile', displayName: plugin.t('新建需求模板'), default: plugin.settings.templateFile, filter: file => file.extension === 'md' },
    { type: 'slider', key: 'columnWidth', displayName: plugin.t('列宽'), min: 220, max: 520, step: 10, default: plugin.settings.columnWidth },
    { type: 'toggle', key: 'hideEmpty', displayName: plugin.t('隐藏空状态列'), default: plugin.settings.hideEmpty },
    { type: 'dropdown', key: 'openMode', displayName: plugin.t('详情打开方式'), options: { split: plugin.t('右侧分栏'), tab: plugin.t('新标签页') }, default: plugin.settings.openMode },
    { type: 'toggle', key: 'togglePreview', displayName: plugin.t('再次点击同一需求时收起'), default: plugin.settings.togglePreview },
    { type: 'slider', key: 'cardTint', displayName: plugin.t('卡片背景浓度'), min: 0, max: 35, step: 1, default: plugin.settings.cardTint }
  ];
}
module.exports = { TYPE, getViewOptions };

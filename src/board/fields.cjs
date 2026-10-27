'use strict';
const FIELD_STYLES = ['auto', 'text', 'tags', 'date', 'number', 'checkbox'];
function propertyId(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  return text && !/^(note|file|formula)\./.test(text) ? `note.${text}` : text;
}
function normalizeFields(fields) {
  const seen = new Set();
  return (Array.isArray(fields) ? fields : []).flatMap(field => {
    if (typeof field === 'string') field = { property: field };
    if (!field || typeof field !== 'object') return [];
    const property = propertyId(field.property);
    if (!property || seen.has(property)) return [];
    seen.add(property);
    return [{ property, label: typeof field.label === 'string' ? field.label : '',
      display: FIELD_STYLES.includes(field.display) ? field.display : 'auto',
      hideEmpty: field.hideEmpty !== false, emptyText: typeof field.emptyText === 'string' ? field.emptyText : '',
      showLabel: field.showLabel !== false }];
  });
}
function legacyFields(options) {
  return normalizeFields([
    ...(options.dateProperty ? [{ property: options.dateProperty, label: '开始', display: 'date', hideEmpty: false, emptyText: '未设置' }] : []),
    ...(options.projectProperty ? [{ property: options.projectProperty, display: 'tags', showLabel: false, hideEmpty: false, emptyText: '未设置项目' }] : [])
  ]);
}
function layoutFrom(input = {}) {
  const groupProperty = propertyId(Object.hasOwn(input, 'groupProperty') ? input.groupProperty : input.statusProperty);
  const order = input.groupOrderProperty !== undefined && propertyId(input.groupOrderProperty) !== groupProperty ? [] :
    Array.isArray(input.groupOrder) ? input.groupOrder.filter(isGroupValue) : Array.isArray(input.statusOrder) ? input.statusOrder.flat().filter(isGroupValue) : [];
  return {
    groupProperty,
    titleProperty: propertyId(input.titleProperty, 'file.name') || 'file.name',
    fields: Object.hasOwn(input, 'fields') ? normalizeFields(input.fields) : legacyFields(input),
    fieldsSource: input.fieldsSource === 'bases' ? 'bases' : 'custom',
    groupOrder: order, groupOrderProperty: groupProperty
  };
}
function viewLayout(input) {
  // groupOrder is a native Bases key, parsed outside the custom view data.
  const { groupOrder, ...layout } = layoutFrom(input);
  return { ...layout, columnOrder: groupOrder };
}

function isGroupValue(value) {
  return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}
function groupKey(value) {
  return value == null || value === '' ? '' : JSON.stringify([typeof value, value]);
}
function groupValue(key) { return key === '' ? null : JSON.parse(key)[1]; }
function nextGroupValue(previous, from, to) {
  if (Array.isArray(previous)) return previous.filter(value => !Object.is(value, from) && !Object.is(value, to)).concat(to == null ? [] : [to]);
  return to == null ? null : to;
}
function presetLabels(t) {
  return { blank: t('空白看板'), task: t('任务管理'), project: t('项目管理'), content: t('内容计划') };
}
function makePreset(id, t = text => text) {
  const prop = label => `note.${t(label)}`;
  const field = (label, display) => ({ property: prop(label), display });
  const presets = {
    blank: { groupProperty: '', fields: [], groupOrder: [] },
    task: { groupProperty: prop('状态'), fields: [field('负责人', 'tags'), field('截止日期', 'date'), field('优先级', 'text')], groupOrder: ['待办', '进行中', '已完成'].map(t) },
    project: { groupProperty: prop('负责人'), fields: [field('状态', 'tags'), field('截止日期', 'date'), field('预算', 'number')], groupOrder: [] },
    content: { groupProperty: prop('发布平台'), fields: [field('发布时间', 'date'), field('标签', 'tags'), field('已发布', 'checkbox')], groupOrder: [] }
  };
  return layoutFrom({ ...(presets[id] || presets.blank), titleProperty: 'file.name', fieldsSource: 'custom' });
}
function resolveViewSettings(settings, config, normalize) {
  const overrides = {};
  for (const key of ['statusProperty', 'dateProperty', 'projectProperty', 'titleProperty', 'groupProperty']) {
    if (config.get(key) !== undefined) overrides[key] = config.getAsPropertyId?.(key) ?? propertyId(config.get(key));
  }
  for (const key of ['columnWidth', 'hideEmpty', 'openMode', 'togglePreview', 'cardTint', 'templateFile', 'fields', 'fieldsSource', 'groupOrder', 'groupOrderProperty', 'statusOrder']) {
    if (config.get(key) !== undefined) overrides[key] = config.get(key);
  }
  // An old per-view property selection must override migrated global defaults.
  if (!Object.hasOwn(overrides, 'groupProperty') && Object.hasOwn(overrides, 'statusProperty')) overrides.groupProperty = overrides.statusProperty;
  if (!Object.hasOwn(overrides, 'fields') && (Object.hasOwn(overrides, 'dateProperty') || Object.hasOwn(overrides, 'projectProperty'))) {
    overrides.fields = legacyFields({ ...settings, ...overrides });
  }
  const savedOrder = config.get('columnOrder');
  if (savedOrder !== undefined) overrides.groupOrder = savedOrder;
  else if (!Object.hasOwn(overrides, 'groupOrder') && Object.hasOwn(overrides, 'statusOrder')) {
    const oldProperty = propertyId(overrides.statusProperty ?? settings.statusProperty);
    const currentProperty = overrides.groupProperty ?? settings.groupProperty;
    if (oldProperty === currentProperty) {
      overrides.groupOrder = overrides.statusOrder;
      overrides.groupOrderProperty = currentProperty;
    }
  }
  if (Object.hasOwn(overrides, 'groupOrder') && !Object.hasOwn(overrides, 'groupOrderProperty')) {
    overrides.groupOrderProperty = overrides.groupProperty ?? settings.groupProperty;
  }
  const result = normalize({ ...settings, ...overrides });
  if (result.fieldsSource === 'bases') result.fields = normalizeFields((config.getOrder?.() || []).filter(property => property !== result.titleProperty));
  return result;
}
module.exports = { FIELD_STYLES, isGroupValue, propertyId, normalizeFields, legacyFields, layoutFrom, viewLayout, groupKey, groupValue, nextGroupValue, makePreset, presetLabels, resolveViewSettings };

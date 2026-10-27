'use strict';
const { ListValue, NullValue, NumberValue, BooleanValue, DateValue } = require('obsidian');
function is(value, Type) { return typeof Type === 'function' && value instanceof Type; }
function typedValues(value) {
  if (value == null || is(value, NullValue)) return [];
  if (Array.isArray(value)) return value.flatMap(typedValues);
  if (is(value, ListValue)) return Array.from({ length: value.length() }, (_, i) => typedValues(value.get(i))).flat();
  if (typeof value === 'boolean' || typeof value === 'number') return [value];
  const text = value.toString();
  if (is(value, BooleanValue)) return [text === 'true'];
  if (is(value, NumberValue)) return Number.isFinite(Number(text)) ? [Number(text)] : [];
  return text ? [text] : [];
}
function values(value) { return typedValues(value).map(String); }
function valueKind(value, display = 'auto') {
  if (Array.isArray(value) || is(value, ListValue)) return 'list';
  if (typeof value === 'boolean' || is(value, BooleanValue)) return 'boolean';
  if (typeof value === 'number' || is(value, NumberValue)) return 'number';
  if (is(value, DateValue)) return 'date';
  if (display === 'date') return 'date';
  if (display === 'number') return 'number';
  if (display === 'checkbox') return 'boolean';
  if (!typedValues(value).length && display === 'tags') return 'list';
  return 'text';
}
function resolvedFields(entry, options, config) {
  return options.fields.filter(field => field.property !== options.titleProperty).map(field => ({ ...field,
    label: field.label || config?.getDisplayName?.(field.property) || field.property.replace(/^(note|file|formula)\./, ''),
    kind: valueKind(entry.getValue(field.property), field.display) }));
}
function renderField(parent, entry, field, t) {
  const value = entry.getValue(field.property);
  const items = typedValues(value);
  if (!items.length && field.hideEmpty) return;
  const style = field.display === 'auto' ? ({ list: 'tags', boolean: 'checkbox', date: 'date', number: 'number' }[field.kind] || 'text') : field.display;
  const doc = parent.ownerDocument;
  const row = doc.createElement('div'); row.className = 'qk-field';
  if (field.showLabel) { const label = doc.createElement('span'); label.className = 'qk-field-label'; label.textContent = t(field.label); row.appendChild(label); }
  const content = doc.createElement('span'); content.className = `qk-field-value qk-field-${style}`;
  if (!items.length) { content.textContent = field.emptyText ? t(field.emptyText) : t('未设置'); content.classList.add('qk-unset'); }
  else if (style === 'tags') {
    for (const value of items) { const tag = doc.createElement('span'); tag.className = 'qk-tag'; tag.textContent = String(value); content.appendChild(tag); }
  } else if (style === 'checkbox' && typeof items[0] === 'boolean') content.textContent = items[0] ? '☑' : '☐';
  else content.textContent = items.map(String).join(t('、'));
  row.appendChild(content); parent.appendChild(row);
}
module.exports = { typedValues, values, valueKind, resolvedFields, renderField };

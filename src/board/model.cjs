'use strict';
const PALETTE = ['blue', 'purple', 'cyan', 'green', 'orange', 'pink', 'yellow', 'red'];
function stableColor(status, colors) {
  if (Object.hasOwn(colors || {}, status) && PALETTE.includes(colors[status])) return colors[status];
  let hash = 0;
  for (const char of status) hash = (Math.imul(hash, 31) + char.codePointAt(0)) | 0;
  return PALETTE[(hash >>> 0) % PALETTE.length];
}
function normalizeOrder(order) {
  if (!Array.isArray(order)) return [];
  return [...new Set(order.flatMap(v => Array.isArray(v) ? v : [v]).filter(v => typeof v === 'string'))];
}
function buildGroups(rows, order = [], hideEmpty = true) {
  const groups = new Map(normalizeOrder(order).map(key => [key, { key, rows: [] }]));
  for (const row of rows) {
    const keys = [...new Set(row.statuses?.filter(Boolean) || [])];
    if (!keys.length) keys.push('');
    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, { key, rows: [] });
      groups.get(key).rows.push(row);
    }
  }
  return [...groups.values()].filter(group => !hideEmpty || group.rows.length > 0);
}
function nextStatus(previous, from, to) {
  if (Array.isArray(previous)) {
    const values = previous.filter(v => v !== from && v !== to);
    return to ? [...values, to] : values;
  }
  return to || null;
}
module.exports = { PALETTE, stableColor, normalizeOrder, buildGroups, nextStatus };

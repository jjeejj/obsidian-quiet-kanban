'use strict';
// Chinese source strings are also the fallback for untranslated messages.
const EN = require('./en.cjs');
function normalizeLanguage(language) {
  return language === 'zh' || language === 'en' ? language : 'auto';
}
function resolveLanguage(language, appLanguage) {
  const selected = normalizeLanguage(language);
  if (selected !== 'auto') return selected;
  return /^zh(?:[-_]|$)/i.test(appLanguage || '') ? 'zh' : 'en';
}
function translate(language, appLanguage, text, params = {}) {
  const message = resolveLanguage(language, appLanguage) === 'en' && Object.hasOwn(EN, text) ? EN[text] : text;
  return message.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
}
module.exports = { EN, normalizeLanguage, resolveLanguage, translate };

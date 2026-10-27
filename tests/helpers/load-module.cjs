'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

// Both source and the release bundle run against the same Obsidian test double.
// A fresh cache per load models a plugin reload without leaking module state.
function loadModule(entry, obsidian) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const factory = vm.runInThisContext(
      `(function(module, exports, require) {\n${fs.readFileSync(filename, 'utf8')}\n})`, { filename }
    );
    factory(module, module.exports, request => {
      if (request === 'obsidian') return obsidian;
      if (filename === path.join(root, 'main.js')) throw Error(`Unbundled runtime dependency: ${request}`);
      if (!request.startsWith('.')) throw Error(`Unexpected dependency: ${request}`);
      return load(path.resolve(path.dirname(filename), request));
    });
    return module.exports;
  }
  return load(path.resolve(root, entry));
}
module.exports = { loadModule };

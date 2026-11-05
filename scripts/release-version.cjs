'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const FILES = ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'];

function versionParts(version) {
  if (typeof version !== 'string' || version.trim() !== version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw Error(`Invalid release version: ${JSON.stringify(version)}; use x.y.z without a v prefix`);
  }
  return version.split('.').map(part => BigInt(part));
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

function readObject(filename) {
  const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`Expected a JSON object: ${filename}`);
  return value;
}

function syncVersion(directory, version, { releasedManifest } = {}) {
  versionParts(version);
  const current = Object.fromEntries(FILES.map(name => [name, readObject(path.join(directory, name))]));
  const manifest = current['manifest.json'];
  const lock = current['package-lock.json'];
  versionParts(manifest.minAppVersion);
  if (!lock.packages || !lock.packages[''] || typeof lock.packages[''] !== 'object' || Array.isArray(lock.packages[''])) {
    throw Error('package-lock.json must contain the root package at packages[""]');
  }
  if (releasedManifest) {
    if (releasedManifest.version !== version) throw Error('Released manifest does not match the tag');
    versionParts(releasedManifest.minAppVersion);
    // A late/backport tag must not lower the version advertised to Obsidian.
    if (compareVersions(manifest.version, version) > 0) return { files: [], skipped: true };
    if (manifest.minAppVersion !== releasedManifest.minAppVersion) {
      throw Error('Default branch minAppVersion differs from the published release; reconcile it before retrying this job');
    }
  }
  const next = {
    'manifest.json': { ...manifest, version },
    'package.json': { ...current['package.json'], version },
    'package-lock.json': { ...lock, version, packages: { ...lock.packages, '': { ...lock.packages[''], version } } },
    'versions.json': { ...current['versions.json'], [version]: manifest.minAppVersion }
  };
  // Validate every input before writing; leave already-correct files byte-identical.
  const files = FILES.filter(name => JSON.stringify(current[name]) !== JSON.stringify(next[name]));
  for (const name of files) fs.writeFileSync(path.join(directory, name), JSON.stringify(next[name], null, 2) + '\n');
  return { files, skipped: false };
}

function main(argv) {
  const [version, flag, directory] = argv;
  if (argv.length !== 1 && !(argv.length === 3 && flag === '--sync-default')) {
    throw Error('Usage: node scripts/release-version.cjs <x.y.z> [--sync-default <checkout-directory>]');
  }
  const options = directory ? { releasedManifest: readObject(path.join(root, 'manifest.json')) } : {};
  const result = syncVersion(directory ? path.resolve(directory) : root, version, options);
  console.log(result.skipped ? `Kept the newer default-branch version; tag ${version} was already published`
    : result.files.length ? `Set version ${version}: ${result.files.join(', ')}` : `Version ${version} is already synchronized`);
  return result;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { syncVersion, compareVersions, main };

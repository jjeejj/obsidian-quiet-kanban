const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { syncVersion, compareVersions } = require('../scripts/release-version.cjs');

function fixture(t, version = '0.1.3') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qk-release test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const data = {
    'manifest.json': { id: 'quiet-kanban', version, minAppVersion: '1.10.2', description: 'Keep current description' },
    'package.json': { name: 'quiet-kanban', version, scripts: { test: 'node --test' } },
    'package-lock.json': { version, lockfileVersion: 3, packages: { '': { name: 'quiet-kanban', version, license: 'MIT' }, 'node_modules/example': { version: '2.0.0' } } },
    'versions.json': { '0.1.0': '1.10.2', [version]: '1.10.2' }
  };
  for (const [name, value] of Object.entries(data)) fs.writeFileSync(path.join(directory, name), JSON.stringify(value) + '\n');
  const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
  const snapshot = () => Object.fromEntries(Object.keys(data).map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
  return { directory, read, snapshot };
}

test('a new tag updates all four files while preserving compatibility history and other metadata', t => {
  const f = fixture(t);
  const result = syncVersion(f.directory, '0.1.4');
  assert.equal(result.files.length, 4);
  for (const name of ['manifest.json', 'package.json', 'package-lock.json']) assert.equal(f.read(name).version, '0.1.4');
  const lock = f.read('package-lock.json');
  assert.equal(lock.packages[''].version, '0.1.4');
  assert.equal(lock.packages[''].license, 'MIT');
  assert.equal(lock.packages['node_modules/example'].version, '2.0.0');
  assert.equal(f.read('manifest.json').minAppVersion, '1.10.2');
  assert.equal(f.read('manifest.json').description, 'Keep current description');
  assert.deepEqual(f.read('versions.json'), { '0.1.0': '1.10.2', '0.1.3': '1.10.2', '0.1.4': '1.10.2' });
  assert.deepEqual(f.read('package.json').scripts, { test: 'node --test' });
  const saved = f.snapshot();
  assert.deepEqual(syncVersion(f.directory, '0.1.4').files, []);
  assert.deepEqual(f.snapshot(), saved);
});

test('invalid tags fail before changing any version file', t => {
  const f = fixture(t);
  const before = f.snapshot();
  for (const version of ['v0.1.4', '0.1', '0.1.4-beta.1', '01.2.3', '0.1.4\n', '', '1.2.3; echo unexpected']) {
    assert.throws(() => syncVersion(f.directory, version), /Invalid release version/);
    assert.deepEqual(f.snapshot(), before);
  }
});

test('malformed metadata fails before writing any other file', t => {
  for (const [name, text] of [['versions.json', '[]'], ['versions.json', 'invalid JSON'], ['package-lock.json', '{}']]) {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.directory, name), text);
    const before = f.snapshot();
    assert.throws(() => syncVersion(f.directory, '0.1.4'));
    assert.deepEqual(f.snapshot(), before);
  }
});

test('default-branch sync preserves newer source metadata and is safe to rerun', t => {
  const f = fixture(t);
  const releasedManifest = { version: '0.1.4', minAppVersion: '1.10.2', description: 'Older tagged description' };
  assert.equal(syncVersion(f.directory, '0.1.4', { releasedManifest }).files.length, 4);
  assert.equal(f.read('manifest.json').description, 'Keep current description');
  assert.equal(f.read('manifest.json').version, '0.1.4');
  const saved = f.snapshot();
  assert.deepEqual(syncVersion(f.directory, '0.1.4', { releasedManifest }).files, []);
  assert.deepEqual(f.snapshot(), saved);
});

test('an older tag cannot downgrade the default branch, with numeric version ordering', t => {
  const f = fixture(t, '0.1.10');
  const before = f.snapshot();
  const result = syncVersion(f.directory, '0.1.9', { releasedManifest: { version: '0.1.9', minAppVersion: '1.10.2' } });
  assert.equal(result.skipped, true);
  assert.deepEqual(f.snapshot(), before);
  assert.equal(compareVersions('0.1.10', '0.1.9'), 1);
  assert.equal(compareVersions('1.0.0', '0.99.99'), 1);
  assert.equal(compareVersions('0.1.3', '0.1.3'), 0);
});

test('default-branch sync rejects mismatched release or app requirements without writing', t => {
  const f = fixture(t);
  const before = f.snapshot();
  assert.throws(() => syncVersion(f.directory, '0.1.4', { releasedManifest: { version: '0.1.5', minAppVersion: '1.10.2' } }), /does not match the tag/);
  assert.throws(() => syncVersion(f.directory, '0.1.4', { releasedManifest: { version: '0.1.4', minAppVersion: '1.11.0' } }), /minAppVersion differs/);
  assert.deepEqual(f.snapshot(), before);
});

test('the CLI prepares a tagged checkout then synchronizes a separate default checkout', t => {
  const source = fixture(t);
  const target = fixture(t);
  const scripts = path.join(source.directory, 'scripts');
  fs.mkdirSync(scripts);
  const script = path.join(scripts, 'release-version.cjs');
  fs.copyFileSync(path.join(__dirname, '../scripts/release-version.cjs'), script);
  execFileSync(process.execPath, [script, '0.1.4']);
  execFileSync(process.execPath, [script, '0.1.4', '--sync-default', target.directory]);
  assert.equal(source.read('manifest.json').version, '0.1.4');
  assert.equal(target.read('manifest.json').version, '0.1.4');
  assert.equal(target.read('package-lock.json').packages[''].version, '0.1.4');
  assert.equal(target.read('versions.json')['0.1.4'], '1.10.2');
});

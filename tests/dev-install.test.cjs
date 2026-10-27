const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { parseArgs, install, rebuildStaleBoards, refreshBoards } = require('../scripts/dev-install.cjs');
const root = path.resolve(__dirname, '..');
const manifest = require('../manifest.json');

function fixture(t) {
  const vault = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'qk-install test-')));
  const config = path.join(vault, '.obsidian');
  fs.mkdirSync(config);
  t.after(() => fs.rmSync(vault, { recursive: true, force: true }));
  return { vault, destination: path.join(config, 'plugins', manifest.id) };
}
const quiet = { runChecks() {}, log() {} };

test('installer requires an explicit vault and rejects malformed options', () => {
  assert.throws(() => parseArgs([]), /--vault is required/);
  assert.throws(() => parseArgs(['--vault']), /Missing value/);
  assert.throws(() => parseArgs(['--unknown']), /Unknown option/);
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['--vault', '/tmp/vault with spaces', '--copy-only']).copyOnly, true);
});

test('copy-only backs up release files and preserves data, backups and unrelated files', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.destination, 'backups'), { recursive: true });
  fs.writeFileSync(path.join(f.destination, 'data.json'), '{"settings":{"language":"en"}}');
  fs.writeFileSync(path.join(f.destination, 'backups', 'original.json'), 'board backup');
  fs.writeFileSync(path.join(f.destination, 'main.js'), 'previous plugin');
  const result = install({ vault: f.vault, copyOnly: true }, {
    ...quiet, runCommand() { throw Error('Should not call Obsidian'); }
  });
  for (const name of ['main.js', 'manifest.json', 'styles.css']) {
    assert.deepEqual(fs.readFileSync(path.join(f.destination, name)), fs.readFileSync(path.join(root, name)));
  }
  assert.equal(fs.readFileSync(path.join(result.backup, 'main.js'), 'utf8'), 'previous plugin');
  assert.equal(fs.readFileSync(path.join(f.destination, 'data.json'), 'utf8'), '{"settings":{"language":"en"}}');
  assert.equal(fs.readFileSync(path.join(f.destination, 'backups', 'original.json'), 'utf8'), 'board backup');
});

test('dry run and failed checks never write to the installation', t => {
  const f = fixture(t);
  const fail = () => { throw Error('check failed'); };
  install({ vault: f.vault, dryRun: true }, { ...quiet, runChecks: fail, runCommand: fail });
  assert.equal(fs.existsSync(f.destination), false);
  assert.throws(() => install({ vault: f.vault }, { ...quiet, runChecks: fail }), /check failed/);
  assert.equal(fs.existsSync(f.destination), false);
});

test('normal mode verifies the vault before copying and reloads/enables before smoke testing', t => {
  for (const previouslyLoaded of [false, true]) {
    const f = fixture(t);
    const commands = [];
    let evalCount = 0;
    install({ vault: f.vault }, { ...quiet, runCommand(_executable, args) {
      commands.push(args[1]);
      assert.equal(args[0], `vault=${path.basename(f.vault)}`);
      if (args[1] === 'vault') return `CLI startup log\n${f.vault}\n`;
      if (args[1] === 'eval' && (args[2].includes('QK_BOARDS_REFRESHED') || args[2].includes('__qkDevRefresh'))) return '=> '+JSON.stringify({ marker: 'QK_BOARDS_REFRESHED', done: true, count: 0 });
      if (args[1] === 'eval') {
        const loaded = evalCount++ ? true : previouslyLoaded;
        return '=> ' + JSON.stringify({ marker: 'QK_DEV_INSTALL', configDir: '.obsidian', loaded, version: manifest.version, commands: loaded });
      }
      return 'success';
    } });
    assert.deepEqual(commands, ['vault', 'eval', previouslyLoaded ? 'plugin:reload' : 'plugin:enable', 'eval', 'eval', 'eval']);
    assert.equal(fs.existsSync(path.join(f.destination, 'main.js')), true);
  }
  const f = fixture(t);
  assert.throws(() => install({ vault: f.vault }, { ...quiet, runCommand: () => '/another/vault' }), /different vault/);
  assert.equal(fs.existsSync(f.destination), false);
});

test('runtime mismatch returns failure with recovery backup location', t => {
  const f = fixture(t);
  fs.mkdirSync(f.destination, { recursive: true });
  fs.writeFileSync(path.join(f.destination, 'main.js'), 'old');
  assert.throws(() => install({ vault: f.vault }, { ...quiet, runCommand(_executable, args) {
    if (args[1] === 'vault') return f.vault;
    if (args[1] === 'eval') return '=> ' + JSON.stringify({ marker: 'QK_DEV_INSTALL', configDir: '.obsidian', loaded: true, version: 'wrong', commands: true });
    return 'success';
  } }), /Plugin smoke test failed:[\s\S]+Previous release:/);
});


test('reload recreates stale board tabs and preserves live boards, unrelated tabs, state and focus', async () => {
  const liveRoot = {};
  const calls = [];
  function leaf(id, roots) {
    const state = { type: 'bases', state: { file: id + '.base', viewName: 'Board' }, pinned: true };
    return { id, view: { containerEl: { querySelectorAll: () => roots } },
      getViewState: () => state, setViewState: async value => calls.push([id, value]) };
  }
  const stale = leaf('stale', [{}]);
  const live = leaf('live', [liveRoot]);
  const other = leaf('other', []);
  let focused;
  const app = { plugins: { plugins: { 'quiet-kanban': { views: new Set([{ root: liveRoot }]) } } },
    workspace: { activeLeaf: other, iterateAllLeaves: fn => [stale, live, other].forEach(fn),
      setActiveLeaf: value => { focused = value; } } };
  assert.equal(await rebuildStaleBoards(app, 'quiet-kanban'), 1);
  assert.deepEqual(calls, [['stale', { type: 'empty', state: {} }], ['stale', stale.getViewState()]]);
  assert.equal(focused, other);
});


test('reload polling tolerates a transient empty CLI eval response', () => {
  let calls = 0;
  const count = refreshBoards(() => {
    calls++;
    if (calls <= 2) return '';
    return '=> ' + JSON.stringify({ marker: 'QK_BOARDS_REFRESHED', done: true, count: 2 });
  }, 'quiet-kanban');
  assert.equal(count, 2);
  assert.equal(calls, 3);
});

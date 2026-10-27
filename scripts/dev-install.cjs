'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const FILES = ['main.js', 'manifest.json', 'styles.css'];
const HELP = `Install the local build into an Obsidian vault and run a plugin smoke test.

Usage: npm run dev:install -- --vault "/absolute/path/to/vault" [options]

  --vault <path>       Required: existing Obsidian vault directory
  --vault-name <name>  CLI vault selector (defaults to the directory name)
  --config-dir <path>  Vault-relative config directory (default: .obsidian)
  --cli <path>         Obsidian CLI executable (default: obsidian)
  --dry-run            Show the plan without building, writing or calling Obsidian
  --copy-only          Check, back up and copy; do not call Obsidian
  --help              Show this help

Normal mode requires the target vault to be open and Obsidian CLI enabled.
Only main.js, manifest.json and styles.css are replaced. Settings and backups
are preserved. Existing release files are backed up before replacement.
The smoke test checks the loaded version and commands, not visual layout.
`;

function parseArgs(argv) {
  const options = { configDir: '.obsidian', cli: 'obsidian' };
  const names = { '--vault': 'vault', '--vault-name': 'vaultName', '--config-dir': 'configDir', '--cli': 'cli' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--copy-only') options.copyOnly = true;
    else if (Object.hasOwn(names, arg)) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw Error(`Missing value for ${arg}`);
      options[names[arg]] = value;
    } else throw Error(`Unknown option: ${arg}`);
  }
  if (!options.help && !options.vault) throw Error('--vault is required; use --help for examples');
  return options;
}

function runCommand(executable, args) {
  try {
    return execFileSync(executable, args, { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    throw Error(`Command failed: ${executable} ${args[0]}\n${error.stderr || error.stdout || error.message}`);
  }
}

function runChecks() {
  const npm = process.env.npm_execpath;
  execFileSync(npm ? process.execPath : 'npm', npm ? [npm, 'run', 'check'] : ['run', 'check'], {
    cwd: root, stdio: 'inherit', timeout: 120000
  });
}

function readRuntime(cli, id) {
  const code = `(() => {
    const plugin = app.plugins.plugins[${JSON.stringify(id)}];
    return JSON.stringify({ marker: 'QK_DEV_INSTALL', loaded: !!plugin, configDir: app.vault.configDir,
      version: plugin?.manifest.version,
      commands: ['create-board', 'convert-board', 'close-detail'].every(
        name => !!app.commands.commands[${JSON.stringify(id + ':')} + name]) });
  })()`;
  const output = cli('eval', `code=${code}`);
  const line = output.split(/\r?\n/).find(text => text.includes('"marker":"QK_DEV_INSTALL"'));
  if (!line) throw Error(`Could not read plugin runtime state:\n${output}`);
  return JSON.parse(line.slice(line.indexOf('{')));
}

// Bases may retain a rendered view from the disposed plugin after a reload.
// Recreate only stale Quiet Kanban tabs, preserving each leaf and its view state.
async function rebuildStaleBoards(app, id) {
  const plugin = app.plugins.plugins[id];
  if (!plugin) throw Error('Plugin is not loaded');
  const liveRoots = new Set([...plugin.views].map(view => view.root));
  const stale = [];
  app.workspace.iterateAllLeaves(leaf => {
    const roots = [...(leaf.view.containerEl?.querySelectorAll('.qk-board') || [])];
    if (roots.some(root => !liveRoots.has(root))) stale.push(leaf);
  });
  const active = app.workspace.activeLeaf;
  try {
    for (const leaf of stale) {
      const state = leaf.getViewState();
      await leaf.setViewState({ type: 'empty', state: {} });
      await leaf.setViewState(state);
    }
  } finally {
    if (active) app.workspace.setActiveLeaf(active, { focus: true });
  }
  return stale.length;
}

function refreshBoards(cli, id) {
  // This CLI evaluates synchronously, so record async completion and poll it.
  const plugin = `app.plugins.plugins[${JSON.stringify(id)}]`;
  const code = `(() => {
    const job = ${plugin}.__qkDevRefresh = { marker: 'QK_BOARDS_REFRESHED', done: false };
    (${rebuildStaleBoards.toString()})(app, ${JSON.stringify(id)}).then(
      count => Object.assign(job, { count, done: true }),
      error => Object.assign(job, { error: String(error), done: true }));
    return 'Board refresh started';
  })()`;
  cli('eval', `code=${code}`);
  for (let attempt = 0; attempt < 50; attempt++) {
    const output = cli('eval', `code=JSON.stringify(${plugin}.__qkDevRefresh)`);
    const line = output.split(/\r?\n/).find(text => text.includes('"marker":"QK_BOARDS_REFRESHED"'));
    if (!line) {
      // Older CLI installers can briefly return no eval result during reload.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      continue;
    }
    const job = JSON.parse(line.slice(line.indexOf('{')));
    if (job.error) throw Error(`Board refresh failed: ${job.error}`);
    if (job.done) return job.count;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw Error('Timed out rebuilding stale board views');
}

function install(options, dependencies = {}) {
  const run = dependencies.runCommand || runCommand;
  const check = dependencies.runChecks || runChecks;
  const log = dependencies.log || console.log;
  const vault = fs.realpathSync(path.resolve(options.vault));
  const configDir = path.resolve(vault, options.configDir || '.obsidian');
  if (!configDir.startsWith(vault + path.sep) || !fs.statSync(configDir).isDirectory()) {
    throw Error('The config directory must be an existing directory inside the target vault');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (!/^[a-z0-9-]+$/.test(manifest.id)) throw Error('Invalid plugin ID in manifest');
  const destination = path.join(configDir, 'plugins', manifest.id);
  const selector = options.vaultName || path.basename(vault);
  const cli = (...args) => run(options.cli || 'obsidian', [`vault=${selector}`, ...args]);
  log(`Target: ${destination}`);
  if (options.dryRun) {
    log(`Plan: npm run check${options.copyOnly ? '' : ' → verify CLI vault'} → back up/copy ${FILES.join(', ')}${options.copyOnly ? '' : ' → reload/enable → version and command smoke test'}`);
    log('Dry run: no files changed and no Obsidian commands executed.');
    return { destination };
  }
  check();
  let before;
  if (!options.copyOnly) {
    const output = cli('vault', 'info=path');
    const reported = output.split(/\r?\n/).map(line => line.trim()).find(line => {
      try { return fs.realpathSync(line) === vault; } catch { return false; }
    });
    if (!reported) throw Error(`CLI selected a different vault. No plugin files copied.\n${output}`);
    before = readRuntime(cli, manifest.id);
    if (path.resolve(vault, before.configDir) !== configDir) {
      throw Error(`Config directory mismatch. Use --config-dir ${before.configDir}. No plugin files copied.`);
    }
  }
  // Read all release files before changing the target installation.
  const contents = new Map(FILES.map(name => [name, fs.readFileSync(path.join(root, name))]));
  const existing = FILES.filter(name => fs.existsSync(path.join(destination, name)));
  let backup;
  if (existing.length) {
    backup = path.join(configDir, 'plugins', `.${manifest.id}-dev-backups`, `${Date.now()}-${randomUUID()}`);
    fs.mkdirSync(backup, { recursive: true });
    for (const name of existing) fs.copyFileSync(path.join(destination, name), path.join(backup, name));
    log(`Previous release backed up: ${backup}`);
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const [name, content] of contents) {
    const target = path.join(destination, name);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, content, { flag: 'wx' });
      fs.renameSync(temporary, target);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }
  log(`Installed ${manifest.name} ${manifest.version}; settings and plugin backups preserved.`);
  if (options.copyOnly) {
    log('Copy-only mode: Obsidian was not reloaded or tested.');
    return { destination, backup };
  }
  try {
    log(cli(before.loaded ? 'plugin:reload' : 'plugin:enable', `id=${manifest.id}`));
    const after = readRuntime(cli, manifest.id);
    if (!after.loaded || after.version !== manifest.version || !after.commands) {
      throw Error(`Plugin smoke test failed: ${JSON.stringify(after)}`);
    }
    log('PASS: plugin loaded, installed version matches, all three commands registered.');
    const refreshed = refreshBoards(cli, manifest.id);
    log(`Rebuilt ${refreshed} stale board view(s); existing tab states preserved.`);
  } catch (error) {
    throw Error(`${error.message}\nFiles were installed.${backup ? ` Previous release: ${backup}` : ''}\nCheck that Bases and community plugins are enabled in the target vault.`);
  }
  return { destination, backup };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log(HELP);
    else install(options);
  } catch (error) {
    console.error(`Install/test failed: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { parseArgs, install, rebuildStaleBoards, refreshBoards };

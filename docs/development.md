**English** | [简体中文](development_zh.md)

# Build, Install Automatically, and Test

This guide is for local development and updates from source. For ordinary manual installation, see [Installation](installation.md).

## Build Locally

Use Node.js 20+ and run these commands from the project directory:

```sh
# Unit tests and integration tests with a mocked Obsidian API
npm test

# Generate the main.js distribution from source
npm run build

# Check the build script, build and syntax-check the output, then run all tests
npm run check
```

The build collects local dependencies starting from `src/main.cjs`. Only `main.js`, `manifest.json`, and `styles.css` are needed for distribution or installation.

## Prepare for Automatic Installation

- Open the target vault in Obsidian.
- Enable the Obsidian CLI and confirm that `obsidian help` works.
- Ensure the vault has a configuration directory, community plugins are allowed, and Bases is enabled.
- Finish configuration dialogs and unsaved quick-edit drafts before running the installer, which reloads the plugin.

## Preview the Plan

```sh
npm run dev:install -- --vault "/absolute/path/to/vault" --dry-run
```

This does not build, write files, or call Obsidian. The vault and configuration directory must still exist.

## Install and Check Loading

```sh
npm run dev:install -- --vault "/absolute/path/to/vault"
```

The script:

1. Runs `npm run check`.
2. Verifies the CLI targets the same vault and configuration directory.
3. Backs up installed distribution files before replacement.
4. Copies the three distribution files, preserving `data.json` and existing plugin backups.
5. Reloads an already loaded plugin or enables one that is not loaded.
6. Checks its version and the registered create, convert, and collapse commands.
7. Refreshes open board tabs while preserving view states and the active tab.

An exit code of zero indicates that checks passed. The terminal output includes the installation and backup paths.

## Options

| Option | Purpose |
| --- | --- |
| `--vault <path>` | Required target vault path |
| `--vault-name <name>` | CLI vault selector; defaults to the directory name |
| `--config-dir <relative-path>` | Configuration directory; defaults to `.obsidian` |
| `--cli <executable>` | Obsidian CLI executable path |
| `--copy-only` | Check, back up, and copy without calling the CLI |
| `--dry-run` | Show the plan only |
| `--help` | Show full usage |

Examples:

```sh
npm run dev:install -- --vault "/absolute/path/to/vault" --copy-only
npm run dev:install -- --vault "/absolute/path/to/vault" --config-dir ".obsidian-dev"
npm run dev:install -- --help
```

## Test the Actual Interface

Automated checks cover logic and loading, not the complete mouse or visual workflow. Use a separate folder with test documents and `.base` files to verify:

1. Scene presets and field addition, removal, and ordering.
2. Custom display fields and the native Bases property source.
3. Template creation, destination column values, and other defaults.
4. Drag operations preserving unrelated properties and data types.
5. Quick-edit save, cancel, validation failures, and read-only fields.
6. Detail reuse, click-to-collapse, and manual-navigation protection.
7. Card behavior after a plugin reload.

If supported by your local CLI, developer commands can help:

```sh
obsidian vault="VaultName" dev:dom selector=".qk-board"
obsidian vault="VaultName" dev:errors
obsidian vault="VaultName" dev:screenshot path="/tmp/quiet-kanban-test.png"
```

These commands assist diagnosis; complete interface testing still requires checking each interaction. After testing, wait for writes to finish, close test tabs, and move the test folder to the trash.

[Back to documentation](README.md)

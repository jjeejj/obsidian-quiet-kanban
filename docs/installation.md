**English** | [简体中文](installation_zh.md)

# Install the Plugin

This guide covers manual installation and activation. For the automatic installer, see [Development and Testing](development.md).

## Requirements

- Obsidian desktop. The plugin currently declares desktop support only.
- The minimum version listed in `manifest.json`, currently `1.10.2`.
- The Obsidian **Bases** core plugin enabled.

## Prepare the Files

Use these three files from the same version:

```text
main.js
manifest.json
styles.css
```

If you obtained the source project, use Node.js 20+ and run this from the project directory:

```sh
npm run check
```

After the checks pass, `main.js` in the project root is the built distribution. No third-party npm dependencies need to be installed.

## Copy into Your Vault

Create this directory and place the three files directly inside it:

```text
<vault>/.obsidian/plugins/quiet-kanban/
  main.js
  manifest.json
  styles.css
```

If your vault uses a custom configuration directory, replace `.obsidian` with that directory. Do not put another `quiet-kanban` folder inside the plugin directory.

## Enable the Plugin

1. Open the target vault.
2. Enable **Bases** under **Settings → Core plugins**.
3. Allow community plugins under **Settings → Community plugins**, then enable **Quiet Kanban**.
4. Open the Command Palette and confirm that **Quiet Kanban: Create enhanced Kanban board** is available.

## What Installation Changes

Installation alone does not convert existing `.base` files or change note properties. Creating and converting boards are separate actions.

Next: [Create a Board](create-board.md) · [Convert an Existing Board](convert-board.md)

[Back to documentation](README.md)

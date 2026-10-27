**English** | [简体中文](publishing_zh.md)

# Publish to the Community Directory

This guide is for maintainers publishing Quiet Kanban. Users can install it from Obsidian's community plugin browser after the directory has reviewed and published it.

## Prepare the Repository

1. Create a public GitHub repository containing the plugin source.
2. Keep `README.md`, `LICENSE`, and `manifest.json` at the repository root.
3. Set the public author name in `manifest.json`; replace the development placeholder `Local` before the first release.
4. Check that `quiet-kanban` is available as a plugin ID in the directory. Submission requires a unique ID.
5. Review the [developer policies](https://docs.obsidian.md/community-directory/developer-policies) and [submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins).

Keep `isDesktopOnly: true` for this desktop release. Set `minAppVersion` to the earliest Obsidian version actually supported and tested, including the Bases APIs used by the plugin.

## Build and Verify

Run from the project directory with Node.js 20+:

```sh
npm run check
```

Complete the interface checks in [Development and Testing](development.md). Check creation, grouping, drag operations, templates, quick edit, previews, and both interface languages in a test vault.

Before each release, update these files together:

| File | Value |
| --- | --- |
| `manifest.json` | Plugin version and minimum supported Obsidian version |
| `package.json` | The same plugin version |
| `versions.json` | An entry mapping the new plugin version to its minimum supported Obsidian version |

Release versions use `x.y.z`. For example, the Git tag for version `0.1.0` must be **`0.1.0`**, without a `v` prefix.

## Publish a GitHub Release

Publish the reviewed source and metadata on the repository's default branch. The directory reads the manifest from that branch.

In GitHub, open **Releases → Draft a new release**, select the intended source revision, and create a tag matching `manifest.json` exactly. Attach these three files from the verified build individually:

- `main.js`
- `manifest.json`
- `styles.css`

Write release notes and publish a regular release. A draft or a source-code archive alone does not provide an installable release. Obsidian downloads the individual assets from the release matching the manifest version.

## Submit the First Release

1. Sign in to [Obsidian Community](https://community.obsidian.md) with an Obsidian account.
2. Link the GitHub account that owns or manages the repository to the community profile.
3. Add the plugin through the directory's submission flow and select its repository.
4. Review the imported manifest and listing information.
5. Follow the automated review guidance and resolve any reported errors. Corrections require an incremented version and a new GitHub release.
6. Complete publication in the directory. The plugin becomes installable in Obsidian after the review errors are resolved and it is published.

Once available, users open **Settings → Community plugins → Browse**, search for **Quiet Kanban**, then install and enable it. Update the [installation guide](installation.md) when the listing is available.

## Publish Updates

Update the version metadata, run the checks, and publish another GitHub release with a matching tag and all three assets. Subsequent versions do not require another initial directory submission. Users can check for updates in Obsidian.

See the official [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) for the current process.

[Back to documentation](README.md)

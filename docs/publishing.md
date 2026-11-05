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
npm ci --ignore-scripts
npm run check
```

Complete the interface checks in [Development and Testing](development.md). Check creation, grouping, drag operations, templates, quick edit, previews, and both interface languages in a test vault.

The release workflow uses the pushed tag as the version. It automatically updates these files in the build checkout:

| File | Value |
| --- | --- |
| `manifest.json` | Plugin version from the tag |
| `package.json` | The same plugin version |
| `package-lock.json` | The top-level and root-package versions |
| `versions.json` | A new entry mapping the tag version to `manifest.minAppVersion` |

You do not need to edit these version numbers before tagging. Continue to set `minAppVersion` yourself when the plugin's minimum supported Obsidian version changes. Release tags use `x.y.z`, without a `v` prefix or prerelease suffix.

## Publish a GitHub Release

The repository includes `.github/workflows/release.yml`. Commit and push your source changes and rebuilt `main.js`, then create and push the next version tag, for example `0.1.4`. The tagged commit must contain this workflow and `scripts/release-version.cjs`; old tags keep their old workflow.

The `release` job sets all four version files from the tag before installing dependencies, runs the build and tests, checks the committed bundle matches the source, attests the three installable assets, and publishes the release. Actions are pinned to commit SHAs.

After publishing succeeds, a separate `sync-version` job checks out the current default branch and commits only the four version files as `github-actions[bot]`. This keeps the committed manifest aligned with the published assets. Obsidian's directory reads the manifest at the HEAD of the default branch and installs the release matching its version; see the [official submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin).

The sync job retries concurrent default-branch pushes up to three times, reading the branch again on each attempt. An older tag does not downgrade its version. The job preserves other metadata and stops if the minimum supported app version has changed since the tagged release.

The default branch must allow the workflow token to push these metadata commits. The job uses a normal push, never a force push. If branch protection or a concurrent push blocks it, the release already exists: resolve the branch issue and choose **Re-run failed jobs** to retry only `sync-version`. Your local checkout is not automatically updated; pull the bot commit before subsequent work.

The workflow does not overwrite existing releases. For a failed run, inspect whether a release was already created before retrying. Manual dispatch must target the release tag; dispatching a branch skips publishing. Creating a release manually does not run this workflow or produce attestations.

After the run completes, verify each downloaded asset (requires an authenticated GitHub CLI):

```sh
gh release download 0.1.1 --repo jjeejj/obsidian-quiet-kanban --dir /tmp/quiet-kanban-0.1.1
for asset in main.js manifest.json styles.css; do
  gh attestation verify "/tmp/quiet-kanban-0.1.1/$asset" --repo jjeejj/obsidian-quiet-kanban
done
```

See [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations). The existing manually published `0.1.0` assets do not have build provenance; publish `0.1.1` through Actions to address that review recommendation.

## Submit the First Release

1. Sign in to [Obsidian Community](https://community.obsidian.md) with an Obsidian account.
2. Link the GitHub account that owns or manages the repository to the community profile.
3. Add the plugin through the directory's submission flow and select its repository.
4. Review the imported manifest and listing information.
5. Follow the automated review guidance and resolve any reported errors. Corrections require an incremented version and a new GitHub release.
6. Complete publication in the directory. The plugin becomes installable in Obsidian after the review errors are resolved and it is published.

Once available, users open **Settings → Community plugins → Browse**, search for **Quiet Kanban**, then install and enable it. Update the [installation guide](installation.md) when the listing is available.

## Publish Updates

Run the checks, commit and push the source and rebuilt bundle, then create and push a new `x.y.z` tag. Actions updates the version files, publishes the assets, and synchronizes the default branch. Subsequent versions do not require another initial directory submission. Users can check for updates in Obsidian.

See the official [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) for the current process.

[Back to documentation](README.md)

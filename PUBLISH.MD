# Publish to npm

This repo publishes to npm using GitHub Actions trusted publishing.

## What You Need To Do Once

1. Open the npm package settings for `auto-translate-json-library`.
2. Enable Trusted Publishing for the GitHub repository `topce/auto-translate-json-library`.
3. Allow the GitHub Actions workflow to publish this package.

After that, no `NPM_TOKEN` is needed in GitHub secrets.

## Release Steps

1. Update the version in `package.json`.
2. Run:

```shell
npm run release:check
```

1. Commit and push your changes to `master`.
2. Create and push a version tag:

```shell
git tag v2.0.4
git push origin v2.0.4
```

That tag triggers the publish workflow.

## What The Workflow Does

The workflow in `.github/workflows/publish.yaml` will:

1. Run `npm ci`
2. Run tests
3. Build the package
4. Run `npm pack --dry-run`
5. Publish to npm with provenance

## Local Validation

Before tagging, you can verify the release locally with:

```shell
npm run release:check
```

This catches broken tests, build issues, and packaging mistakes before publish.

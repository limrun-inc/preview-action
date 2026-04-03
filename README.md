# Limrun Preview Action

GitHub Action that uploads app builds to [Limrun](https://limrun.com) and posts live simulator/emulator preview links on pull requests.

## Usage

Add the preview step after your existing build step. Make sure your workflow triggers include `closed` for cleanup, and has `pull-requests: write` permission for PR comments.

### iOS

```yaml
# In your existing workflow
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  pull-requests: write

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        if: github.event.action != 'closed'
        run: xcodebuild build -scheme MyApp -sdk iphonesimulator -derivedDataPath build

      - name: Preview
        uses: limrun-inc/preview-action@v1
        with:
          app-path: build/Build/Products/Debug-iphonesimulator/MyApp.app
          api-key: ${{ secrets.LIMRUN_API_KEY }}
          platform: ios
```

### Android

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  pull-requests: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        if: github.event.action != 'closed'
        run: ./gradlew assembleDebug

      - name: Preview
        uses: limrun-inc/preview-action@v1
        with:
          app-path: app/build/outputs/apk/debug/app-debug.apk
          api-key: ${{ secrets.LIMRUN_API_KEY }}
          platform: android
```

## Setup

1. Create a Limrun account at [console.limrun.com](https://console.limrun.com)
2. Generate an API key in the console settings
3. Add it as `LIMRUN_API_KEY` in your repo's Settings > Secrets and variables > Actions
4. Add the preview step to your existing CI workflow (see examples above)
5. Invite reviewers to your Limrun organization

## What it does

**On PR open or new commits:** uploads the build artifact as a Limrun asset and posts a comment with a preview link. Reviewers click the link, sign into Limrun, and get a live interactive simulator (iOS) or emulator (Android) in the browser.

**On PR close:** deletes the asset and updates the comment.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `app-path` | On open/sync | | Build artifact. iOS: `.app` bundle directory. Android: `.apk` or `.aab` file. |
| `api-key` | Yes | | Limrun API key. Pass as a secret: `${{ secrets.LIMRUN_API_KEY }}` |
| `platform` | No | `ios` | Target platform: `ios` or `android` |
| `github-token` | No | `${{ github.token }}` | GitHub token for posting PR comments |

## Outputs

| Output | Description |
|--------|-------------|
| `preview-url` | The preview URL for the uploaded build |
| `asset-id` | The Limrun asset ID |
| `asset-name` | The resolved asset name |

## Permissions

The workflow needs `pull-requests: write` to post PR comments. Without this, the action uploads the asset but skips the comment with a warning.

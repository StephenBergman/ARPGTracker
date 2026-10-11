# ARPG Seasons

A lightweight Windows-first desktop widget for ARPG season information and countdowns. Version 1.2 adds a resizable standard application mode with PoE 1 economy snapshots and external build resources; version 1.1 introduced signed, user-approved application updates through GitHub Releases.

## Stack

- Tauri 2
- React 19
- strict TypeScript
- Vite
- CSS Modules

## Prerequisites

- Node.js 22.18 or newer (the season publisher uses Node's built-in TypeScript support)
- Rust stable with Cargo
- Microsoft C++ Build Tools and WebView2 on Windows

## Commands

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run seasons:check
npm run seasons:update
npm run tauri dev
npm run tauri build
```

## Production build

The current development release is version `1.2.0`; updater support was introduced in `1.1.0`. Run `npm run release:windows` on Windows to build the per-user NSIS installer and its Tauri updater signature. Set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in the current shell first; the script uses the private key at `%USERPROFILE%\.tauri\arpg-seasons-updater.key` unless `TAURI_SIGNING_PRIVATE_KEY` specifies another key. The release script copies the distributable installer and `.sig` file to the project root. The installer adds ARPG Seasons to the Windows installed-apps list and provides standard uninstall support without requiring administrator access.

Release builds use the production icon set in `src-tauri/icons` and embed the ARPG Seasons product name, version, description, publisher, and copyright metadata. Builds are unsigned until a Windows code-signing certificate is configured, so local test installations may show a SmartScreen warning.

Before publishing a release, verify a clean install, first launch, tray behavior, launch-at-startup opt-in, upgrade over the previous version, and uninstall on a Windows test machine.

## Application releases and updates

Application updates are delivered from GitHub Releases and are separate from season-data refreshes. The widget checks for a newer signed release shortly after launch, every six hours, and on demand from Settings. It never installs without the user choosing **Update and restart**.

The private updater key must never be committed. Add its full contents to the `TAURI_SIGNING_PRIVATE_KEY` GitHub Actions secret and its password to `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Keep an independent secure backup of both: installed clients will reject releases signed by a different key.

To publish, update the version consistently in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, commit the changes, then push a matching tag such as `v1.2.0`. The Windows release workflow runs the tests, builds the NSIS installer and signature, creates the GitHub Release, and uploads `latest.json` for updater discovery. Version `1.0.0` does not contain the updater, so existing users must install `1.1.0` manually once; later versions can update in-app.

## Phase 1 structure

- `src/app`: application composition
- `src/components`: widget presentation components
- `src/data`: bundled fallback season data
- `src/features/seasons`: domain types, validation, loading, and date utilities
- `src/features/settings`: small, defensive local preference storage
- `src/platform`: isolated native-window calls
- `src/styles`: global tokens and base styles
- `src/themes`: typed, game-specific visual definitions
- `src-tauri`: minimal native application shell and configuration

## Season data

When a confirmed countdown reaches zero, its title and start date become the current season in both expanded and compact modes. The next-season panel resets to "Next season has not been announced" and the old progress bar disappears. This also works offline and on restart, while a background refresh checks for newer announcements. Estimated dates remain tentative and show the launch transition instead of becoming current. Derived rollover leaves source/cache timestamps unchanged so newer remote data can still replace it.

The maintainable static source is `data/seasons.json`, with a packaged fallback at `src/data/default-seasons.json`. `SeasonService` supports the required `remote → cache → bundled` fallback chain and also exposes separate local-load and refresh operations so the future UI can render immediately before attempting the network.

Applications built from this version fetch the repository's raw `data/seasons.json` shortly after launch and every six hours, caching only newer validated datasets. Previously installed builds retain their existing daily refresh interval until upgraded, but still receive published season updates automatically. Set `VITE_SEASON_DATA_URL` at build time only when a different static endpoint is required.

The `Monitor official season sources` GitHub Actions workflow checks all seven games every six hours and can also be dispatched manually. It extracts named season launches and precise timezone-qualified launch times, validates the resulting dataset with the same schema as the app, runs the tests, and commits verified changes to both season files on `main`. Installed clients receive these changes through their existing data refresh without a new installer. The schedule is best effort, not an instant notification service; source scanning and client refresh can together take about twelve hours, plus GitHub scheduling delays.

Sources are configured in `scripts/season-sources.mjs`: developer-published Steam announcements for Path of Exile, Path of Exile 2, and Last Epoch; Blizzard's official news feeds and article bodies for Diablo IV and Diablo II: Resurrected; and the official Project Diablo 2 and Torchlight: Infinite homepages. Third-party Steam news and off-site article links are rejected. Source failures preserve existing season information and appear in the scan report and review issue.

Automatic extraction is deliberately conservative. It does not interpret every possible announcement format. Missing times/timezones, conflicting titles or dates, changes to an already-confirmed launch, and preview/beta/stream announcements require review. When a year is omitted, the parser uses the nearest occurrence of that calendar date to the publication date, or to the scan date for an undated homepage. Equally near occurrences remain ambiguous. Invalid calendar dates and timezone abbreviations that disagree with daylight saving time are rejected. These cases retain the existing data and maintain a deduplicated `season-data` issue; no guessed countdown is published. Adding support for a new announcement format requires updating the extractor and its tests.

Run `npm run seasons:check` for a dry run, or `npm run seasons:update` to write eligible updates locally. Both commands write `season-source-report.md`; neither pushes changes. The workflow saves this report as an artifact. After an automatic update, the scanner is idempotent and does not keep advancing timestamps for unchanged data.

Season datasets use schema version `1`. Each configured game requires current-season details, a `confirmed`, `estimated`, or `unknown` next-season status, per-game timestamps, and UTC ISO timestamps for every available date. Additions must also be registered in `GAME_IDS` and pass runtime validation.

The expanded widget is data-driven across all configured games and handles confirmed, estimated, and unknown dates. Its centralized countdown updates once per second when seconds are visible (or once per minute otherwise), aligns updates to clock boundaries, clamps at zero, and requests fresh season data once at transition. Each game resolves through a typed theme map, keeping visual identity separate from season behavior.

Compact mode persists locally, changes the native window to a 430×136 widget, and presents the selected season and a minute-level countdown in two lines.

With widget mode disabled, the standard window remembers its size and exposes build and market resources. For PoE 1 it uses GGG's public hourly Currency Exchange feed to capture a local Chaos/Divine history, calculate a 24-hour comparison, and display a compact currency watchlist. Raw hourly responses are validated and discarded; only normalized snapshots are retained locally. Personal stash valuation is not available until an approved OAuth client can request `account:stashes` access.

The system tray can restore the widget, switch games, open settings, toggle compact mode or always-on-top, request fresh season data, and explicitly exit. Closing the window hides it to the tray. Selected game, display mode, always-on-top, and window position persist locally; positions from disconnected monitors are rejected and recentered on an available display.

The settings panel controls native launch-at-startup registration, always-on-top, compact mode, countdown seconds, season progress, and manual data refresh while showing the dataset timestamp. Startup is disabled by default and reconciled with the saved preference when the application opens. Single-instance protection restores and focuses the existing widget when another launch is attempted.

### Troubleshooting missing season updates

To activate automatic publishing, commit and push the workflow and scripts to `main` and ensure GitHub Actions is enabled. The workflow requests `contents: write` and `issues: write`; repository/organization policies and branch protection must permit the Actions bot to push data commits to `main`. If a push is rejected, the workflow fails visibly instead of claiming publication. You can test activation with **Actions → Monitor official season sources → Run workflow**. No secret, API key, backend, or desktop scraping is required.

If an announcement needs review, verify it and update both `data/seasons.json` and `src/data/default-seasons.json`, advance the dataset `updatedAt` and affected game `lastUpdated`, then commit and push to `main`. Installed clients accept only newer validated datasets. Use **Check Season Data** to refresh immediately; no installer release is needed when the configured public data URL works. The monitor does not modify application binaries or publish an application release.

The configured raw GitHub URL must be accessible without signing in. A private repository returns HTTP 404 to installed clients even when Actions and authenticated Git operations succeed. Do not embed a GitHub token in the app. Either make the repository public with owner approval or publish data in a separate public repository and rebuild the app with `VITE_SEASON_DATA_URL` pointing there. The existing binary updater also requires publicly accessible GitHub Releases.

### Personal season reviewer

The personal Windows build adds a **Personal reviews** button and opens a review popup when it finds new pending announcements. Only ambiguous announcements enter this queue; verified announcements still publish automatically. Standard builds do not show review controls, fetch the review queue, or register the native publishing/credential commands.

To activate:

1. Push the monitor, `.github/workflows/season-review.yml`, scripts, and `data/season-reviews.json` to `main`. Both workflows need permission to push data commits to `main`; they share a concurrency group so scans and review decisions do not publish simultaneously.
2. Build your private installer with `npm run reviewer:build`, or run `npm run reviewer:dev` for development. These commands use the `personal-reviewer` Cargo feature and `src-tauri/tauri.reviewer.conf.json`. The separate **ARPG Seasons Reviewer** name and application identifier allow it to coexist with the public client. Do not distribute this installer as the public release. Public release workflows use the default build, which excludes the reviewer commands.
3. Install the reviewer build and open **Personal reviews**. Enter a fine-grained GitHub token belonging to **StephenBergman**, restricted to **ARPGTracker**, with **Actions: read/write**, **Contents: read**, and the automatically included Metadata access. Enter it only in the client, never in source files or this repository. The native process checks the account identity and stores the token in the current Windows user's Credential Manager. **Disconnect** removes that saved credential. No token is returned to JavaScript after setup, embedded in an installer, or sent to other clients.

Each pending item shows its game, official source, a short excerpt, the reason it needs review, and currently published season details. Correct the proposed title and choose current or next season. Enter launch times in **UTC**, and distinguish confirmed, estimated, or unknown dates. Unknown dates can publish an announced next-season title without creating a countdown.

**Approve & publish** dispatches the owner-only GitHub review workflow. It revalidates the queue and season schema, rejects a changed baseline, runs the tests, and commits the shared dataset and bundled fallback together with the decision record. The popup confirms publication only after the committed queue says approved. Other clients receive the change on their next automatic or manual season-data refresh. Workflow failures and pending publication remain visible instead of showing a false success.

**Deny** records the decision without changing public season data. The same evidence is suppressed on later scans, including automatic extraction; changed evidence can create a fresh review. Approvals, denials, source fingerprints, and short excerpts live in `data/season-reviews.json`. These are public repository metadata; the credential remains private. Stale proposals are superseded instead of overwriting newer data.

The personal client checks the queue at startup, every six hours, and when you choose **Refresh**. It briefly polls every five seconds while a submitted decision is publishing, for up to three minutes; otherwise it does not poll frequently. Closing a popup leaves its review pending. This build disables ordinary application update checks so a public installer cannot replace it and remove its review controls; update it by rebuilding/installing your personal build. Season-data updates continue normally. The personal installer does not generate signed updater artifacts.

PD2 Season 14: Alliance is recorded as October 23, 2026 at 17:00 UTC, interpreting the official homepage's "10am PST" as 10am Pacific local time (daylight time on that date), consistent with its prior reset convention. Season 13 remains current until the confirmed launch time; at that time the widget automatically displays Season 14 as current.

# ARPG Seasons

A lightweight Windows-first desktop widget for ARPG season information and countdowns. Version 1.0 completes the MVP with native Windows packaging and installer metadata.

## Stack

- Tauri 2
- React 19
- strict TypeScript
- Vite
- CSS Modules

## Prerequisites

- Node.js 20 or newer
- Rust stable with Cargo
- Microsoft C++ Build Tools and WebView2 on Windows

## Commands

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run tauri dev
npm run tauri build
```

## Production build

The production release is version `1.0.0`. Run `npm run release:windows` on Windows to build the signed-ready executable and per-user NSIS installer. The release script copies the distributable installer to `ARPG-Seasons-1.0.0-x64-setup.exe` in the project root so it is easy to find. The installer adds ARPG Seasons to the Windows installed-apps list and provides standard uninstall support without requiring administrator access.

Release builds use the production icon set in `src-tauri/icons` and embed the ARPG Seasons product name, version, description, publisher, and copyright metadata. Builds are unsigned until a Windows code-signing certificate is configured, so local test installations may show a SmartScreen warning.

Before publishing a release, verify a clean install, first launch, tray behavior, launch-at-startup opt-in, upgrade over the previous version, and uninstall on a Windows test machine.

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

The maintainable static source is `data/seasons.json`, with a packaged fallback at `src/data/default-seasons.json`. `SeasonService` supports the required `remote → cache → bundled` fallback chain and also exposes separate local-load and refresh operations so the future UI can render immediately before attempting the network.

Season datasets use schema version `1`. Each configured game requires current-season details, a `confirmed`, `estimated`, or `unknown` next-season status, per-game timestamps, and UTC ISO timestamps for every available date. Additions must also be registered in `GAME_IDS` and pass runtime validation.

The expanded widget is data-driven across all configured games and handles confirmed, estimated, and unknown dates. Its centralized countdown updates once per second when seconds are visible (or once per minute otherwise), aligns updates to clock boundaries, clamps at zero, and requests fresh season data once at transition. Each game resolves through a typed theme map, keeping visual identity separate from season behavior.

Compact mode persists locally, changes the native window to a 430×136 widget, and presents the selected season and a minute-level countdown in two lines.

The system tray can restore the widget, switch games, open settings, toggle compact mode or always-on-top, request fresh season data, and explicitly exit. Closing the window hides it to the tray. Selected game, display mode, always-on-top, and window position persist locally; positions from disconnected monitors are rejected and recentered on an available display.

The settings panel controls native launch-at-startup registration, always-on-top, compact mode, countdown seconds, season progress, and manual data refresh while showing the dataset timestamp. Startup is disabled by default and reconciled with the saved preference when the application opens. Single-instance protection restores and focuses the existing widget when another launch is attempted.

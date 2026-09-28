# AGENTS.md

## Project: ARPG Season Tracker

This repository contains a brand-new Windows-first desktop application for tracking ARPG seasons and countdowns.

The application should behave like a polished desktop widget that can remain visible on a user's desktop or secondary monitor.

The primary user questions are:

1. What is the current season for each supported ARPG?
2. What is the current season title?
3. When did the current season start?
4. How long has the current season been active?
5. When will the next season start?
6. How much time remains until the next season?
7. Is the next-season date confirmed, estimated, or unknown?

Initial supported games:

- Path of Exile
- Path of Exile 2
- Diablo IV
- Last Epoch

The architecture must make adding more games straightforward.

---

# 1. Core Stack

Use the following stack unless a real technical blocker requires a documented deviation:

- Tauri 2
- React
- TypeScript
- Vite
- CSS Modules or scoped CSS
- Rust only where necessary for native desktop functionality

Do not use Electron.

Do not add a backend.

Do not add a database.

Do not add accounts or authentication.

Do not add analytics or telemetry.

Do not add unnecessary cloud services.

The app should be local-first and lightweight.

---

# 2. Project Philosophy

This is a desktop widget, not a conventional dashboard.

The application should feel like a premium ARPG companion utility.

It should not look like:

- an admin dashboard
- a generic web app
- a Bootstrap template
- a productivity SaaS interface
- a website simply wrapped in a desktop window

The design should use:

- dark ARPG-inspired styling
- restrained visual effects
- strong typography
- compact information density
- atmospheric borders and surfaces
- subtle animation
- game-specific themes

The app may remain open for hours or days, so CPU usage, memory usage, animation cost, and network activity should remain low.

---

# 3. Primary Display Modes

The app must support two display modes.

## Expanded Mode

Expanded mode should display:

- selected game
- current season title
- current season start date
- season age
- next season date if known
- countdown to next season
- confirmed / estimated / unknown status
- optional season progress

Example structure:

```text
PATH OF EXILE 2

RISE OF THE ABYSS

Season Started
August 29, 2026

Active For
31 Days

────────────────────────

NEXT SEASON

November 9, 2026

41 DAYS
08 HOURS
17 MINUTES

● Confirmed
```

## Compact Mode

Compact mode should be suitable for staying permanently visible on a desktop.

Example:

```text
POE2 • Rise of the Abyss
Next League • 41d 08h
```

Persist the user's selected display mode.

---

# 4. Desktop Window Requirements

The app should behave like a desktop widget.

Implement:

- frameless window
- draggable header or designated drag region
- custom minimize behavior
- close-to-tray-ready architecture
- transparent window where appropriate
- rounded application UI
- always-on-top toggle
- remembered window position
- remembered window size if resizable
- remembered selected game
- remembered display mode
- remembered always-on-top state
- optional launch-with-Windows setting
- system tray support
- restore from tray
- explicit Exit command

The user should be able to place the widget on a second monitor, restart it, and have it reopen in the expected location.

If a saved position becomes invalid because a monitor was removed, recover gracefully and place the window on an available display.

---

# 5. Game Navigation

Expanded mode should include a compact game switcher.

Initial entries:

```text
POE
POE 2
D4
LE
```

Switching games must update:

- theme
- game name
- current season title
- season start
- season age
- next season information
- countdown
- season status
- progress indicator

Persist the selected game.

Text labels are acceptable initially.

Icons or logos may be introduced later.

---

# 6. Season Data Model

Create strongly typed season models.

Recommended shape:

```ts
export interface GameSeasonData {
  gameId: string;
  gameName: string;

  currentSeason: {
    id: string;
    title: string;
    startDate: string;
    endDate?: string | null;
  };

  nextSeason: {
    title?: string | null;
    startDate?: string | null;
    status: "confirmed" | "estimated" | "unknown";
  };

  source?: string;
  lastUpdated: string;
}
```

Do not hard-code season information inside presentation components.

All season information must flow through a dedicated season-data layer.

---

# 7. Remote Season Data

Use a static JSON file as the initial remote source of truth.

Preferred structure:

```text
/data
  seasons.json
```

Example top-level structure:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-28T12:00:00Z",
  "games": {
    "poe": {},
    "poe2": {},
    "diablo4": {},
    "lastEpoch": {}
  }
}
```

The app should eventually retrieve this file from a simple static location such as the project's GitHub repository.

Season-data updates should not require rebuilding or reinstalling the desktop application.

---

# 8. Data Loading Strategy

On application launch:

1. Load cached season data immediately.
2. Render the UI.
3. Attempt to retrieve fresh remote season data.
4. Validate the remote data.
5. Compare timestamps or versions.
6. Replace cached data if the remote dataset is valid and newer.
7. Persist the new dataset locally.
8. Refresh the UI.

Do not block application startup on the network.

Fallback order:

```text
Remote data
↓
Local cached data
↓
Bundled default data
```

The app must remain functional offline.

---

# 9. Runtime Validation

Never blindly trust remote JSON.

Validate:

- schema version
- game IDs
- required strings
- ISO date values
- status values
- timestamps
- required current-season information

If validation fails:

- reject the remote response
- continue using cached data
- log a useful development message
- do not crash

A library such as Zod is acceptable if it improves clarity without overcomplicating the project.

---

# 10. Bundled Fallback Data

Ship the application with a bundled default season dataset.

Suggested location:

```text
src/data/default-seasons.json
```

The application must always have usable fallback data even if:

- the network is offline
- the remote file is malformed
- the cache is empty
- the cache is corrupt

---

# 11. Date Handling

Centralize date logic.

Create utilities for at least:

```ts
getTimeUntil(date)
getTimeSince(date)
getSeasonProgress(start, end)
formatCalendarDate(date)
formatRelativeDuration(duration)
```

Use UTC internally.

Present dates appropriately in the user's local timezone.

Countdowns must remain accurate through timezone and DST changes.

Do not duplicate date arithmetic inside individual components.

---

# 12. Countdown Behavior

Expanded mode may display:

```text
41 DAYS
08 HOURS
17 MINUTES
32 SECONDS
```

Compact mode should normally omit seconds:

```text
41d 08h
```

Avoid unnecessary React renders.

Recommended update frequency:

- every second only when seconds are visible
- every minute otherwise

When the countdown reaches zero:

- never show negative values
- attempt a season-data refresh
- show a safe transition state

Example:

```text
New season should now be live
Checking season information…
```

If updated data is unavailable:

```text
Season transition in progress
```

Never display:

```text
-1 days
NaN
Invalid Date
undefined
```

---

# 13. Season Status

Support exactly these initial statuses:

```text
confirmed
estimated
unknown
```

## Confirmed

Example:

```text
● Confirmed
```

## Estimated

Example:

```text
◐ Estimated
```

Do not visually imply an estimated date is official.

## Unknown

Example:

```text
Next season has not been announced
```

Do not invent a countdown when a date is unavailable.

---

# 14. Season Progress

When both a start and an end/next-season date exist, calculate progress:

```text
elapsed / total duration
```

Example:

```text
Season Progress

████████████████░░░░░░
68%
```

If the next date is estimated, the progress indicator should clearly be approximate.

Do not display season progress when the available data is insufficient.

---

# 15. Game Themes

Themes must be separate from business logic.

Recommended interface:

```ts
interface GameTheme {
  id: string;
  background: string;
  surface: string;
  border: string;
  primary: string;
  secondary: string;
  text: string;
  mutedText: string;
}
```

Theme direction:

## Path of Exile

- charcoal
- tarnished bronze
- parchment
- dark red accents

## Path of Exile 2

- black
- bronze / gold
- muted crimson
- stone-inspired surfaces

## Diablo IV

- black
- dark gray
- blood red
- weathered beige

## Last Epoch

- near-black
- deep blue
- turquoise
- ancient gold

Do not copy proprietary game UI assets.

Create original styling inspired by each game's tone.

---

# 16. Visual Effects

Use restrained effects only.

Acceptable examples:

- subtle gradients
- thin metallic borders
- faint noise
- light vignette
- subtle countdown digit transitions
- progress glow
- mild status pulse
- restrained hover transitions

Avoid:

- large particle systems
- constant animation loops
- flashing effects
- excessive blur
- large shadows
- high GPU usage
- overly decorative fantasy fonts for body text

---

# 17. Frontend Structure

Start with a feature-oriented structure similar to:

```text
src/
├── app/
│   └── App.tsx
│
├── components/
│   ├── Countdown/
│   ├── CurrentSeason/
│   ├── GameSelector/
│   ├── SeasonProgress/
│   ├── StatusBadge/
│   ├── WindowControls/
│   └── WidgetShell/
│
├── features/
│   ├── seasons/
│   │   ├── season.service.ts
│   │   ├── season.types.ts
│   │   ├── season.schema.ts
│   │   └── season.utils.ts
│   │
│   └── settings/
│       ├── settings.service.ts
│       ├── settings.types.ts
│       └── settings.store.ts
│
├── hooks/
│   ├── useCountdown.ts
│   └── useSeasonData.ts
│
├── themes/
│   ├── poe.ts
│   ├── poe2.ts
│   ├── diablo4.ts
│   ├── lastEpoch.ts
│   └── index.ts
│
├── data/
│   └── default-seasons.json
│
├── styles/
│   ├── globals.css
│   └── variables.css
│
└── main.tsx
```

This is a guideline, not a requirement.

Adjust structure when a cleaner implementation exists, but preserve clear separation between:

- desktop/native concerns
- season domain logic
- settings
- presentation
- themes

---

# 18. Native Tauri Structure

Keep native logic isolated.

A reasonable starting structure:

```text
src-tauri/
├── src/
│   ├── main.rs
│   ├── tray.rs
│   ├── window.rs
│   └── commands.rs
```

Do not move business logic into Rust without a good reason.

Prefer TypeScript for:

- date logic
- season logic
- settings models
- remote data validation
- UI state

Use Rust/Tauri primarily for:

- window behavior
- system tray
- startup integration
- native filesystem functionality where needed

---

# 19. User Settings

Persist settings locally.

Recommended model:

```ts
interface UserSettings {
  selectedGameId: string;
  displayMode: "compact" | "expanded";

  alwaysOnTop: boolean;
  launchAtStartup: boolean;

  showSeconds: boolean;
  showSeasonProgress: boolean;

  window?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}
```

Add schema versioning if useful.

Missing settings should fall back to sane defaults.

Corrupt settings should not crash the app.

---

# 20. Settings UI

Keep settings intentionally small.

Initial options:

```text
GENERAL

Launch with Windows        [ON/OFF]
Always on top              [ON/OFF]
Start in compact mode      [ON/OFF]

DISPLAY

Show seconds               [ON/OFF]
Show season progress       [ON/OFF]

DATA

Last updated:
September 28, 2026 12:00 PM

[ Check for updates ]
```

Use a small modal, drawer, or panel.

Do not build a large settings application.

---

# 21. System Tray

Target tray menu:

```text
Open ARPG Seasons
────────────────────
Compact Mode
Always on Top
────────────────────
Path of Exile
Path of Exile 2
Diablo IV
Last Epoch
────────────────────
Settings
Check Season Data
Exit
```

Changing games through the tray must update the visible widget.

Closing the main window should eventually hide it to the tray rather than terminate the application.

Exit must terminate the application.

---

# 22. Custom Window Controls

Because the application is frameless, provide minimal controls.

Example:

```text
—
×
```

Expected behavior:

- minimize or hide
- close to tray

Do not clutter the widget with conventional window chrome.

---

# 23. Drag Regions

Provide a usable draggable area.

Interactive controls must not become drag targets.

Verify:

- game selector clicks work
- settings controls work
- window buttons work
- compact/expanded toggles work

---

# 24. Remote Refresh Behavior

Refresh season data:

- at startup
- manually
- periodically while the app remains open

Recommended initial interval:

```text
Startup
+
Every 6 hours
```

Do not poll frequently.

Do not spam remote services.

---

# 25. Error Handling

Network failures should usually be silent.

Do not show alarming modal errors just because the remote JSON cannot be reached.

Prefer subtle information such as:

```text
Last updated 2 days ago
```

If data is clearly stale, allow a subdued warning such as:

```text
Season information may be outdated.
```

The UI must not crash because refresh failed.

---

# 26. Data Staleness

Use `lastUpdated` to classify data.

Suggested categories:

```text
fresh: < 7 days
aging: 7–30 days
stale: > 30 days
```

This does not need to be highly visible in the initial UI.

Use it primarily to avoid silently presenting extremely old information.

---

# 27. Source Information

Store the source for each game's season information.

Example:

```json
"source": "https://..."
```

A future details/info surface may show:

```text
Source
Official Path of Exile announcement
```

Source presentation is not a Phase 1 requirement.

---

# 28. Accessibility

Maintain:

- readable contrast
- keyboard focus
- scalable text
- status labels in addition to color

Do not communicate status using color alone.

Prefer:

```text
● Confirmed
```

over an unlabeled colored dot.

---

# 29. Performance Requirements

The widget should remain inexpensive while idle.

Goals:

- near-zero CPU while idle
- modest memory use
- no high-frequency polling
- no unnecessary animation loops
- no unnecessary network calls
- no heavy dependencies without justification

Do not optimize prematurely, but do not introduce obviously wasteful patterns.

---

# 30. First Run

Do not create an onboarding wizard.

Expected behavior:

1. App launches.
2. A default game is visible immediately.
3. Season information is visible.
4. User can switch games.
5. User can reposition the widget.

Default game may initially be Path of Exile 2.

---

# 31. Versioning

Use semantic application versioning:

```text
0.1.0
0.2.0
1.0.0
```

Season-data schema versioning must be independent:

```json
"schemaVersion": 1
```

---

# 32. App Updates

Do not make automatic binary application updates part of the initial MVP unless trivial.

The architecture should allow Tauri's updater to be added later.

Keep these separate:

```text
Season data update
```

and:

```text
Application binary update
```

Routine season maintenance should only require changing season data.

---

# 33. Security

Treat all remote season data as untrusted input.

Rules:

- validate all remote JSON
- never execute remote HTML
- never execute remote JavaScript
- never allow arbitrary remote code
- do not embed secrets
- do not require API keys for the MVP
- reject unexpected schema values safely

---

# 34. Development Phases

Work in phases.

Do not implement the entire project in one uncontrolled pass.

Complete and stabilize each phase before moving deeper into later work.

---

# Phase 1 — Project Foundation

Goal:

Create a working desktop shell from scratch.

Tasks:

- initialize Tauri 2
- initialize React
- initialize TypeScript
- initialize Vite
- remove starter/demo content
- establish clean folder structure
- configure a frameless Windows-oriented window
- add basic drag region
- add custom minimize control
- add custom close control structure
- create basic dark widget shell
- create placeholder game selector
- create placeholder season area
- create placeholder countdown area
- use mock data only

Do not implement yet:

- remote data
- system tray
- Windows startup
- automatic binary updates
- full theme system
- production season sources

Acceptance criteria:

- development build launches successfully
- application is frameless
- window can be moved
- minimize works
- close behavior is structurally ready for tray integration
- TypeScript compiles
- production Tauri build succeeds
- no starter/demo UI remains

Before proceeding:

- fix all compile errors
- fix runtime errors
- run type checks
- run lint if configured
- summarize the files created or changed
- document any architectural deviation

---

# Phase 2 — Season Domain Layer

Goal:

Create the application's season-data foundation.

Implement:

- season interfaces
- runtime validation
- bundled season data
- season service
- local cache
- remote data retrieval abstraction
- fallback handling
- date utilities

Acceptance criteria:

The app can resolve season data using:

```text
remote → cache → bundled fallback
```

Malformed or unavailable remote data must not crash the app.

---

# Phase 3 — Core Widget UI

Build:

- WidgetShell
- GameSelector
- CurrentSeason
- Countdown
- SeasonProgress
- StatusBadge

Display:

- selected game
- current season title
- current season start date
- season age
- next season date
- countdown
- confirmed / estimated / unknown status

Acceptance criteria:

Switching games updates all displayed information correctly.

---

# Phase 4 — Countdown Engine

Implement centralized countdown behavior.

Test:

- tomorrow
- 100 days away
- one minute away
- exact transition at zero
- missing date
- invalid date
- DST boundary
- local timezone presentation

No negative values or invalid text may appear.

---

# Phase 5 — Styling and Themes

Create:

- global dark widget style
- typography system
- game theme variables
- transitions
- progress bar
- restrained border/surface treatments
- responsive behavior

Add four game themes.

Do not begin by adding artwork.

Start with:

- CSS
- gradients
- borders
- typography
- color
- subtle texture

Acceptance criteria:

Each game feels visually distinct while still belonging to one coherent application.

---

# Phase 6 — Compact Mode

Implement compact mode.

Expanded example:

```text
┌──────────────────────────────┐
│ PATH OF EXILE 2              │
│                              │
│ RISE OF THE ABYSS            │
│                              │
│ Started Aug 29               │
│                              │
│ NEXT LEAGUE                  │
│ 41 DAYS • 08 HOURS           │
│                              │
│ ● Confirmed                  │
└──────────────────────────────┘
```

Compact example:

```text
┌──────────────────────────────┐
│ POE2 • Rise of the Abyss     │
│ Next League • 41d 08h        │
└──────────────────────────────┘
```

Persist display mode.

---

# Phase 7 — Desktop Integration

Implement:

- system tray
- always-on-top
- save window position
- restore window position
- close to tray
- selected-game persistence
- display-mode persistence

Acceptance criteria:

The application survives normal restart/reopen workflows while preserving state.

---

# Phase 8 — Settings

Implement:

- launch with Windows
- always on top
- compact mode preference
- show countdown seconds
- show season progress
- manual season-data refresh
- last updated display

Keep the settings surface minimal.

---

# Phase 9 — Windows Startup

Add optional launch-with-Windows behavior.

Requirements:

- user-controlled
- disabled by default unless explicitly chosen
- persisted
- no duplicate processes
- no duplicate windows

---

# Phase 10 — Production Build

Prepare:

- application icon
- Windows installer
- executable metadata
- app name
- version number
- production Tauri configuration

Working app name:

```text
ARPG Seasons
```

Verify install and uninstall behavior.

---

# 35. Testing Expectations

At minimum, add useful tests around business logic.

## Date Utilities

Test:

- future date
- near-future date
- exact zero transition
- missing value
- malformed value
- DST boundary
- long duration

## Data

Test:

- valid remote response
- remote unavailable
- malformed JSON
- unsupported schema
- cache unavailable
- bundled fallback
- corrupt cache

## Settings

Test:

- first run
- valid saved settings
- missing properties
- corrupt settings
- default migration behavior

## Window Logic

Manually verify:

- primary monitor
- secondary monitor
- disconnected secondary monitor
- compact mode
- expanded mode
- always-on-top changes

---

# 36. Logging

Development logs should be useful and concise.

Examples:

```text
[season] Loaded cached season dataset
[season] Checking remote dataset
[season] Remote dataset updated
[season] Remote validation failed; using cache
```

Do not log every countdown tick.

Production should remain quiet.

---

# 37. README Requirements

Maintain a useful README.

It should eventually explain:

- what the project does
- technology stack
- prerequisites
- local development setup
- development commands
- production build commands
- season-data location
- JSON schema
- how to update a season
- how to add another game
- folder structure
- architecture overview

---

# 38. Season Maintenance Workflow

The intended long-term workflow is:

1. A developer announces a new season.
2. Update `seasons.json`.
3. Update:
   - current season title
   - current season start date
   - next season date
   - status
   - source
   - updated timestamp
4. Commit and push.
5. Clients retrieve the updated data.

A binary application release should not be required for routine season updates.

---

# 39. Adding Another Game

Adding another ARPG should ideally require only:

1. a new game definition
2. season data
3. a theme
4. a selector entry

Do not design components around hard-coded checks such as:

```ts
if (game === "poe2") { ... }
```

scattered throughout the codebase.

Prefer data-driven rendering.

---

# 40. Future Features

Do not implement these during the initial MVP unless needed for architecture.

Possible future additions:

- previous season history
- reveal-stream countdowns
- patch dates
- PTR dates
- expansion launches
- desktop notifications
- automatic season discovery
- calendar view
- arbitrary game events
- additional ARPGs
- app auto-update

The data architecture should not make these unnecessarily difficult later.

---

# 41. Future Event Model

Do not implement yet, but avoid architecture that blocks a future generalized event model.

Potential future type:

```ts
interface GameEvent {
  id: string;
  gameId: string;
  type:
    | "season-start"
    | "season-end"
    | "announcement"
    | "patch"
    | "expansion"
    | "stream";

  title: string;
  date: string;

  status:
    | "confirmed"
    | "estimated";

  source?: string;
}
```

---

# 42. MVP Definition of Done

The MVP is complete when:

1. The application installs on Windows.
2. It behaves like a desktop widget.
3. Four initial games exist.
4. The user can switch games immediately.
5. Current season title is shown.
6. Current season start is shown.
7. Season age is shown.
8. Next season date is shown when known.
9. Countdown works.
10. Confirmed and estimated dates are clearly different.
11. Unknown dates are handled cleanly.
12. Offline fallback works.
13. Remote season data can update without reinstalling.
14. Compact mode works.
15. Expanded mode works.
16. Always-on-top works.
17. Window location persists.
18. Settings persist.
19. System tray works.
20. Optional Windows startup works.
21. Production installer builds successfully.

---

# 43. Coding Rules

Follow these rules throughout the project.

## Rule 1

Do not over-engineer.

This is intentionally a small desktop utility.

## Rule 2

Do not create a backend unless explicitly requested.

## Rule 3

Do not create a database.

## Rule 4

Do not create user accounts.

## Rule 5

Keep native Rust code minimal.

## Rule 6

Keep season logic independent from React components.

## Rule 7

Keep game themes independent from business logic.

## Rule 8

Do not hard-code game-specific behavior throughout the UI.

## Rule 9

Prefer reusable abstractions only when they reduce real duplication.

## Rule 10

Complete and test each phase before adding unnecessary future functionality.

## Rule 11

Do not silently replace the required architecture.

Use Tauri + React + TypeScript unless a real technical blocker exists.

## Rule 12

If architecture must change, document the reason before implementing the change.

## Rule 13

Do not install large libraries when a small native implementation is reasonable.

## Rule 14

Do not leave dead code, starter code, unused components, or temporary debug UI after a phase is complete.

## Rule 15

Do not hide errors with broad `any` types or ignored exceptions.

## Rule 16

Use strict TypeScript.

## Rule 17

Prefer explicit domain types over loose object shapes.

## Rule 18

Avoid premature complexity.

No Redux or equivalent global state framework unless the application genuinely grows to require it.

## Rule 19

Do not make unnecessary network requests.

## Rule 20

Preserve low idle resource usage.

---

# 44. Recommended Build Order

Use this sequence unless a dependency requires a small adjustment:

```text
1. Scaffold Tauri + React + TypeScript
       ↓
2. Establish folder structure
       ↓
3. Configure desktop window
       ↓
4. Implement season types
       ↓
5. Add bundled mock/test data
       ↓
6. Implement date/countdown utilities
       ↓
7. Build expanded widget
       ↓
8. Add game switching
       ↓
9. Add themes
       ↓
10. Add remote data retrieval
       ↓
11. Add caching
       ↓
12. Add compact mode
       ↓
13. Add settings persistence
       ↓
14. Add system tray
       ↓
15. Add always-on-top
       ↓
16. Add Windows startup
       ↓
17. Build settings surface
       ↓
18. Harden error handling
       ↓
19. Add tests
       ↓
20. Build Windows installer
```

---

# 45. Instructions for Codex When Starting This Repository

Assume this repository is empty or contains no meaningful application code.

Start from scratch.

For the first implementation pass, do Phase 1 only.

Create a Tauri 2 desktop application using:

- React
- TypeScript
- Vite

Set up a clean project structure.

Implement only:

- frameless application shell
- dark widget base
- draggable area
- custom minimize button
- custom close button structure
- placeholder game selector
- placeholder current season section
- placeholder next season countdown
- mock season data

Do not implement in the first pass:

- real remote season data
- GitHub data fetching
- system tray
- Windows startup
- automatic binary updates
- full theme system
- notifications
- calendar mode
- production data sources

At the end of Phase 1:

1. Run the application.
2. Resolve compile errors.
3. Resolve runtime errors.
4. Run TypeScript checks.
5. Run linting if configured.
6. Run a production Tauri build.
7. Remove unused starter/demo code.
8. Summarize files created and changed.
9. Document any deviations from this file.
10. Stop after Phase 1 unless explicitly instructed to continue.

Do not skip directly into later phases just because they are documented here.

The purpose of this file is to preserve the full project direction while keeping implementation incremental and controlled.

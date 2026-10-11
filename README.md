# ARPG Seasons

A lightweight Windows desktop companion for ARPG seasons. See the current season, upcoming launch dates, and countdowns in a compact widget or a larger application window.

Supports **Path of Exile, Path of Exile 2, Diablo IV, Diablo II: Resurrected, Last Epoch, Project Diablo 2, and Torchlight: Infinite**.

## Download

**[Download Windows x64 installer (v1.2.0)](https://github.com/StephenBergman/ARPGTracker/releases/download/v1.2.0/ARPG-Seasons-1.2.0-x64-local-setup.exe)**

[All releases](https://github.com/StephenBergman/ARPGTracker/releases) · [ZIP with installation guide and checksum](https://github.com/StephenBergman/ARPGTracker/releases/download/v1.2.0/ARPG-Seasons-1.2.0-Windows-x64.zip)

Open the newest published release and expand **Assets**. Download the Windows x64 **setup.exe** installer. You do not need the source-code ZIP, `.sig`, or `latest.json` files.

Version 1.2.0 is a manual-install release and is not offered by the in-app updater. See [installation instructions](docs/INSTALL.md).

## Install on Windows

1. Download the standard **ARPG Seasons** Windows x64 installer.
2. Double-click `setup.exe` and follow the installer. It installs for your Windows account without requiring administrator access.
3. Open **ARPG Seasons** from the Start menu.

Use Windows 10 or 11 on an Intel/AMD 64-bit PC. Internet access is needed for fresh season information and, if missing, to install Microsoft's WebView2 runtime. Node.js, Rust, and developer tools are not required.

Locally built installers do not have a Windows publisher certificate and may show SmartScreen. Verify that the file came from this repository or the maintainer before choosing **More info → Run anyway**. Organization-managed PCs may require administrator approval.

## Use the app

- **Choose a game** to see its current season, season age, and next launch countdown.
- Open **Settings** to enable compact mode, always-on-top, or optional launch with Windows.
- Drag the header to position the window. Your game, settings, and window position are remembered.
- Closing the window keeps the app in the **system tray** beside the Windows clock. Use the tray icon to reopen it, or choose **Exit** to quit completely.

Dates appear in your local timezone. **Confirmed**, **Estimated**, and **Unknown** labels distinguish available launch information. An unknown date has no countdown.

## Updates and offline use

Season information refreshes automatically, separately from application updates. Newly built clients check every six hours; older versions may check daily. To check immediately, use **Settings → Season data → Refresh season data**. Routine season changes do not require reinstalling.

Official announcements are checked periodically. Ambiguous announcements may take longer because they require maintainer review. The app retains cached or bundled information when offline.

When a signed application release is available, Settings offers **Update and restart**. Application updates require your approval. You can also install a newer standard installer over your existing installation.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| The window disappeared | Check the system tray, including hidden icons, and reopen ARPG Seasons. |
| Season information looks old | Connect to the internet and choose **Refresh season data** in Settings. An announcement may still need review. |
| A countdown is missing | The next launch date may be unknown. Check its status label. |
| Downloads or app updates are unavailable | Check the [Releases page](https://github.com/StephenBergman/ARPGTracker/releases). A release must be published before download and updater links work. |
| You want to uninstall | Exit through the tray, then use **Windows Settings → Apps → Installed apps → ARPG Seasons → Uninstall**. |

## Privacy and support

No account, subscription, analytics, or telemetry is required. Preferences and cached data are stored locally. Network requests provide season information, application updates, and optional game market information.

[Report a bug or request a feature](https://github.com/StephenBergman/ARPGTracker/issues). Include your Windows version, app version from Settings, selected game, and what happened. Never include passwords or access tokens.

For source builds, release packaging, season maintenance, and the separate maintainer reviewer, see [development documentation](docs/DEVELOPMENT.md).

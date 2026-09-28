import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  const appUpdater = { currentVersion: "1.1.0", availableVersion: null, releaseNotes: null, progress: null, status: "current" as const, checkForUpdate: vi.fn(), installUpdate: vi.fn() };
  it("renders the complete compact settings surface", () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(<SettingsPanel displayMode="expanded" alwaysOnTop={false} widgetMode positionLocked={false} launchAtStartup={false} startupSyncStatus="ready" showSeconds showSeasonProgress lastUpdated="2026-09-28T12:00:00Z" isRefreshing={false} appUpdater={appUpdater} onDisplayMode={noop} onAlwaysOnTop={noop} onWidgetMode={noop} onPositionLocked={noop} onLaunchAtStartup={noop} onShowSeconds={noop} onShowSeasonProgress={noop} onRefresh={noop} onClose={noop} />);
    expect(markup).toContain("Launch with Windows");
    expect(markup).toContain("Always on top");
    expect(markup).toContain("Widget mode");
    expect(markup).toContain("Lock position");
    expect(markup).toContain("Compact mode");
    expect(markup).toContain("Show seconds");
    expect(markup).toContain("Show season progress");
    expect(markup).toContain("Refresh season data");
    expect(markup).toContain("Check for app update");
  });

  it("shows refresh activity", () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(<SettingsPanel displayMode="expanded" alwaysOnTop widgetMode positionLocked launchAtStartup startupSyncStatus="syncing" showSeconds showSeasonProgress lastUpdated="invalid" isRefreshing appUpdater={appUpdater} onDisplayMode={noop} onAlwaysOnTop={noop} onWidgetMode={noop} onPositionLocked={noop} onLaunchAtStartup={noop} onShowSeconds={noop} onShowSeasonProgress={noop} onRefresh={noop} onClose={noop} />);
    expect(markup).toContain("Checking…");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Updating Windows startup");
  });

  it("offers an available application update separately from season data", () => {
    const noop = vi.fn();
    const availableUpdater = { ...appUpdater, availableVersion: "1.2.0", releaseNotes: "Accessibility improvements", status: "available" as const };
    const markup = renderToStaticMarkup(<SettingsPanel displayMode="expanded" alwaysOnTop={false} widgetMode positionLocked={false} launchAtStartup={false} startupSyncStatus="ready" showSeconds showSeasonProgress lastUpdated="2026-09-28T12:00:00Z" isRefreshing={false} appUpdater={availableUpdater} onDisplayMode={noop} onAlwaysOnTop={noop} onWidgetMode={noop} onPositionLocked={noop} onLaunchAtStartup={noop} onShowSeconds={noop} onShowSeasonProgress={noop} onRefresh={noop} onClose={noop} />);
    expect(markup).toContain("Version 1.2.0 is available");
    expect(markup).toContain("Accessibility improvements");
    expect(markup).toContain("Update and restart");
    expect(markup).toContain("Refresh season data");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  it("renders the complete compact settings surface", () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(<SettingsPanel displayMode="expanded" alwaysOnTop={false} launchAtStartup={false} startupSyncStatus="ready" showSeconds showSeasonProgress lastUpdated="2026-09-28T12:00:00Z" isRefreshing={false} onDisplayMode={noop} onAlwaysOnTop={noop} onLaunchAtStartup={noop} onShowSeconds={noop} onShowSeasonProgress={noop} onRefresh={noop} onClose={noop} />);
    expect(markup).toContain("Launch with Windows");
    expect(markup).toContain("Always on top");
    expect(markup).toContain("Compact mode");
    expect(markup).toContain("Show seconds");
    expect(markup).toContain("Show season progress");
    expect(markup).toContain("Check for updates");
  });

  it("shows refresh activity", () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(<SettingsPanel displayMode="expanded" alwaysOnTop launchAtStartup startupSyncStatus="syncing" showSeconds showSeasonProgress lastUpdated="invalid" isRefreshing onDisplayMode={noop} onAlwaysOnTop={noop} onLaunchAtStartup={noop} onShowSeconds={noop} onShowSeasonProgress={noop} onRefresh={noop} onClose={noop} />);
    expect(markup).toContain("Checking…");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Updating Windows startup");
  });
});

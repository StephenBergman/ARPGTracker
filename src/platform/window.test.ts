import { describe, expect, it } from "vitest";
import type { Monitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { detectWidgetPlacement, getWidgetPlacementSize, isPositionOnAvailableDisplay } from "./window";

const monitor = (x: number, y: number, width = 1920, height = 1080): Monitor => {
  const position = new PhysicalPosition(x, y);
  const size = new PhysicalSize(width, height);
  return { name: null, position, size, workArea: { position, size }, scaleFactor: 1 };
};

describe("window position recovery", () => {
  const monitors = [monitor(0, 0), monitor(-1280, 0, 1280, 1024)];
  it("accepts positions on primary and secondary monitors", () => { expect(isPositionOnAvailableDisplay({ x: 100, y: 100 }, monitors)).toBe(true); expect(isPositionOnAvailableDisplay({ x: -1000, y: 200 }, monitors)).toBe(true); });
  it("rejects positions left behind by a removed monitor", () => { expect(isPositionOnAvailableDisplay({ x: 2500, y: 200 }, monitors)).toBe(false); });
});

describe("widget placement", () => {
  const monitors = [monitor(0, 0)];
  it("selects edge and corner zones from the window center", () => {
    expect(detectWidgetPlacement({ x: 700, y: 10 }, { width: 430, height: 390 }, monitors)).toBe("topCenter");
    expect(detectWidgetPlacement({ x: 10, y: 10 }, { width: 430, height: 390 }, monitors)).toBe("topLeft");
    expect(detectWidgetPlacement({ x: 1480, y: 650 }, { width: 430, height: 390 }, monitors)).toBe("bottomRight");
    expect(detectWidgetPlacement({ x: 745, y: 345 }, { width: 430, height: 390 }, monitors)).toBe("free");
  });

  it("uses placement-specific aspect ratios", () => {
    expect(getWidgetPlacementSize("topCenter")).toEqual({ width: 720, height: 210 });
    expect(getWidgetPlacementSize("leftCenter")).toEqual({ width: 380, height: 560 });
    expect(getWidgetPlacementSize("bottomRight")).toEqual({ width: 430, height: 390 });
  });
});

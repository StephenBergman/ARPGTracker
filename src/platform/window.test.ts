import { describe, expect, it } from "vitest";
import type { Monitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { isPositionOnAvailableDisplay } from "./window";

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

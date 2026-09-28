import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatRelativeDuration, getSeasonProgress, getTimeSince, getTimeUntil } from "./season.utils";

describe("season date utilities", () => {
  const now = Date.parse("2026-03-08T06:30:00Z");

  it("splits future durations without going negative", () => {
    expect(getTimeUntil("2026-03-09T08:32:03Z", now)).toEqual({ totalMilliseconds: 93_723_000, days: 1, hours: 2, minutes: 2, seconds: 3 });
    expect(getTimeUntil("2026-03-08T06:29:00Z", now).totalMilliseconds).toBe(0);
  });

  it("handles missing and malformed values safely", () => {
    expect(getTimeUntil(undefined, now).totalMilliseconds).toBe(0);
    expect(getTimeSince("invalid", now).days).toBe(0);
    expect(formatCalendarDate("invalid")).toBeNull();
  });

  it("uses absolute UTC instants across a DST boundary", () => {
    expect(getTimeUntil("2026-03-08T08:30:00Z", now).hours).toBe(2);
  });

  it("clamps progress and rejects unusable ranges", () => {
    expect(getSeasonProgress("2026-01-01T00:00:00Z", "2026-01-11T00:00:00Z", Date.parse("2026-01-06T00:00:00Z"))).toBe(0.5);
    expect(getSeasonProgress("2026-01-11T00:00:00Z", "2026-01-01T00:00:00Z", now)).toBeNull();
  });

  it("formats the largest meaningful duration unit", () => {
    expect(formatRelativeDuration(getTimeUntil("2026-03-09T08:32:03Z", now))).toBe("1 day");
  });
});

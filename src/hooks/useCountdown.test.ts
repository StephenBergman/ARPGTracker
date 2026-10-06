import { describe, expect, it } from "vitest";
import { getCountdownDelay, getCountdownSnapshot } from "./useCountdown";

describe("countdown engine", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");

  it("handles tomorrow", () => {
    const result = getCountdownSnapshot("2026-09-29T12:00:00Z", now);
    expect(result.status).toBe("active");
    expect(result.remaining.days).toBe(1);
  });

  it("wakes at launch before the next compact minute tick", () => {
    expect(getCountdownDelay(500, false, now + 10_000)).toBe(500);
    expect(getCountdownDelay(500, true, now + 10_000)).toBe(500);
  });

  it("retains low-frequency ticks when the start is farther away", () => {
    expect(getCountdownDelay(100_000, false, now + 10_000)).toBe(50_000);
    expect(getCountdownDelay(100_000, true, now + 10_250)).toBe(750);
  });

  it("handles a date 100 days away", () => {
    expect(getCountdownSnapshot("2027-01-06T12:00:00Z", now).remaining.days).toBe(100);
  });

  it("preserves seconds within the final minute", () => {
    const result = getCountdownSnapshot("2026-09-28T12:00:59Z", now);
    expect(result.remaining).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 59 });
  });

  it("transitions exactly at zero without negative values", () => {
    const result = getCountdownSnapshot("2026-09-28T12:00:00Z", now);
    expect(result.status).toBe("elapsed");
    expect(result.remaining.totalMilliseconds).toBe(0);
  });

  it.each([null, undefined, "invalid"])("treats %s as unavailable", (date) => {
    expect(getCountdownSnapshot(date, now)).toMatchObject({ status: "unavailable", remaining: { totalMilliseconds: 0 } });
  });

  it("measures absolute time correctly across DST", () => {
    const beforeSpringForward = Date.parse("2026-03-08T06:30:00Z");
    expect(getCountdownSnapshot("2026-03-08T08:30:00Z", beforeSpringForward).remaining.hours).toBe(2);
  });
});

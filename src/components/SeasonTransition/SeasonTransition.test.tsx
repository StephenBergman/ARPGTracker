import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Countdown } from "../Countdown/Countdown";
import { CompactWidget } from "../CompactWidget/CompactWidget";
import type { GameSeasonData } from "../../features/seasons/season.types";

const season: GameSeasonData = {
  gameId: "poe", gameName: "Path of Exile",
  currentSeason: { id: "old", title: "Previous league", startDate: "2000-01-01T00:00:00Z" },
  nextSeason: { title: "New league", startDate: "2000-04-01T00:00:00Z", status: "confirmed" },
  lastUpdated: "2000-01-01T00:00:00Z",
};

describe("league launch transition", () => {
  it.each([false, true])("shows the launch state in compact=%s without asserting a live season", (compact) => {
    const markup = renderToStaticMarkup(compact
      ? <CompactWidget season={season} shortName="POE" checkingForUpdate={false} onElapsed={() => {}} />
      : <Countdown nextSeason={season.nextSeason} />);
    expect(markup).toContain("launch time");
    expect(markup).toContain("awaiting season update");
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("now live");
  });

  it("keeps an elapsed estimate tentative", () => {
    const markup = renderToStaticMarkup(<Countdown nextSeason={{ ...season.nextSeason, status: "estimated" }} />);
    expect(markup).toContain("Estimated start reached");
    expect(markup).toContain("Awaiting an official start date");
    expect(markup).not.toContain("launch time");
  });

  it("shows refresh activity during the transition", () => {
    expect(renderToStaticMarkup(<Countdown nextSeason={season.nextSeason} checkingForUpdate />)).toContain("Checking season information");
  });

  it("does not launch an unknown date even if a timestamp exists", () => {
    const markup = renderToStaticMarkup(<CompactWidget season={{ ...season, nextSeason: { ...season.nextSeason, status: "unknown" } }} shortName="POE" checkingForUpdate={false} onElapsed={() => {}} />);
    expect(markup).toContain("Next season not announced");
    expect(markup).not.toContain("launch time");
  });
});

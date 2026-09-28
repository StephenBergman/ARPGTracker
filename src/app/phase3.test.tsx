import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import bundled from "../data/default-seasons.json";
import { Countdown } from "../components/Countdown/Countdown";
import { CurrentSeason } from "../components/CurrentSeason/CurrentSeason";
import { SeasonProgress } from "../components/SeasonProgress/SeasonProgress";
import { GAME_DEFINITIONS } from "../features/seasons/game.config";
import { validateSeasonDataset } from "../features/seasons/season.schema";

const validated = validateSeasonDataset(bundled);
if (!validated.success) throw new Error(validated.errors.join("; "));
const dataset = validated.data;
const now = Date.parse("2026-09-28T12:00:00Z");

describe("Phase 3 season presentation", () => {
  it("has selector metadata for every dataset game", () => {
    expect(GAME_DEFINITIONS.map((game) => game.id)).toEqual(Object.keys(dataset.games));
  });

  it.each(GAME_DEFINITIONS)("renders $id without unsafe placeholder text", ({ id }) => {
    const season = dataset.games[id];
    const markup = renderToStaticMarkup(<><CurrentSeason season={season} now={now} /><Countdown nextSeason={season.nextSeason} /><SeasonProgress season={season} now={now} /></>);
    expect(markup).toContain(season.gameName);
    expect(markup).toContain(season.currentSeason.title.replace(/'/g, "&#x27;"));
    expect(markup).not.toMatch(/NaN|Invalid Date|undefined|-1 days/);
  });

  it("distinguishes confirmed, estimated, and unknown next-season states", () => {
    expect(renderToStaticMarkup(<Countdown nextSeason={{ title: "Confirmed test", startDate: "2099-01-01T00:00:00Z", status: "confirmed" }} />)).toContain("Confirmed");
    expect(renderToStaticMarkup(<Countdown nextSeason={{ title: "Estimated test", startDate: "2099-01-01T00:00:00Z", status: "estimated" }} />)).toContain("Estimated");
    expect(renderToStaticMarkup(<Countdown nextSeason={dataset.games.poe.nextSeason} />)).toContain("Next season has not been announced");
  });
});

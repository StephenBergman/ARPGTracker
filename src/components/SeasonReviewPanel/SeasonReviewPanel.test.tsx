import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import bundled from "../../data/default-seasons.json";
import type { SeasonDataset } from "../../features/seasons/season.types";
import type { SeasonReviewQueue } from "../../features/seasons/season-review";
import type { useSeasonReviewer } from "../../hooks/useSeasonReviewer";
import { SeasonReviewPanel } from "./SeasonReviewPanel";

const queue: SeasonReviewQueue = { schemaVersion: 1, updatedAt: "2026-10-11T00:00:00Z", reviews: [{
  id: "a".repeat(64), baseline: "b".repeat(64), evidenceHash: "c".repeat(64), gameId: "torchlightInfinite",
  headline: "Season: Tartarus", source: "https://torchlight.xd.com/", suggestedTitle: "Tartarus",
  evidence: '<script>alert("untrusted")</script>', reason: "Launch year missing", discoveredAt: "2026-10-11T00:00:00Z", status: "pending",
}] };
function reviewer(connected: boolean): ReturnType<typeof useSeasonReviewer> {
  return { enabled: true, connected, snapshot: { queue, dataset: bundled as SeasonDataset }, pending: queue.reviews, busy: false,
    error: null, notice: null, connect: vi.fn(async () => undefined), disconnect: vi.fn(async () => undefined), refresh: vi.fn(async () => undefined), submit: vi.fn(async () => undefined) };
}

describe("personal season reviews", () => {
  it("requires account connection before offering publishing controls", () => {
    const html = renderToStaticMarkup(<SeasonReviewPanel reviewer={reviewer(false)} onClose={vi.fn()} />);
    expect(html).toContain('type="password"');
    expect(html).toContain("Windows Credential Manager");
    expect(html).not.toContain("Approve &amp; publish");
    expect(html).not.toContain("Tartarus");
  });
  it("offers source review, UTC editing and explicit publishing, while escaping source text", () => {
    const html = renderToStaticMarkup(<SeasonReviewPanel reviewer={reviewer(true)} onClose={vi.fn()} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Currently published");
    expect(html).toContain("Season start (UTC)");
    expect(html).toContain("Unknown — title only");
    expect(html).toContain("Approve &amp; publish");
    expect(html).toContain("Deny");
    expect(html).not.toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

import { describe, expect, it } from "vitest";
import { formatReviewExcerpt } from "./season-review-text";

describe("review announcement text", () => {
  it("cleans Steam markup and hides image URLs", () => {
    expect(formatReviewExcerpt('[p][b]New season[/b][/p][list][*]Read [url=https://example.com]more[/url][/*][/list][img]https://example.com/image.png[/img]')).toBe("New season\n\nRead more");
  });
  it("decodes escaped HTML and entities without retaining executable content", () => {
    expect(formatReviewExcerpt('&lt;p&gt;Season &amp; news &#8217;&lt;/p&gt;<script>alert(1)</script>')).toBe("Season & news ’");
  });
  it("handles truncated tags and preserves ordinary brackets", () => {
    expect(formatReviewExcerpt('Season [2026] <span class="cut')).toBe("Season [2026]");
  });
});

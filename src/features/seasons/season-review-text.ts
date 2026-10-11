/** Convert announcement markup to display text without rendering remote HTML. */
export function formatReviewExcerpt(value: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
  let text = value;
  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
    });
  }
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi, " ")
    .replace(/\[(img|previewyoutube|video)(?:=[^\]]*)?\][\s\S]*?(?:\[\/\1\]|$)/gi, " ")
    .replace(/<\/?(?:p|div|h[1-6]|li|br|section)\b[^>]*>|\[\/?(?:p|h[1-6]|list|olist)\]|\[\*\]/gi, "\n")
    .replace(/<[^>]*(?:>|$)/g, " ")
    .replace(/\[\/?(?:b|i|u|s|strike|url|color|size|quote|code|spoiler|table|tr|td|th)(?:=[^\]]*)?\]/gi, "")
    .replace(/\[\/\*\]/g, "")
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { SeasonReview, SeasonReviewDecision } from "../../features/seasons/season-review";
import type { GameSeasonData, SeasonDateStatus } from "../../features/seasons/season.types";
import type { useSeasonReviewer } from "../../hooks/useSeasonReviewer";
import styles from "./SeasonReviewPanel.module.css";

type Reviewer = ReturnType<typeof useSeasonReviewer>;
const actionsUrl = "https://github.com/StephenBergman/ARPGTracker/actions/workflows/season-review.yml";

function ReviewForm({ review, game, busy, onSubmit, onOpenSource }: { review: SeasonReview; game: GameSeasonData; busy: boolean; onSubmit: (decision: SeasonReviewDecision) => Promise<void>; onOpenSource: (url: string) => void }) {
  const [target, setTarget] = useState<"current" | "next">("next");
  const [title, setTitle] = useState(review.suggestedTitle ?? "");
  const [status, setStatus] = useState<SeasonDateStatus>("confirmed");
  const [date, setDate] = useState("");
  const decision = (choice: "approve" | "deny"): SeasonReviewDecision => ({
    reviewId: review.id, expectedBaseline: review.baseline, decision: choice,
    target, title, status: target === "current" ? "confirmed" : status,
    startDate: status === "unknown" && target === "next" ? null : date ? `${date.length === 16 ? `${date}:00` : date}Z` : null,
  });
  const approve = (event: FormEvent) => { event.preventDefault(); void onSubmit(decision("approve")); };
  return <form onSubmit={approve}>
    <p className={styles.eyebrow}>{game.gameName}</p><h3>{review.headline}</h3>
    <p className={styles.reason}>{review.reason}</p>
    <button className={styles.link} onClick={() => onOpenSource(review.source)} type="button">Read official announcement ↗</button>
    <details><summary>Announcement excerpt</summary><p className={styles.evidence}>{review.evidence || "Open the official source to review this announcement."}</p></details>
    <div className={styles.published}><span>Currently published</span><strong>{game.currentSeason.title}</strong><small>Started {game.currentSeason.startDate}</small><small>Next: {game.nextSeason.title ?? "Unannounced"}{game.nextSeason.startDate ? ` · ${game.nextSeason.startDate} (${game.nextSeason.status})` : ""}</small></div>
    <fieldset disabled={busy}>
      <legend>Publish these details</legend>
      <label>Update<select value={target} onChange={(event) => setTarget(event.target.value as "current" | "next")}><option value="next">Next season</option><option value="current">Current season (already live)</option></select></label>
      <label>Season title<input maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      {target === "next" && <label>Date status<select value={status} onChange={(event) => setStatus(event.target.value as SeasonDateStatus)}><option value="confirmed">Confirmed</option><option value="estimated">Estimated</option><option value="unknown">Unknown — title only</option></select></label>}
      {(target === "current" || status !== "unknown") && <label>Season start (UTC)<input type="datetime-local" step="1" required value={date} onChange={(event) => setDate(event.target.value)} /><small>Enter the UTC time from the announcement. Current seasons must already have started.</small></label>}
      <p className={styles.impact}>Approval publishes these details to every client. Denial leaves the published season data unchanged.</p>
      <div className={styles.decisions}><button className={styles.deny} onClick={() => { void onSubmit(decision("deny")); }} type="button">Deny</button><button className={styles.approve} type="submit">Approve &amp; publish</button></div>
    </fieldset>
  </form>;
}

export function SeasonReviewPanel({ reviewer, onClose }: { reviewer: Reviewer; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [token, setToken] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const selected = reviewer.pending.find((review) => review.id === selectedId) ?? reviewer.pending[0];
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex='0']") ?? []).filter((control) => control.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const openSource = (url: string) => { setLinkError(null); void openUrl(url).catch(() => setLinkError(`Unable to open this link. Copy it into your browser: ${url}`)); };
  const connect = async (event: FormEvent) => { event.preventDefault(); const entered = token; setToken(""); await reviewer.connect(entered); };
  return <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="season-review-heading" data-window-drag="disabled" ref={panel} onKeyDown={keys}>
    <header><div><p className={styles.eyebrow}>Personal client</p><h2 id="season-review-heading">Season reviews</h2></div><button aria-label="Close season reviews" ref={close} onClick={onClose} type="button">×</button></header>
    {reviewer.error && <p className={styles.error} role="alert">{reviewer.error}</p>}
    {linkError && <p className={styles.error} role="alert">{linkError}</p>}
    {reviewer.notice && <p className={styles.notice} role="status">{reviewer.notice}</p>}
    {!reviewer.connected ? <form onSubmit={(event) => { void connect(event); }}>
      <p>Connect StephenBergman’s GitHub account to approve or deny ambiguous season announcements.</p>
      <p className={styles.reason}>Use a fine-grained token for ARPGTracker with Actions read/write and Contents read. The token is saved only in Windows Credential Manager.</p>
      <label>GitHub token<input type="password" autoComplete="off" spellCheck={false} required value={token} onChange={(event) => setToken(event.target.value)} /></label>
      <button className={styles.approve} disabled={reviewer.busy} type="submit">{reviewer.busy ? "Connecting…" : "Connect personal account"}</button>
    </form> : <>
      <div className={styles.toolbar}><span>{reviewer.pending.length} pending</span><button disabled={reviewer.busy} onClick={() => { void reviewer.refresh(); }} type="button">Refresh</button><button disabled={reviewer.busy} onClick={() => { void reviewer.disconnect(); }} type="button">Disconnect</button></div>
      {reviewer.pending.length > 1 && <label>Announcement<select value={selected?.id ?? ""} disabled={reviewer.busy} onChange={(event) => setSelectedId(event.target.value)}>{reviewer.pending.map((review) => <option value={review.id} key={review.id}>{reviewer.snapshot?.dataset.games[review.gameId].gameName}: {review.headline}</option>)}</select></label>}
      {selected && reviewer.snapshot ? <ReviewForm key={selected.id} review={selected} game={reviewer.snapshot.dataset.games[selected.gameId]} busy={reviewer.busy} onSubmit={reviewer.submit} onOpenSource={openSource} /> : <p>{reviewer.busy ? "Loading reviews…" : "No announcements need your review. Verified season updates continue automatically."}</p>}
      <button className={styles.link} onClick={() => openSource(actionsUrl)} type="button">View publishing activity on GitHub ↗</button>
    </>}
  </section>;
}

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateReviewDecision, validateReviewQueue, type SeasonReviewDecision, type SeasonReviewQueue } from "../features/seasons/season-review";
import { validateSeasonDataset } from "../features/seasons/season.schema";
import type { SeasonDataset } from "../features/seasons/season.types";

interface Snapshot { queue: SeasonReviewQueue; dataset: SeasonDataset; }
interface Submission { reviewId: string; decision: "approve" | "deny"; runId?: number; startedAt: number; }
const message = (error: unknown): string => error instanceof Error ? error.message : typeof error === "string" ? error : "Unable to reach the season review service";

export function useSeasonReviewer(onPending: () => void, onPublished: () => void) {
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const seen = useRef(new Set<string>());
  const callbacks = useRef({ onPending, onPublished });
  callbacks.current = { onPending, onPublished };

  useEffect(() => {
    let active = true;
    void invoke<{ enabled: boolean; connected: boolean }>("reviewer_status").then((status) => {
      if (active) { setEnabled(status.enabled); setConnected(status.enabled && status.connected); }
    }).catch(() => { /* Public browser previews have no reviewer functionality. */ });
    return () => { active = false; };
  }, []);

  const load = useCallback(async (): Promise<Snapshot> => {
    const value = await invoke<{ queue: unknown; dataset: unknown }>("reviewer_load");
    const dataset = validateSeasonDataset(value.dataset);
    if (!validateReviewQueue(value.queue) || !dataset.success) throw new Error("Review data is invalid; existing season information was preserved");
    const result = { queue: value.queue, dataset: dataset.data };
    setSnapshot(result);
    return result;
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true); setError(null);
    try { await load(); } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }, [load]);

  useEffect(() => {
    if (!enabled || !connected) return;
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [enabled, connected, refresh]);

  useEffect(() => {
    if (!connected || !snapshot) return;
    const fresh = snapshot.queue.reviews.filter((review) => review.status === "pending" && !seen.current.has(review.id));
    if (!fresh.length) return;
    for (const review of fresh) seen.current.add(review.id);
    callbacks.current.onPending();
  }, [connected, snapshot]);

  const connect = async (token: string) => {
    setBusy(true); setError(null);
    try { await invoke("reviewer_connect", { token }); setConnected(true); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError(null);
    try { await invoke("reviewer_disconnect"); setConnected(false); setSnapshot(null); setNotice(null); seen.current.clear(); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  const submit = async (decision: SeasonReviewDecision) => {
    if (submission || busy) return;
    if (!validateReviewDecision(decision)) { setError("Enter a season title and a valid UTC launch time before approving"); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await invoke<{ workflow_run_id?: number }>("reviewer_submit", { decision });
      setSubmission({ reviewId: decision.reviewId, decision: decision.decision, runId: result.workflow_run_id, startedAt: Date.now() });
      setNotice("Decision submitted. Waiting for GitHub to validate and publish it…");
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!submission) return;
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const result = await load();
        if (!active) return;
        const review = result.queue.reviews.find((item) => item.id === submission.reviewId);
        const expected = submission.decision === "approve" ? "approved" : "denied";
        if (review?.status === expected) {
          setSubmission(null);
          setNotice(expected === "approved" ? "Approved and published. Other clients will receive it on their next data refresh." : "Denied. This announcement will not be offered again unless its evidence changes.");
          if (expected === "approved") callbacks.current.onPublished();
          return;
        }
        if (review && review.status !== "pending") throw new Error("This proposal changed before your decision was published. Refresh and review the latest information.");
        if (submission.runId) {
          const run = await invoke<{ status: string; conclusion: string | null }>("reviewer_run_status", { runId: submission.runId });
          if (!active) return;
          if (run.status === "completed" && run.conclusion !== "success") throw new Error("GitHub could not publish this decision. Check the review workflow for a stale proposal, failed validation, or branch protection.");
        }
        if (Date.now() - submission.startedAt > 180_000) throw new Error("Publication has not been confirmed yet. Check GitHub Actions, then refresh this queue before retrying.");
        timer = window.setTimeout(() => { void poll(); }, 5_000);
      } catch (failure) {
        if (active) { setError(message(failure)); setNotice(null); setSubmission(null); }
      }
    };
    timer = window.setTimeout(() => { void poll(); }, 5_000);
    return () => { active = false; if (timer !== undefined) window.clearTimeout(timer); };
  }, [submission, load]);

  return { enabled, connected, snapshot, pending: snapshot?.queue.reviews.filter((review) => review.status === "pending") ?? [], busy: busy || submission !== null, error, notice, connect, disconnect, refresh, submit };
}

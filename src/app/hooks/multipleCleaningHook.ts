import { useState, useCallback, useRef } from "react";
import {
  CleanResult,
  FileMeta,
  FileReportItem,
  FormatDetectionItem,
  ProgressLog,
  Snapshot,
  StreamError,
  StreamStatus,
} from "../types/multipleCleaning";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface CleaningStreamState {
  status: StreamStatus;
  logs: ProgressLog[];
  formatDetection: FormatDetectionItem[];
  fileReports: FileReportItem[];
  snapshotBefore: Snapshot | null;
  snapshotAfter: Snapshot | null;
  result: CleanResult | null;
  error: StreamError | null;
}

const INITIAL_STATE: CleaningStreamState = {
  status: "idle",
  logs: [],
  formatDetection: [],
  fileReports: [],
  snapshotBefore: null,
  snapshotAfter: null,
  result: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCleaningStream() {
  const [state, setState] = useState<CleaningStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // ── start ─────────────────────────────────────────────────────────────────
  const start = useCallback(async (files: File[], filesMeta: FileMeta[]) => {

    // Abort any in-flight request and reset state
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, status: "streaming" });

    // Build multipart form: all files under the "files" key + JSON metadata
    const body = new FormData();
    for (const file of files) {
      body.append("files", file);
    }
    body.append("files_meta", JSON.stringify(filesMeta));

    // ── Fetch ──────────────────────────────────────────────────────────────
    let response: Response;
    try {
      response = await fetch("/api/v2/cleaning", {
        method: "POST",
        body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState((p) => ({
        ...p,
        status: "error",
        error: { detail: "Network error — could not reach the server.", status_code: 0 },
      }));
      return;
    }

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => response.statusText);
      setState((p) => ({
        ...p,
        status: "error",
        error: { detail: text, status_code: response.status },
      }));
      return;
    }

    // ── SSE stream ─────────────────────────────────────────────────────────
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    const processFrame = (event: string, data: string) => {
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        switch (event || "message") {

          case "progress":
            setState((p) => ({ ...p, logs: [...p.logs, parsed as ProgressLog] }));
            break;

          // ── New multi-file events ────────────────────────────────────────
          case "format_detection":
            setState((p) => ({
              ...p,
              formatDetection: (parsed as { files: FormatDetectionItem[] }).files,
            }));
            break;

          case "file_report":
            setState((p) => ({
              ...p,
              fileReports: (parsed as { files: FileReportItem[] }).files,
            }));
            break;

          // ── Existing snapshot events ─────────────────────────────────────
          case "snapshot_before":
            setState((p) => ({ ...p, snapshotBefore: parsed as Snapshot }));
            break;

          case "snapshot_after":
            setState((p) => ({ ...p, snapshotAfter: parsed as Snapshot }));
            break;

          case "result":
            setState((p) => ({ ...p, status: "done", result: parsed as CleanResult }));
            break;

          case "error":
            setState((p) => ({ ...p, status: "error", error: parsed as StreamError }));
            break;

          // "heartbeat" comment frames (": heartbeat") fall through silently
        }
      } catch { /* malformed frame — ignore */ }
    };

    // ── Read loop ──────────────────────────────────────────────────────────
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newlines
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";   // keep the incomplete trailing frame

        for (const frame of frames) {
          let currentEvent = "";
          let currentData  = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:"))      currentEvent = line.slice(6).trim();
            else if (line.startsWith("data:"))  currentData  = line.slice(5).trim();
            // lines starting with ":" are heartbeat comments — skip
          }
          processFrame(currentEvent, currentData);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setState((p) => ({
          ...p,
          status: "error",
          error: { detail: "Stream was interrupted unexpectedly.", status_code: 0 },
        }));
      }
    }
  }, []);

  // ── cancel ────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((p) => ({ ...p, status: "idle" }));
  }, []);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, start, cancel, reset };
}
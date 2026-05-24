import { useState, useCallback, useRef } from "react";
import { CleanResult, Snapshot, StreamError, StreamStatus } from "../types/cleaning";
import { DataPreprocessingMetrics, PreprocessResult } from "../types/preprocessing";



export interface PreprocessStreamState {
  status: StreamStatus; // TO RELOCATE: generic instead of type cleaning
  logs: ProgressEvent[];
  metrics: DataPreprocessingMetrics | null;  
  result: PreprocessResult | null;
  error: StreamError | null;   // TO RELOCATE: generic instead of type cleaning
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePreprocessStream() {
  const [state, setState] = useState<PreprocessStreamState>({
    status: "idle",
    logs: [],
    metrics: null,
    result: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    
    // RESPONSE INITIALIZE
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState( prev => ({ ...prev, status: "streaming" }));

    const body = new FormData();

    let response: Response;
    try {
      response = await fetch("api/v2/preprocessing", { method: "POST", body, signal: controller.signal });

    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState((p) => ({ ...p, status: "error", error: { detail: "Network error — could not reach the server.", status_code: 0 } }));
      return;
    }

    // RESPONSE BAD
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => response.statusText);
      setState((p) => ({ ...p, status: "error", error: { detail: text, status_code: response.status } }));
      return;
    }

    // RESPONSE STREAM
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processFrame = (event: string, data: string) => {
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        switch (event || "message") {
          case "progress":
            setState((p) => ({ ...p, logs: [...p.logs, parsed as ProgressEvent] }));
            break;
          case "metrics":
            setState((p) => ({ ...p, metrics: parsed as DataPreprocessingMetrics }));
            break;
          case "result":
            setState((p) => ({ ...p, status: "done", result: parsed as PreprocessResult }));
            break;
          case "error":
            setState((p) => ({ ...p, status: "error", error: parsed as StreamError }));
            break;
        }
      } catch { /* heartbeat comment or malformed frame — ignore */ }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          let currentEvent = "";
          let currentData = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) currentEvent = line.slice(6).trim();
            else if (line.startsWith("data:")) currentData = line.slice(5).trim();
            // lines starting with ":" are heartbeat comments — skip
          }
          processFrame(currentEvent, currentData);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setState((p) => ({ ...p, status: "error", error: { detail: "Stream was interrupted unexpectedly.", status_code: 0 } }));
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((p) => ({ ...p, status: "idle" }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle", logs: [], metrics: null, result: null, error: null });
  }, []);

  return { ...state, start, cancel, reset };
}
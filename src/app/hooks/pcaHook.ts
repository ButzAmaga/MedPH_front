import { useState, useCallback, useRef } from "react";
import { StreamError, StreamStatus } from "../types/cleaning";
import { DiagnosticsEvent, PCAProcessResponse } from "../types/pca";



export interface PreprocessStreamState {
  status: StreamStatus; // TO RELOCATE: generic instead of type cleaning
  logs: ProgressEvent[];
  diagnostics: DiagnosticsEvent | null;
  result: PCAProcessResponse | null;
  error: StreamError | null;   // TO RELOCATE: generic instead of type cleaning
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePCAStream() {
  const [state, setState] = useState<PreprocessStreamState>({
    status: "idle",
    logs: [],
    diagnostics: null,
    result: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (selected_column: string[]) => {

    // RESPONSE INITIALIZE
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, status: "streaming" }));

    const body = new FormData();
    // Use forEach for actions/side-effects
    selected_column.forEach(val => body.append("selected_cols", val));

    for (let [key, value] of body.entries()) {
      console.log(`${key}: ${value}`);
    }

    let response: Response;
    try {
      response = await fetch("api/v2/pca", { method: "POST", body, signal: controller.signal });

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
          case "diagnostics":
            setState((p) => ({ ...p, diagnostics: parsed as DiagnosticsEvent }));
            console.log("diagnostics:", parsed)
            break;
          case "result":
            setState((p) => ({ ...p, status: "done", result: parsed as PCAProcessResponse }));
            console.log("result:", parsed)
            break;
          case "error":
            setState((p) => ({ ...p, status: "error", error: parsed as StreamError }));
            console.log("error:", parsed)
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
        console.log(err);
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
    setState({ status: "idle", logs: [], diagnostics: null, result: null, error: null });
  }, []);

  return { ...state, start, cancel, reset };
}
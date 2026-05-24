"use client";

import { useState, useRef } from "react";
import { useCleaningStream } from "@/app/hooks/cleaningHook"
import { CleanResult } from "../types/cleaning";

// ---------------------------------------------------------------------------
// Pipeline step definitions — order must match backend step numbers
// ---------------------------------------------------------------------------
const PIPELINE_STEPS = [
  { step: 1, label: "Load DataFrame" },
  { step: 2, label: "Pre-clean Snapshot" },
  { step: 3, label: "Clean Pipeline" },
  { step: 4, label: "Post-clean Snapshot" },
  { step: 5, label: "Preparing for Download" },
  { step: 6, label: "Complete" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PipelineSteps({ currentStep, status }: { currentStep: number; status: string }) {
  return (
    <ul className="steps steps-vertical w-full">
      {PIPELINE_STEPS.map(({ step, label }) => {
        const isDone = currentStep > step || status === "done";
        const isActive = currentStep === step && status === "streaming";
        const isError = status === "error" && currentStep === step;

        return (
          <li
            key={step}
            className={`step transition-all duration-300
              ${isDone ? "step-success" : ""}
              ${isActive ? "step-primary" : ""}
              ${isError ? "step-error" : ""}
            `}
          >
            <span className="flex items-center gap-2 text-sm font-mono">
              {isActive && (
                <span className="loading loading-spinner loading-xs text-primary" />
              )}
              <span className={isDone ? "text-success" : isActive ? "text-primary" : "text-base-content/40"}>
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SnapshotTable({
  label,
  snapshot,
}: {
  label: string;
  snapshot: { total_rows: number; total_columns: number; sample_preview: Record<string, unknown>[] } | null;
}) {
  if (!snapshot) return null;
  return (
    <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
      <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">{label}</p>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr className="text-xs font-mono text-base-content/40">
              <th>Total Rows</th>
              <th>Total Columns</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-base-content/5">
              <td className="font-mono font-semibold text-sm">{snapshot.total_rows.toLocaleString()}</td>
              <td className="font-mono font-semibold text-sm">{snapshot.total_columns}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {snapshot.sample_preview?.[0] && (
        <>
          <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mt-4 mb-2">Columns</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(snapshot.sample_preview[0]).map((key) => (
              <div key={key} className="badge badge-sm font-mono badge-neutral hover:badge-primary transition-colors">
                {key}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResultSummary({ result, onReset }: { result: CleanResult; onReset: () => void }) {
  const rowDiff = result.before_processing.total_rows - result.after_processing.total_rows;
  const pct = ((rowDiff / result.before_processing.total_rows) * 100).toFixed(1);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Success alert */}
      <div role="alert" className="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold font-mono text-sm">Cleaning complete — {result.filename}</p>
          <p className="text-xs opacity-80 font-mono">
            {rowDiff.toLocaleString()} rows removed ({pct}%) · {result.after_processing.total_rows.toLocaleString()} rows retained
          </p>
        </div>
      </div>

      {/* Stats diff */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat bg-base-200 rounded-2xl border border-base-content/10 p-4">
          <div className="stat-title font-mono text-xs">Before</div>
          <div className="stat-value text-2xl">{result.before_processing.total_rows.toLocaleString()}</div>
          <div className="stat-desc font-mono">rows · {result.before_processing.total_columns} cols</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl border border-success/20 p-4">
          <div className="stat-title font-mono text-xs text-success">After</div>
          <div className="stat-value text-2xl text-success">{result.after_processing.total_rows.toLocaleString()}</div>
          <div className="stat-desc font-mono">{result.after_processing.total_columns} cols retained</div>
        </div>
      </div>

      <SnapshotTable label="Before Cleaning" snapshot={result.before_processing} />
      <SnapshotTable label="After Cleaning" snapshot={result.after_processing} />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <a
          href="/api/v2/cleaning/download"
          className="btn btn-primary btn-sm font-mono tracking-wider"
          download
        >
          ↓ Download cleaned CSV
        </a>
        <button
          className="btn btn-ghost btn-sm font-mono text-xs opacity-50 hover:opacity-100"
          onClick={onReset}
        >
          ↺ Upload new file
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DataCleaningSection({
  onCleaningComplete,
}: {
  onCleaningComplete: (data: CleanResult | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { status, logs, snapshotBefore, snapshotAfter, result, error, start, cancel, reset } =
    useCleaningStream();

  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isError = status === "error";

  // Current step is the last step number seen in logs
  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
  // Last progress message
  const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    const valid = [".csv", ".xls", ".xlsx"].some((ext) => f.name.endsWith(ext));
    if (!valid) {
      setFileError("Please upload a valid .csv, .xls, or .xlsx file.");
      return;
    }
    setFileError(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Start stream ───────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) return;
    await start(file);
  };

  // ── Reset everything ───────────────────────────────────────────────────────

  const handleReset = () => {
    reset();
    setFile(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
    onCleaningComplete(null);
  };

  // Propagate result up when done
  if (isDone && result) {
    onCleaningComplete(result);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="relative w-full">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-primary text-primary">
            STEP 01
          </div>
          <div className="h-px flex-1 bg-linear-to-r from-primary/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mt-4">Data Ingestion &amp; Cleaning</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">Upload dataset</p>
      </div>

      {/* ── Upload zone (hidden once streaming or done) ── */}
      {!isStreaming && !isDone && (
        <>
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
              ${dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-base-content/20 hover:border-primary/60 hover:bg-base-content/5"}
              ${file ? "border-success/60 bg-success/5" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
                ${file ? "bg-success/20 text-success" : "bg-base-content/10 text-base-content/40 group-hover:bg-primary/20 group-hover:text-primary"}`}>
                {file ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>

              {file ? (
                <div>
                  <p className="font-semibold text-success">{file.name}</p>
                  <p className="text-sm text-base-content/40 font-mono mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-base-content/70">Drop your CSV here</p>
                  <p className="text-sm text-base-content/40 mt-1">or click to browse files</p>
                </div>
              )}
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 rounded-2xl opacity-5 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          </div>

          {/* File validation error */}
          {fileError && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{fileError}</span>
            </div>
          )}

          {file && (
            <button
              className="btn btn-primary w-full mt-4 font-mono tracking-wider"
              onClick={handleAnalyze}
            >
              → Run Data Quality Audit
            </button>
          )}
        </>
      )}

      {/* ── Live pipeline steps (shown while streaming) ── */}
      {isStreaming && (
        <div className="mt-2 space-y-6 animate-in fade-in duration-300">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-base-200 rounded-xl border border-base-content/10">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{file?.name}</p>
              <p className="text-xs text-base-content/40 font-mono">{file ? (file.size / 1024).toFixed(1) : 0} KB</p>
            </div>
            <button className="btn btn-ghost btn-xs font-mono text-error" onClick={cancel}>
              Cancel
            </button>
          </div>

          {/* DaisyUI vertical steps */}
          <PipelineSteps currentStep={currentStep} status={status} />

          {/* Live message ticker */}
          {lastMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 border border-base-content/10">
              <span className="loading loading-dots loading-xs text-primary" />
              <p className="text-xs font-mono text-base-content/60 truncate">{lastMessage}</p>
            </div>
          )}

          {/* Snapshots stream in as they arrive */}
          {snapshotBefore && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              <SnapshotTable label="Before Cleaning" snapshot={snapshotBefore} />
            </div>
          )}
          {snapshotAfter && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              <SnapshotTable label="After Cleaning" snapshot={snapshotAfter} />
            </div>
          )}
        </div>
      )}

      {/* ── Stream error ── */}
      {isError && error && (
        <div className="mt-4 space-y-3 animate-in fade-in duration-300">
          {/* Show steps up to where it failed */}
          <PipelineSteps currentStep={currentStep} status={status} />

          <div role="alert" className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold font-mono text-sm">Error {error.status_code || ""}</p>
              <p className="text-xs opacity-80">{error.detail}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm font-mono text-xs opacity-50 hover:opacity-100" onClick={handleReset}>
            ↺ Try again
          </button>
        </div>
      )}

      {/* ── Final result ── */}
      {isDone && result && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-500">
          {/* Completed steps */}
          <PipelineSteps currentStep={6} status="done" />
          <ResultSummary result={result} onReset={handleReset} />
        </div>
      )}
    </section>
  );
}
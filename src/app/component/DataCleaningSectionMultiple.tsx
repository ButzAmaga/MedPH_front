"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCleaningStream } from "@/app/hooks/multipleCleaningHook";
import { CleanResult } from "../types/cleaning";
import { PipelineSteps } from "./Pipeline";

// ---------------------------------------------------------------------------
// Pipeline step definitions — matches backend steps 1-9
// ---------------------------------------------------------------------------
const PIPELINE_STEPS = [
  { step: 1, label: "Format Detection" },
  { step: 2, label: "Parse & Merge Files" },
  { step: 3, label: "Pre-clean Snapshot" },
  { step: 4, label: "Normalize Columns" },
  { step: 5, label: "Filter Medical Rows" },
  { step: 6, label: "Deduplicate" },
  { step: 7, label: "Impute & Post-snapshot" },
  { step: 8, label: "Save to Disk" },
  { step: 9, label: "Complete" },
];

// ---------------------------------------------------------------------------
// Per-file 2022-override toggle values
// ---------------------------------------------------------------------------
type FormatOverride = "auto" | "2022" | "standard";

interface FileEntry {
  file: File;
  override: FormatOverride;
}

// ---------------------------------------------------------------------------
// SSE payload shapes (subset of what the backend sends)
// ---------------------------------------------------------------------------
interface FormatDetectionItem {
  filename: string;
  is_2022: boolean;
  method: string;
  confidence: "high" | "medium" | "low";
  detail: string;
}

interface FileReportItem {
  filename: string;
  is_2022: boolean;
  method: string;
  confidence: string;
  row_count: number;
  column_count: number;
  parse_error: string | null;
}

// ---------------------------------------------------------------------------
// Helper: confidence pill colour
// ---------------------------------------------------------------------------
function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls =
    confidence === "high"
      ? "badge-success"
      : confidence === "medium"
      ? "badge-warning"
      : "badge-error";
  return (
    <span className={`badge badge-xs font-mono ${cls}`}>
      {confidence}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Format detection table (shown during / after Step 1)
// ---------------------------------------------------------------------------
function FormatDetectionTable({ items }: { items: FormatDetectionItem[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-base-200 rounded-2xl p-4 border border-base-content/10 animate-in slide-in-from-bottom-2 duration-300">
      <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">
        Format Detection
      </p>
      <div className="overflow-x-auto">
        <table className="table table-xs font-mono">
          <thead>
            <tr className="text-base-content/40">
              <th>File</th>
              <th>2022 Style?</th>
              <th>Method</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.filename} className="hover:bg-base-content/5">
                <td className="max-w-[180px] truncate" title={item.filename}>
                  {item.filename}
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      item.is_2022 ? "badge-warning" : "badge-neutral"
                    }`}
                  >
                    {item.is_2022 ? "headerless" : "headered"}
                  </span>
                </td>
                <td className="text-base-content/50">{item.method}</td>
                <td>
                  <ConfidenceBadge confidence={item.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File report table (shown after Step 2)
// ---------------------------------------------------------------------------
function FileReportTable({ items }: { items: FileReportItem[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-base-200 rounded-2xl p-4 border border-base-content/10 animate-in slide-in-from-bottom-2 duration-300">
      <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">
        Parse Report
      </p>
      <div className="overflow-x-auto">
        <table className="table table-xs font-mono">
          <thead>
            <tr className="text-base-content/40">
              <th>File</th>
              <th>Rows</th>
              <th>Cols</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.filename} className="hover:bg-base-content/5">
                <td className="max-w-[180px] truncate" title={item.filename}>
                  {item.filename}
                </td>
                <td>{item.row_count.toLocaleString()}</td>
                <td>{item.column_count}</td>
                <td>
                  {item.parse_error ? (
                    <span className="badge badge-xs badge-error font-mono" title={item.parse_error}>
                      error
                    </span>
                  ) : (
                    <span className="badge badge-xs badge-success font-mono">ok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Snapshot table (before / after)
// ---------------------------------------------------------------------------
function SnapshotTable({
  label,
  snapshot,
}: {
  label: string;
  snapshot: {
    total_rows: number;
    total_columns: number;
    sample_preview: Record<string, unknown>[];
  } | null;
}) {
  if (!snapshot) return null;
  return (
    <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
      <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">
        {label}
      </p>
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
              <td className="font-mono font-semibold text-sm">
                {snapshot.total_rows.toLocaleString()}
              </td>
              <td className="font-mono font-semibold text-sm">
                {snapshot.total_columns}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {snapshot.sample_preview?.[0] && (
        <>
          <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mt-4 mb-2">
            Columns
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(snapshot.sample_preview[0]).map((key) => (
              <div
                key={key}
                className="badge badge-sm font-mono badge-neutral hover:badge-primary transition-colors"
              >
                {key}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result summary (shown when done)
// ---------------------------------------------------------------------------
function ResultSummary({
  result,
  fileReports,
  onReset,
}: {
  result: CleanResult;
  fileReports: FileReportItem[];
  onReset: () => void;
}) {
  const rowDiff =
    result.before_processing.total_rows - result.after_processing.total_rows;
  const pct = (
    (rowDiff / result.before_processing.total_rows) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Success alert */}
      <div role="alert" className="alert alert-success">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="font-semibold font-mono text-sm">
            Cleaning complete —{" "}
            {result.files_submitted ?? 1} file
            {(result.files_submitted ?? 1) > 1 ? "s" : ""} processed
          </p>
          <p className="text-xs opacity-80 font-mono">
            {rowDiff.toLocaleString()} rows removed ({pct}%) ·{" "}
            {result.after_processing.total_rows.toLocaleString()} rows retained
          </p>
        </div>
      </div>

      {/* Stats diff */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat bg-base-200 rounded-2xl border border-base-content/10 p-4">
          <div className="stat-title font-mono text-xs">Before</div>
          <div className="stat-value text-2xl">
            {result.before_processing.total_rows.toLocaleString()}
          </div>
          <div className="stat-desc font-mono">
            rows · {result.before_processing.total_columns} cols
          </div>
        </div>
        <div className="stat bg-base-200 rounded-2xl border border-success/20 p-4">
          <div className="stat-title font-mono text-xs text-success">After</div>
          <div className="stat-value text-2xl text-success">
            {result.after_processing.total_rows.toLocaleString()}
          </div>
          <div className="stat-desc font-mono">
            {result.after_processing.total_columns} cols retained
          </div>
        </div>
      </div>

      {/* Per-file parse report */}
      {fileReports.length > 0 && <FileReportTable items={fileReports} />}

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
          ↺ Upload new files
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Override toggle — per-file 2022 format control
// ---------------------------------------------------------------------------
function OverrideToggle({
  value,
  onChange,
}: {
  value: FormatOverride;
  onChange: (v: FormatOverride) => void;
}) {
  const options: { value: FormatOverride; label: string; title: string }[] = [
    { value: "auto", label: "Auto", title: "Auto-detect format from file content" },
    { value: "2022", label: "2022", title: "Force headerless 2022 PhilGEPS format" },
    { value: "standard", label: "Std", title: "Force standard headered format" },
  ];
  return (
    <div className="join" title="Format override">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
          className={`join-item btn btn-xs font-mono ${
            value === opt.value
              ? opt.value === "2022"
                ? "btn-warning"
                : opt.value === "standard"
                ? "btn-info"
                : "btn-neutral"
              : "btn-ghost opacity-40"
          }`}
        >
          {opt.label}
        </button>
      ))}
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
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formatDetection, setFormatDetection] = useState<FormatDetectionItem[]>([]);
  const [fileReports, setFileReports] = useState<FileReportItem[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const {
    status,
    logs,
    snapshotBefore,
    snapshotAfter,
    result,
    error,
    start,
    cancel,
    reset,
    on, // SSE event subscription — see note below
  } = useCleaningStream();

  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isError = status === "error";

  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
  const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

  // ── Subscribe to new SSE event types ──────────────────────────────────────
  // NOTE: `on` is an optional escape-hatch expected on the hook. If your hook
  // doesn't expose it yet, wire these two event types in the hook itself and
  // expose them as `formatDetection` and `fileReports` state, mirroring how
  // `snapshotBefore` / `snapshotAfter` are handled.
  useEffect(() => {
    if (!on) return;
    const unsubDetect = on("format_detection", (payload: { files: FormatDetectionItem[] }) => {
      setFormatDetection(payload.files);
    });
    const unsubReport = on("file_report", (payload: { files: FileReportItem[] }) => {
      setFileReports(payload.files);
    });
    return () => {
      unsubDetect?.();
      unsubReport?.();
    };
  }, [on]);

  // ── File validation ────────────────────────────────────────────────────────
  const VALID_EXTS = [".csv", ".xls", ".xlsx"];

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const invalid = arr.filter(
      (f) => !VALID_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalid.length) {
      setFileError(
        `Unsupported file(s): ${invalid.map((f) => f.name).join(", ")}. Only .csv, .xls, .xlsx are accepted.`
      );
      return;
    }
    setFileError(null);
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      const fresh = arr
        .filter((f) => !existing.has(f.name))
        .map((f) => ({ file: f, override: "auto" as FormatOverride }));
      return [...prev, ...fresh];
    });
  }, []);

  const removeEntry = (name: string) =>
    setEntries((prev) => prev.filter((e) => e.file.name !== name));

  const setOverride = (name: string, override: FormatOverride) =>
    setEntries((prev) =>
      prev.map((e) => (e.file.name === name ? { ...e, override } : e))
    );

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Start stream ───────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!entries.length) return;
    setFormatDetection([]);
    setFileReports([]);

    // Build files_meta JSON for per-file overrides
    const filesMeta = entries.map((e) => ({
      filename: e.file.name,
      is_2022:
        e.override === "auto" ? null : e.override === "2022" ? true : false,
    }));

    // `start` must accept (files: File[], filesMeta: object[])
    // Update your cleaningHook accordingly — see hook update note.
    await start(
      entries.map((e) => e.file),
      filesMeta
    );
  };

  // ── Reset everything ───────────────────────────────────────────────────────
  const handleReset = () => {
    reset();
    setEntries([]);
    setFileError(null);
    setFormatDetection([]);
    setFileReports([]);
    if (fileRef.current) fileRef.current.value = "";
    onCleaningComplete(null);
  };

  useEffect(() => {
    if (isDone && result) {
      onCleaningComplete(result);
    }
  }, [result]);

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
        <h2 className="text-3xl font-bold tracking-tight mt-4">
          Data Ingestion &amp; Cleaning
        </h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Upload one or more procurement datasets
        </p>
      </div>

      {/* ── Upload zone (hidden once streaming or done) ── */}
      {!isStreaming && !isDone && (
        <>
          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group
              ${dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-base-content/20 hover:border-primary/60 hover:bg-base-content/5"}
              ${entries.length > 0 ? "border-primary/40 bg-primary/5" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />

            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                  ${entries.length > 0
                    ? "bg-primary/20 text-primary"
                    : "bg-base-content/10 text-base-content/40 group-hover:bg-primary/20 group-hover:text-primary"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-base-content/70">
                  {entries.length > 0 ? "Drop more files to add" : "Drop CSV or Excel files here"}
                </p>
                <p className="text-sm text-base-content/40 mt-1">
                  or click to browse · multiple files supported
                </p>
              </div>
            </div>

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 rounded-2xl opacity-5 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* File validation error */}
          {fileError && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-mono">{fileError}</span>
            </div>
          )}

          {/* ── File list ── */}
          {entries.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-2">
                {entries.length} file{entries.length > 1 ? "s" : ""} queued
              </p>

              {entries.map((entry) => (
                <div
                  key={entry.file.name}
                  className="flex items-center gap-3 px-4 py-3 bg-base-200 rounded-xl border border-base-content/10 group"
                >
                  {/* File icon */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" title={entry.file.name}>
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-base-content/40 font-mono">
                      {(entry.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* Per-file format override */}
                  <OverrideToggle
                    value={entry.override}
                    onChange={(v) => setOverride(entry.file.name, v)}
                  />

                  {/* Remove */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeEntry(entry.file.name)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Legend */}
              <p className="text-xs font-mono text-base-content/30 pt-1">
                Format override per file: <span className="text-base-content/50">Auto</span> = detect from content ·{" "}
                <span className="text-warning">2022</span> = headerless PhilGEPS export ·{" "}
                <span className="text-info">Std</span> = force headered
              </p>
            </div>
          )}

          {/* Run button */}
          {entries.length > 0 && (
            <button
              className="btn btn-primary w-full mt-5 font-mono tracking-wider"
              onClick={handleAnalyze}
            >
              → Run Data Quality Audit
              {entries.length > 1 && (
                <span className="badge badge-primary-content badge-sm ml-2 font-mono">
                  {entries.length} files
                </span>
              )}
            </button>
          )}
        </>
      )}

      {/* ── Live pipeline (shown while streaming) ── */}
      {isStreaming && (
        <div className="mt-2 space-y-5 animate-in fade-in duration-300">

          {/* Files summary bar */}
          <div className="flex items-center gap-3 p-3 bg-base-200 rounded-xl border border-base-content/10">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                Processing {entries.length} file{entries.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-base-content/40 font-mono truncate">
                {entries.map((e) => e.file.name).join(" · ")}
              </p>
            </div>
            <button className="btn btn-ghost btn-xs font-mono text-error" onClick={cancel}>
              Cancel
            </button>
          </div>

          {/* Pipeline steps */}
          <PipelineSteps currentStep={currentStep} status={status} pipeline={PIPELINE_STEPS} />

          {/* Live message ticker */}
          {lastMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 border border-base-content/10">
              <span className="loading loading-dots loading-xs text-primary" />
              <p className="text-xs font-mono text-base-content/60 truncate">{lastMessage}</p>
            </div>
          )}

          {/* Format detection table streams in at Step 1 */}
          {formatDetection.length > 0 && (
            <FormatDetectionTable items={formatDetection} />
          )}

          {/* File report streams in at Step 2 */}
          {fileReports.length > 0 && (
            <FileReportTable items={fileReports} />
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
          <PipelineSteps currentStep={currentStep} status={status} pipeline={PIPELINE_STEPS} />

          {/* File report if it arrived before the error */}
          {fileReports.length > 0 && <FileReportTable items={fileReports} />}

          <div role="alert" className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold font-mono text-sm">Error {error.status_code || ""}</p>
              <p className="text-xs opacity-80">{error.detail}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm font-mono text-xs opacity-50 hover:opacity-100"
            onClick={handleReset}
          >
            ↺ Try again
          </button>
        </div>
      )}

      {/* ── Final result ── */}
      {isDone && result && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-500">
          <PipelineSteps currentStep={9} status="done" pipeline={PIPELINE_STEPS} />
          <ResultSummary result={result} fileReports={fileReports} onReset={handleReset} />
        </div>
      )}
    </section>
  );
}
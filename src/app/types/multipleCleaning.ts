// ---------------------------------------------------------------------------
// Shared primitive
// ---------------------------------------------------------------------------

type GenericObject = Record<string, string | number | boolean | null>;

// ---------------------------------------------------------------------------
// Snapshot (before / after cleaning)
// ---------------------------------------------------------------------------

export interface Snapshot {
  total_rows: number;
  total_columns: number;
  sample_preview: GenericObject[];
}

// ---------------------------------------------------------------------------
// SSE event payloads
// ---------------------------------------------------------------------------

/** One entry in the `format_detection` SSE event. */
export interface FormatDetectionItem {
  filename: string;
  /** true = headerless 2022 PhilGEPS export; false = standard headered file. */
  is_2022: boolean;
  /** How the decision was reached (e.g. 'auto_header', 'auto_col_count', 'override_true'). */
  method: string;
  /** Reliability of the auto-detection. */
  confidence: "high" | "medium" | "low";
  /** Human-readable explanation of the decision. */
  detail: string;
}

/** One entry in the `file_report` SSE event (extends detection with parse outcome). */
export interface FileReportItem extends FormatDetectionItem {
  row_count: number;
  column_count: number;
  /** null when the file parsed successfully; error message string on failure. */
  parse_error: string | null;
}

/** Shape of one entry in the `files_meta` FormData field sent to the backend. */
export interface FileMeta {
  filename: string;
  /**
   * - true  → force 2022-style (headerless) parsing
   * - false → force standard headered parsing
   * - null  → auto-detect from file content
   */
  is_2022: boolean | null;
}

// ---------------------------------------------------------------------------
// Progress log entry  (the `progress` SSE event)
// ---------------------------------------------------------------------------

export interface ProgressLog {
  step: number;
  total: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Final result  (the `result` SSE event)
// ---------------------------------------------------------------------------

export interface CleanResult {
  files_submitted: number;
  files_parsed_ok: number;
  files_failed: number;
  /** Full per-file report (detection + parse outcome). */
  file_reports: FileReportItem[];
  /** Per-file format detection results. */
  format_detection: FormatDetectionItem[];
  before_processing: Snapshot;
  after_processing: Snapshot;
}

// ---------------------------------------------------------------------------
// Stream error  (the `error` SSE event)
// ---------------------------------------------------------------------------

export interface StreamError {
  detail: string;
  status_code: number;
}

// ---------------------------------------------------------------------------
// Stream lifecycle status
// ---------------------------------------------------------------------------

export type StreamStatus = "idle" | "streaming" | "done" | "error";
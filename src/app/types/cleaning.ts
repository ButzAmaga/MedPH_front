type GenericObject = Record<string, string | number | boolean | null>;

interface ProcessingSnapshot {
  total_rows: number;
  total_columns: number;
  sample_preview: GenericObject[];
}

export interface CleaningResponse  {
  filename: string;
  is_2022_override_applied: boolean;
  before_processing: ProcessingSnapshot;
  after_processing: ProcessingSnapshot;
}

// ---------------------------------------------------------------------------
// Stream Types
// ---------------------------------------------------------------------------

export interface ProgressEvent {
  step: number;
  total: number;
  message: string;
}

export interface Snapshot {
  total_rows: number;
  total_columns: number;
  sample_preview: Record<string, unknown>[];
}

export interface CleanResult {
  filename: string;
  is_2022_override_applied: boolean;
  before_processing: Snapshot;
  after_processing: Snapshot;
}

export interface StreamError {
  detail: string;
  status_code: number;
}

export type StreamStatus = "idle" | "streaming" | "done" | "error";
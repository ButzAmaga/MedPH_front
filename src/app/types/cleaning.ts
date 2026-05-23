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
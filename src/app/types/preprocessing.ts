interface DataPreprocessingMetrics {
  total_records: number;
  column_count: number;
  columns_present: string[];
  unique_years_computed: number[];
  unique_regions_collapsed: string[];
}

export interface PreprocessingResponse {
  metrics: DataPreprocessingMetrics;
}

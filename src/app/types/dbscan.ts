// ---------------------------------------------------------------------------
// Types

import { StreamError, StreamStatus } from "./cleaning";

// ---------------------------------------------------------------------------


export interface DbscanMetricsData {
  n_clusters_found: number;
  noise_count: number;
  noise_ratio: number;
  silhouette_score_sample: number | null;
  cluster_distribution: Record<string, number>;
}

export interface DbscanClusterEntry {
  row_count: number;
  is_noise: boolean;
  numeric_summary: Record<string, { mean: number; min: number; max: number }>;
  dominant_categories: Record<string, { value: string; percentage: number }>;
}

export interface DbscanClusterSummaryData {
  cluster_column: string;
  important_numeric_features: string[];
  clusters: Record<string, DbscanClusterEntry>;
}

export interface DbscanResult {
  status: string;
  input_source_read: string;
  output_destination_saved: string;
  configurations: Record<string, unknown>;
  observations: DbscanMetricsData;
  visualizations: { cluster_3d_scatter_png_base64: string; image_url: string };
}

export interface DbscanStreamState {
  status: StreamStatus;
  logs: ProgressEvent[];
  metrics: DbscanMetricsData | null;
  cluster_summary: DbscanClusterSummaryData | null;
  result: DbscanResult | null;
  error: StreamError | null;
}

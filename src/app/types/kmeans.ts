
// 1. Definition for the 'metrics' event data
export interface MetricsEventData {
  inertia: number;
  silhouette_score_sample: number;
  cluster_distribution: Record<string, number>; // e.g., "Cluster_0": 2243
}

// 2. Definition for the 'visualization' event data
export interface VisualizationEventData {
  cluster_3d_scatter_png_base64: string; // Base64 encoded data URI
}

export type ClusterSummaryData = {
  cluster_column: string;
  important_numeric_features: string[];

  clusters: Record<string, ClusterInfo>;
};

export type ClusterInfo = {
  row_count: number;

  numeric_summary: Record<string, NumericFeatureStats>;

  dominant_categories: Record<string, DominantCategory>;
};

export type NumericFeatureStats = {
  mean: number;
  min: number;
  max: number;
};

export type DominantCategory = {
  value: string;
  percentage: number;
};
export type DiagnosticsEvent = {
  matrix_mode: string;
  features_used: string[];

  explained_variance_ratio: number[];
  cumulative_explained_variance: number[];
  singular_values: number[];

  components_matrix: number[][];
  scaler_means: number[];
  scaler_vars: number[];
};

export type PCAProcessResponse = {
  status: "success" | "error";
  input_source: string;
  output_data_path: string;

  diagnostics: DiagnosticsEvent;
};
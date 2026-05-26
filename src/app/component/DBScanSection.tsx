"use client";
import { useState } from "react";
import { useDbscanStream } from "../hooks/dbscanHook";
import { PipelineSteps } from "./Pipeline";
import { DbscanMetricsData } from "../types/dbscan";
import { TableDataSummary } from "./KMeansSection";

// ---------------------------------------------------------------------------
// Pipeline step definitions
// ---------------------------------------------------------------------------

const PIPELINE_STEPS = [
  { step: 1, label: "Loading PCA Inference Data" },
  { step: 2, label: "Fitting DBSCAN Model" },
  { step: 3, label: "Computing Cluster Metrics" },
  { step: 4, label: "Saving Dataset & Generating 3D Plot" },
  { step: 5, label: "Generating Cluster Summary" },
  { step: 6, label: "Finalizing Result" },
];

// ---------------------------------------------------------------------------
// Metrics card
// ---------------------------------------------------------------------------

function DbscanMetricsCard({ metrics }: { metrics: DbscanMetricsData }) {
  const distributionEntries = Object.entries(metrics.cluster_distribution);
  const silhouette = metrics.silhouette_score_sample;

  return (
    <div className="mt-6 space-y-4">
      {/* Top stat grid */}
      <div className="grid grid-cols-2 gap-4">

        {/* Clusters found */}
        <div className="card bg-base-200 border border-base-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">
                Clusters Found
              </p>
              <span className="text-2xl">🔵</span>
            </div>
            <p className="text-3xl font-bold text-error">{metrics.n_clusters_found}</p>
            <p className="text-xs text-base-content/50 mt-1 font-mono">
              density-reachable groups
            </p>
          </div>
        </div>

        {/* Silhouette score */}
        <div className="card bg-base-200 border border-base-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">
                Silhouette Score
              </p>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-error">
              {silhouette !== null ? silhouette.toFixed(4) : "N/A"}
            </p>
            <p className="text-xs text-base-content/50 mt-1 font-mono">
              {silhouette === null ? "requires ≥ 2 clusters" : "cluster separation quality"}
            </p>
          </div>
        </div>

        {/* Noise count */}
        <div className="card bg-base-200 border border-base-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">
                Noise Points
              </p>
              <span className="text-2xl">🔇</span>
            </div>
            <p className="text-3xl font-bold text-warning">{metrics.noise_count.toLocaleString()}</p>
            <p className="text-xs text-base-content/50 mt-1 font-mono">
              outlier / unclassified rows
            </p>
          </div>
        </div>

        {/* Noise ratio */}
        <div className="card bg-base-200 border border-base-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">
                Noise Ratio
              </p>
              <span className="text-2xl">📉</span>
            </div>
            <p className="text-3xl font-bold text-warning">
              {(metrics.noise_ratio * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-base-content/50 mt-1 font-mono">
              {metrics.noise_ratio > 0.2 ? "consider lowering eps" : "within acceptable range"}
            </p>
          </div>
        </div>
      </div>

      {/* Cluster distribution */}
      <div className="card bg-base-200 border border-base-300 shadow-lg">
        <div className="card-body p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">
              Cluster Distribution
            </p>
            <span className="text-2xl">🧩</span>
          </div>
          <div className="space-y-2">
            {distributionEntries.map(([cluster, count]) => (
              <div
                key={cluster}
                className="flex items-center justify-between bg-base-100 rounded-lg px-4 py-2.5"
              >
                <span className="font-mono text-sm font-medium">
                  {cluster === "Noise" ? (
                    <span className="text-warning">{cluster}</span>
                  ) : (
                    cluster
                  )}
                </span>
                <span className={`badge badge-lg font-mono font-bold ${cluster === "Noise" ? "badge-warning" : "badge-error"}`}>
                  {(count as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parameter row — reusable label + control layout
// ---------------------------------------------------------------------------

function ParamRow({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start py-5 border-b border-base-content/8 last:border-0">
      <div>
        <p className="text-sm font-semibold text-base-content">{label}</p>
        <p className="text-xs text-base-content/40 font-mono mt-0.5">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export default function DBScanSection() {
  const [eps, setEps] = useState(0.5);
  const [minSamples, setMinSamples] = useState(5);
  const [metric, setMetric] = useState("euclidean");
  const [algorithm, setAlgorithm] = useState("auto");
  const [scaleFeatures, setScaleFeatures] = useState(true);

  const { status, logs, metrics, cluster_summary, start, cancel, reset } = useDbscanStream();

  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isError = status === "error";

  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
  const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

  const handleRun = () => {
    start(eps, minSamples, metric, algorithm, scaleFeatures);
  };

  return (
    <section className="relative w-full">

      {/* ── Section header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-error text-error">
            STEP 05
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-error/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">DBSCAN Clustering</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Density-Based Spatial Clustering of Applications with Noise
        </p>
      </div>

      {/* ── Configuration panel (hidden while streaming or done) ── */}
      {!isStreaming && !isDone && (
        <>
          <div className="bg-base-200 rounded-2xl border border-base-content/10 mb-5 overflow-hidden">

            {/* Panel header */}
            <div className="px-6 py-4 border-b border-base-content/10 bg-base-300/40">
              <p className="text-xs font-mono text-base-content/50 uppercase tracking-widest">
                Algorithm Configuration
              </p>
            </div>

            <div className="px-6">

              {/* EPS */}
              <ParamRow
                label="Epsilon (ε)"
                description="Maximum distance between two samples to be considered neighbours. Lower values create tighter, more distinct clusters."
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-base-content/40">Range: 0.1 – 5.0</span>
                    <span className="badge badge-error badge-lg font-mono font-black text-base px-3">{eps.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    value={eps}
                    onChange={(e) => setEps(Number(e.target.value))}
                    className="range range-error range-sm w-full"
                  />
                  <div className="flex justify-between text-xs text-base-content/30 font-mono">
                    <span>0.1</span><span>tight</span><span>2.5</span><span>loose</span><span>5.0</span>
                  </div>
                </div>
              </ParamRow>

              {/* Min Samples */}
              <ParamRow
                label="Minimum Samples"
                description="Minimum number of points required to form a dense region (core point). Higher values require denser clusters and increase noise points."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    className="input input-error input-md w-full font-mono"
                    min={1}
                    max={100}
                    value={minSamples}
                    onChange={(e) => setMinSamples(Number(e.target.value))}
                  />
                  <span className="text-xs text-base-content/40 font-mono whitespace-nowrap">pts / core</span>
                </div>
              </ParamRow>

              {/* Metric */}
              <ParamRow
                label="Distance Metric"
                description="The metric used to compute pairwise distances between points in the PC coordinate space."
              >
                <div className="flex flex-col gap-2">
                  {["euclidean", "manhattan", "cosine"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-mono transition-all duration-200 text-left
                        ${metric === m
                          ? "border-error bg-error/10 text-error"
                          : "border-base-content/10 hover:border-error/30 text-base-content/60"
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${metric === m ? "bg-error" : "bg-base-content/20"}`} />
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </ParamRow>

              {/* Algorithm */}
              <ParamRow
                label="Nearest-Neighbour Algorithm"
                description="Computational strategy for finding neighbours. 'auto' selects the most efficient method based on input dimensionality."
              >
                <div className="flex flex-col gap-2">
                  {["auto", "ball_tree", "kd_tree", "brute"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAlgorithm(a)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-mono transition-all duration-200 text-left
                        ${algorithm === a
                          ? "border-error bg-error/10 text-error"
                          : "border-base-content/10 hover:border-error/30 text-base-content/60"
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${algorithm === a ? "bg-error" : "bg-base-content/20"}`} />
                      <span>{a}</span>
                    </button>
                  ))}
                </div>
              </ParamRow>

              {/* Scale features */}
              <ParamRow
                label="StandardScale Features"
                description="Apply StandardScaler to PC coordinates before fitting. Strongly recommended — DBSCAN is highly sensitive to feature magnitude."
              >
                <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                  ${scaleFeatures ? "border-error/30 bg-error/5" : "border-base-content/10 bg-base-100"}`}>
                  <input
                    type="checkbox"
                    className="toggle toggle-error toggle-md"
                    checked={scaleFeatures}
                    onChange={(e) => setScaleFeatures(e.target.checked)}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {scaleFeatures ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-xs text-base-content/40 font-mono">
                      {scaleFeatures
                        ? "PC coordinates will be normalised before fitting"
                        : "⚠ Raw PC coordinates will be used — results may be skewed"}
                    </p>
                  </div>
                </div>
              </ParamRow>

            </div>
          </div>

          {/* Config summary strip */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { l: "eps", v: eps.toFixed(2) },
              { l: "min_samples", v: minSamples },
              { l: "metric", v: metric },
              { l: "algorithm", v: algorithm },
              { l: "scale", v: scaleFeatures ? "true" : "false" },
            ].map((t) => (
              <div
                key={t.l}
                className="font-mono text-xs bg-base-200 border border-base-content/10 rounded-lg px-3 py-1.5"
              >
                <span className="text-base-content/40">{t.l}=</span>
                <span className="text-error font-semibold">{t.v}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-error w-full font-mono tracking-wider"
            onClick={handleRun}
          >
            → Execute DBSCAN Density Clustering
          </button>
        </>
      )}

      {/* ── Pipeline steps ── */}
      {(isStreaming || isDone || isError) && (
        <PipelineSteps currentStep={currentStep} status={status} pipeline={PIPELINE_STEPS} />
      )}

      {/* ── Live message ticker ── */}
      {lastMessage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 border border-base-content/10 mt-4">
          {isStreaming && <span className="loading loading-dots loading-xs text-error" />}
          <p className="text-xs font-mono text-base-content/60 truncate">{lastMessage}</p>
        </div>
      )}

      {/* ── Error banner ── */}
      {isError && (
        <div role="alert" className="alert alert-error mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold font-mono text-sm">Pipeline Error</p>
            <p className="text-xs opacity-80">Check epsilon and min_samples — try increasing eps or decreasing min_samples.</p>
          </div>
        </div>
      )}

      {/* ── Metrics ── */}
      {metrics && <DbscanMetricsCard metrics={metrics} />}

      {/* ── Cluster summary ── */}
      {cluster_summary && (
        <TableDataSummary cluster_info={cluster_summary.clusters} />
      )}

      {/* ── Actions ── */}
      {isDone && (
        <div className="flex gap-3 pt-2 mt-4">
          <a
            href="/api/v2/dbscan/download"
            className="btn btn-error btn-sm font-mono tracking-wider"
            download
          >
            ↓ Download 3D Plot
          </a>
          <button
            className="btn btn-ghost btn-sm font-mono text-xs opacity-50 hover:opacity-100"
            onClick={reset}
          >
            ↺ Re-configure & Run
          </button>
        </div>
      )}

    </section>
  );
}
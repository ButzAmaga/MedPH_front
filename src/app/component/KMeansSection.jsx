"use client";
import { useState } from "react";
import { useKmeanStream } from "../hooks/kmeansHook";
import { PipelineSteps } from "./Pipeline";

export default function KMeansSection({ cleaningResult, headers }) {
  const [k, setK] = useState(3);
  const [maxIter, setMaxIter] = useState(300);
  const [initMethod, setInitMethod] = useState("k-means++");
  const [num_init, setNum_init] = useState(10);
  const [loading, setLoading] = useState(false);
  // const [result, setResult] = useState(null);


  const PIPELINE_STEPS = [
    { step: 1, label: "Loading Cluster Source Data" },
    { step: 2, label: "Training KMeans Model With Source Data" },
    { step: 3, label: "Loading PCA Inference Data" },
    { step: 4, label: "Assigning Cluster To Inference" },
    { step: 5, label: "Computing Metrics" },
    { step: 6, label: "Saving Cluster Dataset" },
    { step: 7, label: "Complete" },
  ];

  const { status, logs, metrics, start, cancel, reset } =
    useKmeanStream();

  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isError = status === "error";

  // Current step is the last step number seen in logs
  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
  // Last progress message
  const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

  const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  const handleCluster = async () => {
    setLoading(true);
    try {

      start(
        k,
        initMethod,
        num_init,
        maxIter
      );


    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRows = cleaningResult?.totalRows || 1;

  return (
    <section className="relative w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-accent text-accent">
            STEP 04
          </div>
          <div className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">K-Means Clustering</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Configure hyperparameters · Run clustering · Inspect segments
        </p>
      </div>

      {/* Config panel */}
      {(!isDone || isStreaming) && <div>

        <div className="bg-base-200 rounded-2xl p-6 border border-base-content/10 mb-5">
          <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-6">
            Hyperparameter Configuration
          </p>

          <div className="space-y-6">
            {/* K slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-sm">
                  Number of Clusters <span className="font-mono text-base-content/40">(k)</span>
                </label>
                <div className="badge badge-accent badge-lg font-mono font-black text-lg px-4">{k}</div>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                className="range range-accent range-sm w-full"
                step={1}
              />
              <div className="flex justify-between text-xs text-base-content/30 font-mono mt-1 px-1">
                {Array.from({ length: 14 }, (_, i) => i + 2).map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
              <p className="text-xs text-base-content/40 mt-2">
                Elbow method suggests{" "}
                <span className="text-accent font-mono">k={Math.max(2, Math.min(5, Math.round(Math.sqrt(totalRows / 2))))}</span>{" "}
                for this dataset size
              </p>
            </div>

            {/* Max iterations */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-sm">Max Iterations</label>
                <span className="font-mono text-accent font-bold">{maxIter}</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={maxIter}
                onChange={(e) => setMaxIter(Number(e.target.value))}
                className="range range-accent range-sm w-full"
              />
              <div className="flex justify-between text-xs text-base-content/30 font-mono mt-1">
                <span>50</span><span>500</span><span>1000</span>
              </div>
            </div>

            {/* Init + Distance grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/** Initilization method */}
              <div>
                <label className="font-semibold text-sm block mb-2">Initialization Method</label>
                <div className="flex flex-col gap-2">
                  {["k-means++", "random"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setInitMethod(m)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono transition-all duration-200
                      ${initMethod === m
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-base-content/10 hover:border-accent/40 text-base-content/60"}`}
                    >
                      <div className={`w-2 h-2 rounded-full transition-all ${initMethod === m ? "bg-accent" : "bg-base-content/20"}`} />
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/** Number of Init */}
              <div>
                <label className="font-semibold text-sm block mb-2">Number of Initialisation runs</label>
                <input type="number" className="input input-primary input-xl w-full" min={1} max={1000} value={num_init} onChange={(e) => setNum_init(Number(e.target.value))} />

              </div>
            </div>
          </div>
        </div>

        {/* Config summary */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { l: "k", v: k },
            { l: "max_iter", v: maxIter },
            { l: "init method", v: initMethod },
            { l: "num Init", v: num_init },
          ].map((t) => (
            <div key={t.l} className="font-mono text-xs bg-base-200 border border-base-content/10 rounded-lg px-3 py-1.5">
              <span className="text-base-content/40">{t.l}=</span>
              <span className="text-accent font-semibold">{t.v}</span>
            </div>
          ))}
        </div>

        <button
          className={`btn btn-accent w-full font-mono tracking-wider ${loading ? "loading" : ""}`}
          onClick={handleCluster}
          disabled={loading}
        >
          {loading ? "Running K-Means algorithm..." : `→ Cluster into ${k} Groups`}
        </button>
      </div>
      }

      {/* DaisyUI vertical steps */}
      <PipelineSteps currentStep={currentStep} status={status} pipeline={PIPELINE_STEPS} />

      {/* Live message ticker */}
      {lastMessage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 border border-base-content/10">
          <span className="loading loading-dots loading-xs text-primary" />
          <p className="text-xs font-mono text-base-content/60 truncate">{lastMessage}</p>
        </div>
      )}


      {/* Results */}
      {false && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Silhouette", val: result.silhouetteScore?.toFixed(3), note: "closer to 1 = better" },
              { label: "Inertia", val: result.inertia?.toFixed(0), note: "within-cluster variance" },
              { label: "Iterations", val: result.iterations, note: result.converged ? "✓ converged" : "max reached" },
              { label: "Clusters", val: result.clusters?.length, note: `k=${k}` },
            ].map((m, i) => (
              <div key={i} className="bg-base-200 rounded-2xl p-4 border border-base-content/10">
                <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">{m.label}</p>
                <p className="text-2xl font-black text-accent mt-1">{m.val}</p>
                <p className="text-xs text-base-content/30 font-mono mt-0.5">{m.note}</p>
              </div>
            ))}
          </div>

          {/* Visual cluster bar */}
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Cluster Distribution</p>
            <div className="flex h-10 rounded-xl overflow-hidden gap-0.5 mb-4">
              {result.clusters?.map((c, i) => (
                <div
                  key={i}
                  title={`Cluster ${c.id}: ${c.label} (${c.percentage?.toFixed(1)}%)`}
                  style={{ width: `${c.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  className="flex items-center justify-center text-xs font-mono text-white font-bold transition-all hover:opacity-80 cursor-pointer"
                >
                  {c.percentage > 8 ? `${c.percentage?.toFixed(0)}%` : ""}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {result.clusters?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-base-100/50">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.label}</p>
                      <span className="badge badge-ghost badge-xs font-mono">{c.size?.toLocaleString()} rows</span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {c.characteristics?.slice(0, 2).map((ch, j) => (
                        <li key={j} className="text-xs text-base-content/40 flex items-start gap-1">
                          <span className="text-accent/60">›</span> {ch}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dominant features + Interpretation */}
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">Key Discriminating Features</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {result.dominantFeatures?.map((f, i) => (
                <span key={i} className="badge font-mono" style={{ backgroundColor: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] + "66" }}>
                  {f}
                </span>
              ))}
            </div>
            <div className="border-l-2 border-accent/40 pl-4">
              <p className="text-sm text-base-content/70 leading-relaxed">{result.interpretation}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

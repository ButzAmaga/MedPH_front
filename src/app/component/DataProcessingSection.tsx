"use client";
import { useState } from "react";
import { PreprocessingResponse } from '@/app/types/preprocessing';
import { PipelineSteps } from "./Pipeline";
import { usePreprocessStream } from "../hooks/preprocessingHook";


const PIPELINE_STEPS = [
  { step: 1, label: "Load Cleaned Dataset" },
  { step: 2, label: "Running Preprocessing Pipeline" },
  { step: 3, label: "Generating Preprocessing Metrics" },
  { step: 4, label: "Saving Preprocessed Dataset" },
  { step: 5, label: "Preparing for Download" },
  { step: 6, label: "Complete" },
];

export default function DataProcessingSection() {
  const [loading, setLoading] = useState(false);
  // const [result, setResult] = useState<PreprocessingResponse | null>(null);

  const { status, logs, metrics, result, error, start, cancel, reset } =
    usePreprocessStream();

  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isError = status === "error";

  // Current step is the last step number seen in logs
  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
  // Last progress message
  const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

  const handlePreprocess = async () => {

    setLoading(true);

    try {
      await start();

    } catch (err) {
      console.error(err);

    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-secondary text-secondary">
            STEP 02
          </div>
          <div className="h-px flex-1 bg-linear-to-r from-secondary/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mt-4">Data Preprocessing</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Transformations
        </p>
      </div>

      {!result && <button
        className={`btn btn-secondary w-full font-mono tracking-wider ${loading ? "loading" : ""}`}
        onClick={handlePreprocess}
        disabled={loading}
      >
        {loading ? "Applying transformations..." : `→ Apply Preprocessing Steps`}
      </button>}

      {(isStreaming || isDone) &&
        <PipelineSteps
          currentStep={currentStep}
          status={status}
          pipeline={PIPELINE_STEPS}
        />}

      {/* Results */}
      {metrics && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          <h3 className="text-lg font-bold">Results</h3>
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">After Preprocessing</p>
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
                    <td className="font-mono font-semibold text-sm">{metrics.total_records}</td>
                    <td className="font-mono font-semibold text-sm">{metrics.column_count}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4 mt-4">Columns</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {metrics.columns_present &&
                metrics.columns_present.map((txt, id) => (
                  <div key={id} className="badge badge-neutral/10 badge-sm font-mono hover:badge-neutral">
                    {txt}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Final result ── */}
      {isDone && result && ( 
        <>
        
        < div className="flex gap-3 pt-2">
      <a
        href="/api/v2/cleaning/download"
        className="btn btn-primary btn-sm font-mono tracking-wider"
        download
      >
        ↓ Download cleaned CSV
      </a>
      <button
        className="btn btn-ghost btn-sm font-mono text-xs opacity-50 hover:opacity-100"
        onClick={reset}
      >
        ↺ Upload new file
      </button>
    </div>
  )
}



    </section >
  );
}

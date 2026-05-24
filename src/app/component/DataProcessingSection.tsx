"use client";
import { useState } from "react";
import { PreprocessingResponse } from '@/app/types/preprocessing';

const PREPROCESS_OPTIONS = [
  { id: "normalize", label: "Normalize", icon: "⊡", desc: "Scale values to [0,1]" },
  { id: "fillnull", label: "Fill Nulls", icon: "◈", desc: "Impute missing values" },
  { id: "encode", label: "Encode Categoricals", icon: "⊞", desc: "One-hot / label encoding" },
  { id: "outliers", label: "Remove Outliers", icon: "◎", desc: "IQR-based filtering" },
  { id: "duplicates", label: "Drop Duplicates", icon: "⊟", desc: "Remove repeated rows" },
  { id: "scale", label: "Standardize", icon: "⊠", desc: "Z-score normalization" },
];

export default function DataProcessingSection() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreprocessingResponse | null>(null);


  const handlePreprocess = async () => {

    setLoading(true);

    try {
      const response = await fetch("api/preprocessing", {
        method: "POST",
        body: new FormData()
      });

      const data = await response.json()
      console.log(data)

      setResult(data)
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
          Select transformations · Apply pipeline · Inspect outcome
        </p>
      </div>



      <button
        className={`btn btn-secondary w-full font-mono tracking-wider ${loading ? "loading" : ""}`}
        onClick={handlePreprocess}
        disabled={loading}
      >
        {loading ? "Applying transformations..." : `→ Apply Preprocessing Steps`}
      </button>

      {/* Results */}
      {result && (
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
                    <td className="font-mono font-semibold text-sm">{result.metrics.total_records}</td>
                    <td className="font-mono font-semibold text-sm">{result.metrics.column_count}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4 mt-4">Columns</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {result?.metrics.columns_present &&
                result?.metrics.columns_present.map((txt, id) => (
                  <div key={id} className="badge badge-neutral/10 badge-sm font-mono hover:badge-neutral">
                    {txt}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

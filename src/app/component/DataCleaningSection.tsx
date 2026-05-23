"use client";

import { useState, useRef } from "react";
import { CleaningResponse } from "@/app/types/cleaning";

export default function DataCleaningSection({ onCleaningComplete }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CleaningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (f) => {
    if (!f || !f.name.endsWith(".csv") && !f.name.endsWith(".xls") && !f.name.endsWith(".xlsx")) {
      setError("Please upload a valid .csv, .xls, or .xlsx file.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {

    if (!file) return;

    setLoading(true);
    setError(null);

    try {

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`api/cleaning`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      console.log(data);

      setResult(data);
      onCleaningComplete(data);
    } catch (err) {
      setError("Failed to clean the file. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <section className="relative w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-primary text-primary">
            STEP 01
          </div>
          <div className="h-px flex-1 bg-linear-to-r from-primary/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mt-4">Data Ingestion &amp; Cleaning</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Upload your dataset
        </p>
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
            ${dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-base-content/20 hover:border-primary/60 hover:bg-base-content/5"}
            ${file ? "border-success/60 bg-success/5" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${file ? "bg-success/20 text-success" : "bg-base-content/10 text-base-content/40 group-hover:bg-primary/20 group-hover:text-primary"}`}>
              {file ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>

            {file ? (
              <div>
                <p className="font-semibold text-success">{file.name}</p>
                <p className="text-sm text-base-content/40 font-mono mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-base-content/70">Drop your CSV here</p>
                <p className="text-sm text-base-content/40 mt-1">or click to browse files</p>
              </div>
            )}
          </div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 rounded-2xl opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        </div>
      )}

      {error && (
        <div className="alert alert-error mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {file && !result && (
        <button
          className={`btn btn-primary w-full mt-4 font-mono tracking-wider ${loading ? "loading" : ""}`}
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "Analyzing dataset..." : "→ Run Data Quality Audit"}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          {/* Column breakdown */}
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Before Cleaning</p>
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
                    <td className="font-mono font-semibold text-sm">{result.before_processing.total_rows}</td>
                    <td className="font-mono font-semibold text-sm">{result.before_processing.total_columns}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4 mt-4">Columns</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {result?.before_processing?.sample_preview?.[0] &&
                Object.keys(result.before_processing.sample_preview[0]).map((key) => (
                  <div key={key} className="badge badge-neutral/10 badge-sm font-mono hover:badge-neutral">
                    {key}
                  </div>
                ))
              }
            </div>
          </div>

                    <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">After Cleaning</p>
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
                    <td className="font-mono font-semibold text-sm">{result.after_processing.total_rows}</td>
                    <td className="font-mono font-semibold text-sm">{result.after_processing.total_columns}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4 mt-4">Columns</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {result?.after_processing?.sample_preview?.[0] &&
                Object.keys(result.after_processing.sample_preview[0]).map((key) => (
                  <div key={key} className="badge badge-neutral/10 badge-sm font-mono hover:badge-neutral">
                    {key}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">Recommendations</p>
              <ul className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-base-content/70">
                    <span className="text-primary font-mono mt-0.5">›</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="btn btn-sm btn-ghost font-mono text-xs opacity-50 hover:opacity-100"
            onClick={() => { setResult(null); setFile(null); onCleaningComplete(null); }}
          >
            ↺ Upload new file
          </button>
        </div>
      )}
    </section>
  );
}

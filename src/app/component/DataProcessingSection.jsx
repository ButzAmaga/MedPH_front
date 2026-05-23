"use client";
import { useState } from "react";

const PREPROCESS_OPTIONS = [
  { id: "normalize", label: "Normalize", icon: "⊡", desc: "Scale values to [0,1]" },
  { id: "fillnull", label: "Fill Nulls", icon: "◈", desc: "Impute missing values" },
  { id: "encode", label: "Encode Categoricals", icon: "⊞", desc: "One-hot / label encoding" },
  { id: "outliers", label: "Remove Outliers", icon: "◎", desc: "IQR-based filtering" },
  { id: "duplicates", label: "Drop Duplicates", icon: "⊟", desc: "Remove repeated rows" },
  { id: "scale", label: "Standardize", icon: "⊠", desc: "Z-score normalization" },
];

export default function DataProcessingSection({ cleaningResult, headers, rows }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handlePreprocess = async () => {
    if (!selected.length) return;
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Given this dataset summary: ${JSON.stringify(cleaningResult)}
Headers: ${JSON.stringify(headers)}
Selected preprocessing steps: ${JSON.stringify(selected)}

Simulate applying these preprocessing steps and respond ONLY with a JSON object (no markdown, no backticks):
{
  "stepsApplied": [{"step": string, "description": string, "rowsAffected": number, "columnsAffected": string[]}],
  "rowsBefore": number,
  "rowsAfter": number,
  "columnsBefore": number,
  "columnsAfter": number,
  "readinessScore": number (0-100),
  "insight": string (2-3 sentences about what changed and why it helps ML)
}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const raw = data.content.map((i) => i.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
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
          <div className="h-px flex-1 bg-gradient-to-r from-secondary/40 to-transparent" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Data Preprocessing</h2>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Select transformations · Apply pipeline · Inspect outcome
        </p>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {PREPROCESS_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`relative group p-4 rounded-2xl border text-left transition-all duration-200
                ${active
                  ? "border-secondary bg-secondary/15 shadow-lg shadow-secondary/10"
                  : "border-base-content/10 bg-base-200 hover:border-secondary/40 hover:bg-secondary/5"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-2xl transition-transform duration-200 ${active ? "scale-110" : ""}`}>
                  {opt.icon}
                </span>
                <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 mt-1
                  ${active ? "border-secondary bg-secondary" : "border-base-content/20"}`} />
              </div>
              <p className={`font-semibold text-sm transition-colors ${active ? "text-secondary" : "text-base-content/80"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-base-content/40 mt-0.5">{opt.desc}</p>

              {active && (
                <div className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
                  style={{ background: "linear-gradient(135deg, hsl(var(--s)), transparent)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected count + run */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-secondary to-secondary/60 rounded-full transition-all duration-500"
            style={{ width: `${(selected.length / PREPROCESS_OPTIONS.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-base-content/40">
          {selected.length}/{PREPROCESS_OPTIONS.length} selected
        </span>
      </div>

      <button
        className={`btn btn-secondary w-full font-mono tracking-wider ${loading ? "loading" : ""}`}
        onClick={handlePreprocess}
        disabled={!selected.length || loading}
      >
        {loading ? "Applying transformations..." : `→ Apply ${selected.length || ""} Preprocessing Steps`}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Rows Before", val: result.rowsBefore?.toLocaleString(), sub: "original" },
              { label: "Rows After", val: result.rowsAfter?.toLocaleString(), sub: "cleaned", color: "text-secondary" },
              { label: "Cols Before", val: result.columnsBefore, sub: "original" },
              { label: "Cols After", val: result.columnsAfter, sub: "transformed", color: "text-secondary" },
            ].map((s, i) => (
              <div key={i} className="bg-base-200 rounded-2xl p-4 border border-base-content/10">
                <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">{s.label}</p>
                <p className={`text-2xl font-black mt-1 ${s.color || ""}`}>{s.val}</p>
                <p className="text-xs text-base-content/30 font-mono">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Readiness */}
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest">ML Readiness</p>
              <span className="text-2xl font-black text-secondary">{result.readinessScore}%</span>
            </div>
            <progress className="progress progress-secondary w-full" value={result.readinessScore} max="100" />
            <p className="text-sm text-base-content/60 mt-3">{result.insight}</p>
          </div>

          {/* Steps timeline */}
          <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Pipeline Executed</p>
            <div className="space-y-3">
              {result.stepsApplied?.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary text-xs font-mono">{i + 1}</span>
                    </div>
                    {i < result.stepsApplied.length - 1 && (
                      <div className="w-px h-6 bg-secondary/20 mt-1" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="font-semibold text-sm capitalize">{step.step}</p>
                    <p className="text-xs text-base-content/40 mt-0.5">{step.description}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="badge badge-ghost badge-xs font-mono">{step.rowsAffected} rows</span>
                      {step.columnsAffected?.map((c, j) => (
                        <span key={j} className="badge badge-ghost badge-xs font-mono">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

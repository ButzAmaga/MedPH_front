"use client";
import { useState } from "react";
import DataCleaningSection from "./DataCleaningSection";
import DataProcessingSection from "./DataProcessingSection";
import KMeansSection from "./KMeansSection";
import PipelineDivider from "./PipelineDivider";
import PCASection from "./PCASection";
import DBScanSection from "./DBScanSection";

export default function MLPipelinePage() {
  const [cleaningResult, setCleaningResult] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [showProcessing, setShowProcessing] = useState(true);
  const [showClustering, setShowClustering] = useState(true);

  const [column_present, setColumnPresent] = useState([]);

  const handleCleaningComplete = (result, h, r) => {
    if (!result) {
      setCleaningResult(null);
      setShowProcessing(false);
      setShowClustering(false);
      return;
    }
    setCleaningResult(result);
    setHeaders(h || []);
    setRows(r || []);
    setTimeout(() => setShowProcessing(true), 400);
  };

  const completedSteps = [
    cleaningResult ? 1 : 0,
    showProcessing ? 1 : 0,
    showClustering ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans">
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04] blur-3xl"
        style={{ background: "radial-gradient(ellipse, hsl(var(--p)), transparent 70%)" }} />

      {/* Nav */}
      <header className="border-b border-base-content/5 sticky top-0 z-50 backdrop-blur-xl bg-base-100/80">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <span className="font-mono font-bold text-sm tracking-tight">ML Pipeline</span>
          </div>

          {/* Steps progress */}
          <div className="flex items-center gap-2">
            {["Clean", "Process", "Cluster"].map((label, i) => {
              const done = i === 0 ? !!cleaningResult : i === 1 ? showProcessing : showClustering;
              const active = i === 0 ? true : i === 1 ? showProcessing : showClustering;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all duration-500
                    ${done ? "bg-primary/15 text-primary" : active ? "bg-base-200 text-base-content/60" : "bg-base-200 text-base-content/20"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${done ? "bg-primary" : "bg-current opacity-50"}`} />
                    {label}
                  </div>
                  {i < 2 && <div className="w-4 h-px bg-base-content/10" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-base-content/10 bg-base-200 mb-6">
          <span className="text-xs font-mono text-base-content/50 tracking-widest">MedFlowPH Cluster Analysis</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-4">
          From Raw Data<br />
          <span className=" bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)), hsl(var(--a)))" }}>
            to Clusters
          </span>
        </h1>
        <p className="text-base-content/50 text-lg max-w-xl mx-auto leading-relaxed">
          A pipeline that cleans, preprocesses, pca and clusters Med data — step by step.
        </p>
      </div>

      {/* Pipeline */}
      <main className="max-w-3xl mx-auto px-6 pb-24 space-y-0">
        {/* Step 1 */}
        <div className="bg-base-100 rounded-3xl border border-base-content/10 p-8 shadow-sm">
          <DataCleaningSection onCleaningComplete={handleCleaningComplete} />
        </div>

        {/* Connector */}
        <PipelineDivider active={!!cleaningResult} />

        {/* Step 2 */}
        <div className={`bg-base-100 rounded-3xl border p-8 shadow-sm transition-all duration-700 overflow-hidden
          ${showProcessing ? "border-base-content/10 opacity-100 max-h-[9999px]" : "border-base-content/5 opacity-30 max-h-0 p-0"}`}>

          {showProcessing && <DataProcessingSection handleColumns={setColumnPresent}/>}
        </div>

        {!showProcessing && cleaningResult && (
          <div className="bg-base-100 rounded-3xl border border-base-content/5 p-8 opacity-30 pointer-events-none select-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-base-content/20 text-base-content/20">STEP 02</div>
              <div className="h-px flex-1 bg-base-content/5" />
            </div>
            <div className="text-base-content/20 text-lg font-bold">Data Preprocessing</div>
            <div className="text-base-content/20 text-sm font-mono mt-1">Complete Step 01 to unlock</div>
          </div>
        )}

        {/* Connector */}
        <PipelineDivider active={showProcessing} />

        {/* Step 3 */}
        <div className={`bg-base-100 rounded-3xl border p-8 shadow-sm transition-all duration-700 overflow-hidden
          ${showClustering ? "border-base-content/10 opacity-100 max-h-[9999px]" : "border-base-content/5 opacity-30 max-h-0 p-0"}`}>
          {showClustering && (
            <PCASection present_columns={column_present}/>
          )}
        </div>          

        {/* Connector */}
        <PipelineDivider active={showProcessing} />
        {/* Step 3 */}
        <div className={`bg-base-100 rounded-3xl border p-8 shadow-sm transition-all duration-700 overflow-hidden
          ${showClustering ? "border-base-content/10 opacity-100 max-h-[9999px]" : "border-base-content/5 opacity-30 max-h-0 p-0"}`}>
          {showClustering && (
            <KMeansSection cleaningResult={cleaningResult} headers={headers} />
          )}
        </div>
        
        {/* Connector */}
        <PipelineDivider active={showProcessing} />
        <DBScanSection />

        {!showClustering && (
          <div className="bg-base-100 rounded-3xl border border-base-content/5 p-8 opacity-30 pointer-events-none select-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="badge badge-outline badge-lg font-mono text-xs tracking-widest border-base-content/20 text-base-content/20">STEP 03</div>
              <div className="h-px flex-1 bg-base-content/5" />
            </div>
            <div className="text-base-content/20 text-lg font-bold">K-Means Clustering</div>
            <div className="text-base-content/20 text-sm font-mono mt-1">Complete Step 02 to unlock</div>
          </div>
        )}
      </main>
    </div>
  );
}

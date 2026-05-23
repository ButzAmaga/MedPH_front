"use client";

export default function PipelineDivider({ active }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className={`w-0.5 h-8 transition-all duration-700 ${active ? "bg-gradient-to-b from-base-content/20 to-base-content/5" : "bg-base-content/5"}`} />
      <div className={`w-2 h-2 rounded-full border transition-all duration-700 ${active ? "border-base-content/30 bg-base-content/10" : "border-base-content/10"}`} />
      <div className={`w-0.5 h-8 transition-all duration-700 ${active ? "bg-gradient-to-b from-base-content/5 to-transparent" : "bg-transparent"}`} />
    </div>
  );
}

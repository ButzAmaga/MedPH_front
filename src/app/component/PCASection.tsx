import { useState } from "react";
import { usePCAStream } from "../hooks/pcaHook";
import { PipelineSteps } from "./Pipeline";

const PIPELINE_STEPS = [
    { step: 1, label: "Loading Preprocessed Dataset" },
    { step: 2, label: "Running PCA Pipeline" },
    { step: 3, label: "Getting PCA Diagnostic" },
    { step: 4, label: "Preparing for Download" },
    { step: 5, label: "Complete" },
];


export default function PCASection() {
    const [loading, setLoading] = useState(false);
    const { status, logs, diagnostics, result, error, start, cancel, reset } =
        usePCAStream();

    const isStreaming = status === "streaming";
    const isDone = status === "done";
    const isError = status === "error";

    // Current step is the last step number seen in logs
    const currentStep = logs.length > 0 ? logs[logs.length - 1].step : 0;
    // Last progress message
    const lastMessage = logs.length > 0 ? logs[logs.length - 1].message : null;

    const handlePCA = async () => {

        setLoading(true);

        try {
            await start()

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
                    <div className="badge badge-outline  badge-lg font-mono text-xs tracking-widest border-amber-300 text-amber-300">
                        STEP 03
                    </div>
                    <div className="h-px flex-1 bg-linear-to-r from-amber-300 to-transparent" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mt-4">PCA</h2>
                <p className="text-base-content/50 mt-1 font-mono text-sm">
                    Transformations
                </p>
            </div>

            {!result &&
                <button
                    className={`btn bg-amber-400 border-amber-400 hover:bg-amber-500 hover:border-amber-500 text-black w-full font-mono tracking-wider ${loading ? "loading" : ""}`}
                    onClick={handlePCA}
                    disabled={loading}
                >
                    {loading ? "Applying PCA..." : `→ Apply PCA`}
                </button>
            }

            {/* Pipeline steps */}
            {(isStreaming || isDone) &&
                <PipelineSteps
                    currentStep={currentStep}
                    status={status}
                    pipeline={PIPELINE_STEPS}
                />}

            {/* Live message ticker */}
            {lastMessage && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 border border-base-content/10">
                    <span className="loading loading-dots loading-xs text-primary" />
                    <p className="text-xs font-mono text-base-content/60 truncate">{lastMessage}</p>
                </div>
            )}

        </section >
    );
}







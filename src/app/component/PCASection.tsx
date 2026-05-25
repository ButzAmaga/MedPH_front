import React, { Dispatch, SetStateAction, useState } from "react";
import { usePCAStream } from "../hooks/pcaHook";
import { PipelineSteps } from "./Pipeline";

const PIPELINE_STEPS = [
    { step: 1, label: "Loading Preprocessed Dataset" },
    { step: 2, label: "Running PCA Pipeline" },
    { step: 3, label: "Getting PCA Diagnostic" },
    { step: 4, label: "Preparing for Download" },
    { step: 5, label: "Complete" },
];


export default function PCASection({ present_columns }: { present_columns: string[] }) {
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
            // Select all checked checkboxes with the name "pca_selected_column"
            const checkedBoxes = document.querySelectorAll<HTMLInputElement>('input[name="pca_columns_selected"]:checked');

            // Extract the values into an array
            const selectedValues = Array.from(checkedBoxes).map(cb => cb.value);

            console.log(selectedValues)
            // pass the selected values for PCA
            await start(selectedValues)

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

            <div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {present_columns?.map((col, index) => (
                        <label
                            key={index}
                            className="label cursor-pointer justify-start gap-4 border rounded-lg p-3"
                        >
                            <input
                                type="checkbox"
                                name="pca_columns_selected"
                                value={col}
                                className="checkbox checkbox-primary"
                            />
                            <span className="label-text">
                                {col}
                            </span>
                        </label>
                    ))}
                </div>
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

            {/* Results */}
            {result && (
                <>
                    <div className="mt-6 space-y-4 animate-in fade-in duration-500">
                        <h3 className="text-lg font-bold">Results</h3>

                        <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
                            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Feature Used</p>
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr className="text-xs font-mono text-base-content/40">
                                            <th>Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.diagnostics.features_used.map((data, id) =>
                                            <tr className="hover:bg-base-content/5" key={id}>
                                                <td className="font-mono font-semibold text-sm">{data}</td>
                                            </tr>
                                        )}


                                    </tbody>
                                </table>
                            </div>

                        </div>

                        <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
                            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Explain Variance Ratio</p>
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr className="text-xs font-mono text-base-content/40">
                                            <th>PCA #</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.diagnostics.explained_variance_ratio.map((data, id) =>
                                            <tr className="hover:bg-base-content/5" key={id}>
                                                <td className="font-mono font-semibold text-sm">PCA {id+1}</td>
                                                <td className="font-mono font-semibold text-sm">{data}</td>
                                            </tr>
                                        )}


                                    </tbody>
                                </table>
                            </div>

                        </div>

                        <div className="bg-base-200 rounded-2xl p-5 border border-base-content/10">
                            <p className="text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">Cumulative Explained Variance</p>
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr className="text-xs font-mono text-base-content/40">
                                            <th>PCA #</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.diagnostics.cumulative_explained_variance.map((data, id) =>
                                            <tr className="hover:bg-base-content/5" key={id}>
                                                <td className="font-mono font-semibold text-sm">{id+1} Combined</td>
                                                <td className="font-mono font-semibold text-sm">{data}</td>
                                            </tr>
                                        )}


                                    </tbody>
                                </table>
                            </div>

                        </div>                        
                    </div>
                </>
            )}

        </section >
    );
}







// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

export function PipelineSteps({ currentStep, status, pipeline }: { currentStep: number; status: string; pipeline: { step: number, label: string }[] }) {
    return (
        <ul className="steps steps-vertical w-full">
            {pipeline.map(({ step, label }) => {
                const isDone = currentStep > step || status === "done";
                const isActive = currentStep === step && status === "streaming";
                const isError = status === "error" && currentStep === step;

                return (
                    <li
                        key={step}
                        className={`step transition-all duration-300
              ${isDone ? "step-success" : ""}
              ${isActive ? "step-primary" : ""}
              ${isError ? "step-error" : ""}
            `}
                    >
                        <span className="flex items-center gap-2 text-sm font-mono">
                            {isActive && (
                                <span className="loading loading-spinner loading-xs text-primary" />
                            )}
                            <span className={isDone ? "text-success" : isActive ? "text-primary" : "text-base-content/40"}>
                                {label}
                            </span>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

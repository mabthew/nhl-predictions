import { OverUnderPrediction } from "@/lib/types";
import ConfidenceMeter from "./ConfidenceMeter";

interface OverUnderProps {
  overUnder: OverUnderPrediction;
}

export default function OverUnder({ overUnder }: OverUnderProps) {
  const isOver = overUnder.prediction === "OVER";

  return (
    <div className="bg-light-gray rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-medium-gray">
          Over/Under
        </span>
        <span className="text-sm font-bold text-charcoal">
          Line: {overUnder.line}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span
          className={`text-lg font-extrabold ${
            isOver ? "text-green-600" : "text-espn-red"
          }`}
        >
          {overUnder.prediction}
        </span>
        <span className="text-sm text-medium-gray">
          Projected: {overUnder.projectedTotal} goals
        </span>
      </div>

      <ConfidenceMeter confidence={overUnder.confidence} size="sm" />

      <p className="text-xs text-medium-gray mt-2 leading-relaxed">
        {overUnder.justification}
      </p>
    </div>
  );
}

interface ConfidenceMeterProps {
  confidence: number;
  size?: "sm" | "md" | "lg";
}

export default function ConfidenceMeter({
  confidence,
  size = "md",
}: ConfidenceMeterProps) {
  const heights = { sm: "h-2", md: "h-3", lg: "h-4" };
  const height = heights[size];

  const color =
    confidence >= 75
      ? "bg-green-500"
      : confidence >= 60
        ? "bg-yellow-500"
        : "bg-brand-primary";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-border-gray rounded-none ${height} overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-none transition-all duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-sm font-bold text-charcoal min-w-[3ch] text-right">
        {confidence}%
      </span>
    </div>
  );
}

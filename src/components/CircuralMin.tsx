type CircularProgressProps = {
  percent: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
};

export default function CircularProgress({
  percent,
  size = 60,
  strokeWidth = 6,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          stroke="currentColor"
          className="text-muted"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />

        {/* Progress circle */}
        <circle
          stroke="currentColor"
          className={`transition-all duration-500 ${
            percent === 100 ? "text-success" : "text-primary"
          }`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>

      {/* Center text */}
      <div className="absolute text-xs font-mono font-semibold">{percent}%</div>
    </div>
  );
}

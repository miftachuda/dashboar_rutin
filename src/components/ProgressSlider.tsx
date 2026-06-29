import { useRef } from "react";

export default function ProgressSlider({
  taskId,
  stepId,
  itemId,
  value,
  onChange,
}: {
  taskId: string;
  stepId: string;
  itemId: string;
  value: number;
  onChange: (
    taskId: string,
    stepId: string,
    itemId: string,
    val: number,
  ) => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  const updateValue = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, percent));
    onChange(taskId, stepId, itemId, Math.round(clamped));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    updateValue(e.clientX);

    const move = (ev: MouseEvent) => updateValue(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="flex w-full items-center gap-2 px-2">
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className="h-4 w-full cursor-pointer overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className={`h-full transition-all ${value === 100 ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="w-10 select-none text-right font-mono">
        {String(value).padStart(2, "0")}%
      </span>
    </div>
  );
}

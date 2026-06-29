import { useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { enGB } from "date-fns/locale/en-GB";

registerLocale("en-GB", enGB);

export default function DateRange({
  item,
  taskId,
  stepId,
  handleTimeChange,
  formatDate,
  formatTime,
  getDuration,
}: {
  item: any;
  taskId: string;
  stepId: string;
  handleTimeChange: (
    taskId: string,
    stepId: string,
    itemId: string,
    field: "startdate" | "enddate",
    value: number,
  ) => void;
  formatDate: (ts?: number) => string;
  formatTime: (ts?: number) => string;
  getDuration: (start?: number, end?: number) => string;
}) {
  const inputRefStart = useRef<Record<string, HTMLInputElement | null>>({});
  const inputRefEnds = useRef<Record<string, HTMLInputElement | null>>({});

  function formatDateTimeLocal(timestamp: number) {
    const d = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }

  return (
    <div className="flex items-center gap-2 pt-2">
      {/* START DATE */}
      <div
        className="relative inline-flex cursor-pointer items-center gap-1 rounded-md border bg-muted/30 px-1 py-1 transition hover:bg-muted"
        onClick={() => inputRefStart.current[item.id]?.showPicker()}
      >
        <span className="absolute -top-3.5 left-2 bg-muted/0 px-1 text-[10px] text-green-300">
          Start
        </span>
        <div className="flex flex-row items-center gap-1 text-center">
          <span className="text-xs text-muted-foreground">
            {formatDate(item.startdate)}
          </span>
          <span className="font-mono text-xs font-medium">
            {formatTime(item.startdate)}
          </span>
        </div>
        <span className="text-muted-foreground text-[10px]">▾</span>
        <input
          ref={(el) => {
            inputRefStart.current[item.id] = el;
          }}
          type="datetime-local"
          lang="en-GB"
          value={item.startdate ? formatDateTimeLocal(item.startdate) : ""}
          onChange={(e) =>
            handleTimeChange(
              taskId,
              stepId,
              item.id,
              "startdate",
              new Date(e.target.value).getTime(),
            )
          }
          className="absolute inset-0 opacity-0"
        />
      </div>

      {/* END DATE */}
      <div
        className="relative inline-flex cursor-pointer items-center gap-1 rounded-md border bg-muted/30 px-1 py-1 transition hover:bg-muted"
        onClick={() => inputRefEnds.current[item.id]?.showPicker()}
      >
        <span className="absolute -top-3.5 left-2 bg-muted/0 px-1 text-[10px] text-cyan-300">
          End
        </span>
        <div className="flex flex-row items-center gap-1 text-center">
          <span className="text-xs text-muted-foreground">
            {formatDate(item.enddate)}
          </span>
          <span className="font-mono text-xs font-medium">
            {formatTime(item.enddate)}
          </span>
        </div>
        <span className="text-muted-foreground text-[10px]">▾</span>
        <input
          ref={(el) => {
            inputRefEnds.current[item.id] = el;
          }}
          type="datetime-local"
          value={item.enddate ? formatDateTimeLocal(item.enddate) : ""}
          onChange={(e) =>
            handleTimeChange(
              taskId,
              stepId,
              item.id,
              "enddate",
              new Date(e.target.value).getTime(),
            )
          }
          className="absolute inset-0 opacity-0"
        />
      </div>

      {/* DURATION */}
      <span className="font-mono text-xs text-muted-foreground">
        {getDuration(item.startdate, item.enddate)}
      </span>
    </div>
  );
}

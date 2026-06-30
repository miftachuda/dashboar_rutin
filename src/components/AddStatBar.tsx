import { typeColors, EquipmentType, StepTask } from "@/types/maintenance";

import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
interface AddStatbarProps {
  tasks: StepTask[];
}
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
}

export function AddStatbar({ tasks }: AddStatbarProps) {
  const calculateTaskProgress = (tasks: StepTask[]) => {
    let totalProgress = 0;
    let totalSteps = 0;

    tasks.forEach((task) => {
      task.steps?.forEach((group) => {
        group.steplist?.forEach((step) => {
          totalProgress += step.progress || 0;
          totalSteps += 1;
        });
      });
    });

    return {
      totalProgress,
      totalSteps,
      average: totalSteps > 0 ? totalProgress / totalSteps : 0,
    };
  };
  const getProgressByType = (tasks: StepTask[]) => {
    return calculateTaskProgress(tasks);
  };
  const isTaskComplete = (task: StepTask) => {
    return task.steps?.every((group) =>
      group.steplist?.every((step) => step.progress === 100),
    );
  };
  const getEquipmentTypeStats = (tasks: StepTask[]) => {
    let total = tasks.length;
    let completed = 0;

    tasks.forEach((task) => {
      if (isTaskComplete(task)) {
        completed += 1;
      }
    });

    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  };
  function ETypeCard({ eTypes, color = "#6C63FF" }) {
    return (
      <div
        className="relative inline-flex items-center gap-1 rounded-md px-3 py-0  overflow-hidden"
        style={{
          backgroundColor: color + "18",
          border: `1.5px solid ${color}`,
        }}
      >
        {/* Decorative glow blob */}
        <span
          className="absolute -top-3 -left-3 w-8 h-8 rounded-full blur-xl opacity-60 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        <p
          className="font-display font-bold tracking-wide relative"
          style={{
            color: color,
            fontSize: "clamp(12px, 2.5vw, 20px)",
          }}
        >
          {eTypes}
        </p>
      </div>
    );
  }
  const progress = getProgressByType(tasks);
  const stats = getEquipmentTypeStats(tasks);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div
        style={{
          border: `1.5px solid rgba(${hexToRgb(typeColors["Heat Exchanger"])}, 0.4)`,
          boxShadow: `
      inset 0 0 10px rgba(${hexToRgb(typeColors["Heat Exchanger"])}, 0.3),
      inset 0 0 20px rgba(${hexToRgb(typeColors["Heat Exchanger"])}, 0.2),
      inset 0 0 40px rgba(${hexToRgb(typeColors["Heat Exchanger"])}, 0.1)
    `,
          background: `rgba(255,255,255,0.85)`,
        }}
        className="rounded-xl p-2 flex items-center gap-4"
      >
        <div className="flex flex-col items-start justify-start">
          {ETypeCard({
            eTypes: "ALL PROGRESS",
            color: typeColors["Heat Exchanger"],
          })}

          <div className="flex items-center gap-2 mt-2">
            {/* Circular */}
            <div className="relative w-36 aspect-square">
              <CircularProgressbar
                value={stats.percentage}
                text=""
                circleRatio={0.75}
                strokeWidth={18}
                styles={buildStyles({
                  rotation: 1 / 2 + 1 / 8,
                  strokeLinecap: "butt",
                  trailColor: "#eeeeee",
                  pathColor: typeColors["Heat Exchanger"],
                })}
              />

              <div className="absolute mt-8 inset-4 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center leading-none gap-1">
                  <span className="text-[20px] font-bold text-gray-900">
                    {stats.percentage.toFixed(2)}
                  </span>
                  <span className="text-[14px] font-bold text-gray-900 -mt-1">
                    %
                  </span>
                </div>
                <div className="text-[18px] font-medium mr-2">
                  <span style={{ color: typeColors["Heat Exchanger  "] }}>
                    {stats.completed}
                  </span>
                  /{stats.total}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

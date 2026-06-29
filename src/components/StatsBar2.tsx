import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { EquipmentType, StepTask, typeColors } from "@/types/maintenance";

interface StatsBar2Props {
  tasks: StepTask[];
}

const equipmentTypes: EquipmentType[] = [
  "Heat Exchanger",
  "Piping",
  "Furnace",
  "Vessel",
  "Jet Ejector",
  "Strainer",
  "Electrical",
  "Instrument",
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
}

function ETypeCard({ eTypes, color = "#6C63FF" }) {
  return (
    <div
      className="relative inline-flex items-center gap-1 overflow-hidden rounded-md px-3 py-0"
      style={{
        backgroundColor: color + "18",
        border: `1.5px solid ${color}`,
      }}
    >
      <span
        className="pointer-events-none absolute -left-3 -top-3 h-8 w-8 rounded-full opacity-60 blur-xl"
        style={{ backgroundColor: color }}
      />

      <p
        className="relative font-display font-bold tracking-wide"
        style={{
          color,
          fontSize: "clamp(12px, 2.5vw, 20px)",
        }}
      >
        {eTypes}
      </p>
    </div>
  );
}

export function StatsBar2({ tasks }: StatsBar2Props) {
  const filterTasksByType = (type: EquipmentType): StepTask[] => {
    return tasks.filter((task) => task.type === type);
  };

  const isTaskComplete = (task: StepTask) => {
    return task.steps?.every((group) =>
      group.steplist?.every((step) => step.progress === 100),
    );
  };

  const getEquipmentTypeStats = (type: EquipmentType) => {
    const filtered = filterTasksByType(type);
    const total = filtered.length;
    const completed = filtered.filter(isTaskComplete).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, percentage };
  };

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      {equipmentTypes.map((eTypes) => {
        const stats = getEquipmentTypeStats(eTypes);
        const color = typeColors[eTypes];
        const colorRgb = hexToRgb(color);

        return (
          <div
            key={eTypes}
            style={{
              border: `1.5px solid rgba(${colorRgb}, 0.4)`,
              boxShadow: `
                inset 0 0 10px rgba(${colorRgb}, 0.3),
                inset 0 0 20px rgba(${colorRgb}, 0.2),
                inset 0 0 40px rgba(${colorRgb}, 0.1)
              `,
              background: "rgba(255,255,255,0.85)",
            }}
            className="flex items-center gap-4 rounded-xl p-2"
          >
            <div className="flex flex-col items-start justify-start">
              <ETypeCard eTypes={eTypes} color={color} />

              <div className="mt-2 flex items-center gap-2">
                <div className="relative aspect-square w-36">
                  <CircularProgressbar
                    value={stats.percentage}
                    text=""
                    circleRatio={0.75}
                    strokeWidth={18}
                    styles={buildStyles({
                      rotation: 1 / 2 + 1 / 8,
                      strokeLinecap: "butt",
                      trailColor: "#eeeeee",
                      pathColor: color,
                    })}
                  />

                  <div className="absolute inset-4 mt-8 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-1 leading-none">
                      <span className="text-[20px] font-bold text-gray-900">
                        {stats.percentage.toFixed(2)}
                      </span>
                      <span className="-mt-1 text-[14px] font-bold text-gray-900">
                        %
                      </span>
                    </div>
                    <div className="mr-2 text-[18px] font-medium">
                      <span style={{ color }}>{stats.completed}</span>/{stats.total}
                    </div>
                  </div>
                </div>

                <img
                  src={`/${eTypes}.png`}
                  alt={eTypes}
                  className="h-auto w-[clamp(24px,8vw,84px)] object-contain"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

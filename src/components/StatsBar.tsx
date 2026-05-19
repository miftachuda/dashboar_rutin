import { StepTask } from "@/types/maintenance";
import { Wrench, CheckCircle2, Clock, ChartNoAxesCombined } from "lucide-react";
import StepsModal from "./CompletedSteps";
import { useState } from "react";

interface StatsBarProps {
  tasks: StepTask[];
}

export function StatsBar({ tasks }: StatsBarProps) {
  const totalEquipments = tasks.length;

  const totalSteps = tasks.reduce(
    (a, t) => a + t.steps.reduce((b, s) => b + s.steplist.length, 0),
    0,
  );

  const completedSteps = tasks.reduce(
    (a, t) =>
      a +
      t.steps.reduce(
        (b, s) => b + s.steplist.filter((i) => i.status === "completed").length,
        0,
      ),
    0,
  );
  const notyetSteps = tasks.reduce(
    (a, t) =>
      a +
      t.steps.reduce(
        (b, s) => b + s.steplist.filter((i) => i.status === "not yet").length,
        0,
      ),
    0,
  );
  const inProgressSteps = tasks.reduce(
    (a, t) =>
      a +
      t.steps.reduce(
        (b, s) =>
          b + s.steplist.filter((i) => i.status === "in-progress").length,
        0,
      ),
    0,
  );

  const completedEquipments = tasks.filter((t) =>
    t.steps.every((s) => s.steplist.every((i) => i.status === "completed")),
  ).length;

  const allItems = tasks.flatMap(
    (t) => t.steps?.flatMap((s) => s.steplist || []) || [],
  );

  const overallPercent = (
    totalEquipments > 0 ? (completedEquipments / totalEquipments) * 100 : 0
  ).toFixed(2);
  // allItems.length > 0
  //   ? (
  //       allItems.reduce((sum, item) => sum + (item.progress ?? 0), 0) /
  //       allItems.length
  //     ).toFixed(2)
  //   : "0.00";
  const stats = [
    {
      label: "Steps In Progress",
      value: inProgressSteps,
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Overall Progress",
      value: `${overallPercent}%`,
      icon: ChartNoAxesCombined,
      color: "text-green-500",
    },
  ];
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
      <div
        key={"Total Equipments"}
        className="bg-card rounded-xl border p-4 flex items-center gap-4"
      >
        <div
          className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground`}
        >
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-row items-center gap-1">
            <p className="text-2xl font-display font-bold text-card-foreground">
              {completedEquipments}
            </p>
            <p className="text-xs text-foreground">Joblists Completed</p>
          </div>
          <p className="text-xs text-muted-foreground">
            From {totalEquipments} Joblists
          </p>
        </div>
      </div>
      <div
        key={"Total Steps"}
        className="bg-card rounded-xl border p-4 flex items-center gap-4"
      >
        <div
          className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-success`}
        >
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div
          onClick={() => setOpen(true)}
          className="cursor-pointer hover:opacity-80 transition"
        >
          <div className="flex flex-row items-center gap-1">
            <p className="text-2xl font-display font-bold text-card-foreground">
              {completedSteps}
            </p>
            <p className="text-xs text-foreground">Steps Completed</p>
          </div>
          <p className="text-xs text-muted-foreground">
            From {totalSteps} Steps
          </p>
        </div>

        <StepsModal
          open={open}
          onClose={() => setOpen(false)}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
          tasks={tasks}
        />
      </div>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border px-4 pt-4 pb-1 flex items-center gap-4"
        >
          <div
            className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}
          >
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p
              className={`text-2xl font-display font-bold text-card-foreground ${stat.color}`}
            >
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

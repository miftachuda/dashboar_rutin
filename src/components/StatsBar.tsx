import { useState } from "react";
import { ChartNoAxesCombined, CheckCircle2, Clock, Wrench } from "lucide-react";
import { StepTask } from "@/types/maintenance";
import StepsModal from "./CompletedSteps";

interface StatsBarProps {
  tasks: StepTask[];
}

export function StatsBar({ tasks }: StatsBarProps) {
  const [open, setOpen] = useState(false);
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

  const inProgressSteps = tasks.reduce(
    (a, t) =>
      a +
      t.steps.reduce(
        (b, s) => b + s.steplist.filter((i) => i.status === "in-progress").length,
        0,
      ),
    0,
  );

  const completedEquipments = tasks.filter((t) =>
    t.steps.every((s) => s.steplist.every((i) => i.status === "completed")),
  ).length;

  const overallPercent = (
    totalEquipments > 0 ? (completedEquipments / totalEquipments) * 100 : 0
  ).toFixed(2);

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

  return (
    <div className="mb-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-row items-center gap-1">
            <p className="font-display text-2xl font-bold text-card-foreground">
              {completedEquipments}
            </p>
            <p className="text-xs text-foreground">Joblists Completed</p>
          </div>
          <p className="text-xs text-muted-foreground">
            From {totalEquipments} Joblists
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div
          onClick={() => setOpen(true)}
          className="cursor-pointer transition hover:opacity-80"
        >
          <div className="flex flex-row items-center gap-1">
            <p className="font-display text-2xl font-bold text-card-foreground">
              {completedSteps}
            </p>
            <p className="text-xs text-foreground">Steps Completed</p>
          </div>
          <p className="text-xs text-muted-foreground">From {totalSteps} Steps</p>
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
          className="flex items-center gap-4 rounded-xl border bg-card px-4 pb-1 pt-4"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${stat.color}`}
          >
            <stat.icon className="h-5 w-5" />
          </div>
          <div>
            <p
              className={`font-display text-2xl font-bold text-card-foreground ${stat.color}`}
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

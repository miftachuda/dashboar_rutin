import { StepTask, typeClasses, typeLabels } from "@/types/maintenance";

type Props = {
  open: boolean;
  onClose: () => void;
  completedSteps: number;
  totalSteps: number;
  tasks: StepTask[];
};

export default function StepsModal({
  open,
  onClose,
  completedSteps,
  totalSteps,
  tasks,
}: Props) {
  if (!open) return null;

  const filteredTasks = tasks.filter((task) =>
    (task.steps || []).some((group) =>
      (group.steplist || []).some((step) => step.progress === 100),
    ),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative max-h-[80vh] min-w-fit overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">
            Completed Steps ({completedSteps})
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            From {totalSteps} total steps
          </p>

          {filteredTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No completed steps yet
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredTasks.map((task) => {
                const allSteps = task.steps?.flatMap((g) => g.steplist || []) || [];
                const isCompleted =
                  allSteps.length > 0 && allSteps.every((s) => s.progress === 100);

                return (
                  <li key={task.id} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="flex flex-row gap-3">
                      <span
                        className={`select-none rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider ${typeClasses[task.type]}`}
                      >
                        {typeLabels[task.type]}
                      </span>
                      <div className="font-medium">{task.title}</div>
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {isCompleted ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.equipment}</span>
                    </div>

                    {task.steps.map((group) => (
                      <div key={group.id}>
                        {group.steplist
                          .filter((step) => step.progress === 100)
                          .map((step) => (
                            <li
                              key={step.id}
                              className="mb-3 rounded-lg border px-3 py-2 text-sm"
                            >
                              <div className="flex flex-row gap-2">
                                <div className="text-xs text-muted-foreground">OK</div>
                                <div className="font-medium">{step.steptitle}</div>
                              </div>
                            </li>
                          ))}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";

import {
  EquipmentType,
  StepGroup,
  StepStatus,
  StepTask,
} from "@/types/maintenance";
import { StepProgress } from "@/components/StepProgress";
import { StatsBar } from "@/components/StatsBar";
import { pb } from "@/lib/pocketbase";

import { toast } from "sonner";
import { StatsBar2 } from "@/components/StatsBar2";
import Highlight from "@/components/Highlight";

import { StepAdditional } from "@/components/StepAdditionals";
import { AddStatbar } from "@/components/AddStatBar";
import ReportTable from "@/components/ReportTable";
import ExportTable from "@/components/ExportTable";
import AddJoblistModal from "@/components/AddJoblistModal";
import { Plus } from "lucide-react";

export const equipmentTypes: EquipmentType[] = ["Heat Exchanger", "Piping"];
export default function AdditionalsJoblist() {
  const [tasks, setTasks] = useState<StepTask[]>([]);
  const [search, setSearch] = useState("");
  const [prefixFilter, setPrefixFilter] = useState<string | null>(null);
  const [selectedType, setselectedType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const cycleStatus = (current: StepStatus): StepStatus => {
    if (current === "not yet") return "in-progress";
    if (current === "in-progress") return "completed";
    return "not yet";
  };

  const filteredTasks = tasks.filter((task) => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      task.title?.toLowerCase().includes(q) ||
      task.steps?.some(
        (step) =>
          step.stepname?.toLowerCase().includes(q) ||
          step.steplist?.some((item) =>
            item.steptitle?.toLowerCase().includes(q),
          ),
      ) ||
      task.equipment?.toLowerCase().includes(q);

    const cleanTitle = task.title
      ?.replace(/\s+/g, "") // hapus semua spasi
      .toUpperCase();

    const matchPrefix =
      !prefixFilter ||
      cleanTitle?.substring(0, 3) === prefixFilter.toUpperCase();
    const matchType =
      !selectedType || // kalau belum pilih → semua lolos
      task.type === selectedType;

    return matchSearch && matchPrefix && matchType;
  });
  const prefixes = ["021", "022", "023", "024", "025"];
  const handleStepToggle = async (
    taskId: string,
    stepId: string,
    itemId: string,
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSteps = task.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            steplist: step.steplist.map((item) =>
              item.id === itemId
                ? { ...item, status: cycleStatus(item.status) }
                : item,
            ),
          }
        : step,
    );

    // Update UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, steps: updatedSteps } : t)),
    );

    // Sync to PocketBase
    try {
      await pb.collection("additionals_ps2027").update(taskId, {
        steps: updatedSteps,
        updatedCustom: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to sync with PocketBase", err);
    }
  };
  const syncTaskToPocketBase = async (task) => {
    try {
      await pb.collection("additionals_ps2027").update(task.id, {
        steps: task.steps,
        updatedCustom: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to sync with PocketBase", err);
    }
  };

  const [taskStates, setTaskStates] = useState<{
    [taskId: string]: {
      isDirty: boolean;
      isSaving: boolean;
      isSaved: boolean;
    };
  }>({});
  const updateTaskState = (taskId: string, newState: Partial<any>) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        ...newState,
      },
    }));
  };
  const handleSave = async (taskId: string) => {
    try {
      updateTaskState(taskId, { isSaving: true, isSaved: false });

      // API call here

      await syncTaskToPocketBase(tasks.find((t) => t.id === taskId)!);
      updateTaskState(taskId, {
        isSaving: false,
        isDirty: false,
        isSaved: true,
      });
      toast.success("Changes saved");
    } catch (err) {
      updateTaskState(taskId, { isSaving: false });
      toast.error("Failed to save changes");
    }
  };

  const handleDeleteJoblist = async (taskId: string) => {
    try {
      await pb.collection("additionals_ps2027").delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Joblist deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete joblist");
    }
  };
  function recordToStepTask(r: any): StepTask {
    let steps: StepGroup[] = [];

    try {
      steps = typeof r.steps === "string" ? JSON.parse(r.steps) : r.steps;
    } catch {
      steps = [];
    }

    const photos = !r.photos
      ? []
      : Array.isArray(r.photos)
        ? r.photos
        : [r.photos]; // <-- fix here

    return {
      id: r.id,
      title: r.tag ?? "",
      equipment: r.job ?? "",
      type: r.type ?? "",
      dicipline: r.dicipline ?? "",
      priority: r.priority ?? "low",
      assignee: r.assignee ?? "",
      lastmodified: r.updatedCustom ?? Date.now(),
      steps,
      photos,
    };
  }
  const [sortOption, setSortOption] = useState("tag");
  async function loadTasks() {
    try {
      const pitstopRecords = await pb.collection("additionals_ps2027").getFullList({
        sort: sortOption,
      });

      const fetchedTasks: StepTask[] = pitstopRecords.map(recordToStepTask);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadTasks();
  }, [sortOption]);
  useEffect(() => {
    loadTasks();
  }, []);

  const getProgressByPrefix = (prefix: string) => {
    const filteredTasks = tasks.filter(
      (t) => t.title?.substring(0, 3).toUpperCase() === prefix.toUpperCase(),
    );

    if (filteredTasks.length === 0) return 0;

    // Ambil semua steplist dari semua steps
    const allItems = filteredTasks.flatMap(
      (t) => t.steps?.flatMap((s) => s.steplist || []) || [],
    );

    if (allItems.length === 0) return 0;

    const total = allItems.reduce((sum, item) => sum + (item.progress || 0), 0);

    return Math.round(total / allItems.length);
  };
  const allPrefixes = ["All", ...prefixes];
  const getTotalProgress = () => {
    const allItems = tasks.flatMap(
      (t) => t.steps?.flatMap((s) => s.steplist || []) || [],
    );

    if (!allItems.length) return 0;

    const total = allItems.reduce((sum, item) => sum + (item.progress ?? 0), 0);

    return Number((total / allItems.length).toFixed(2));
  };
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};

    prefixes.forEach((p) => {
      map[p] = getProgressByPrefix(p);
    });

    map["All"] = getTotalProgress();

    return map;
  }, [tasks, prefixes]);
  const prefixColors: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      accent: string;
    }
  > = {
    All: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
      accent: "text-gray-500",
    },
    "021": {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
      accent: "text-blue-600",
    },
    "022": {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
      accent: "text-green-600",
    },
    "023": {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
      accent: "text-yellow-600",
    },

    // ✅ Added ones
    "024": {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
      accent: "text-purple-600",
    },
    "041": {
      bg: "bg-pink-100",
      text: "text-pink-800",
      border: "border-pink-300",
      accent: "text-pink-600",
    },
    "025": {
      bg: "bg-indigo-100",
      text: "text-indigo-800",
      border: "border-indigo-300",
      accent: "text-indigo-600",
    },
    "002": {
      bg: "bg-teal-100",
      text: "text-teal-800",
      border: "border-teal-300",
      accent: "text-teal-600",
    },
  };
  return (
      <div className="min-h-screen bg-background">
        {/* Content */}
        <main className="max-w-8xl  px-4 sm:px-6 lg:px-8 py-8">
          <AddStatbar tasks={tasks} />
          <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <input
              type="text"
              placeholder="Search joblist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Joblist</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-4 mt-1 mb-2">
            {allPrefixes.map((p) => {
              const isAll = p === "All";
              const isActive = (isAll && !prefixFilter) || prefixFilter === p;

              const color = prefixColors[p] || prefixColors["All"];

              return (
                <button
                  key={p}
                  onClick={() => setPrefixFilter(isAll ? null : p)}
                  className={`flex flex-col items-center justify-center 
              w-20 h-8 rounded-xl border transition-all duration-200 ease-out
              ${
                isActive
                  ? `${color.bg} ${color.text} ${color.border}
                     scale-110 shadow-lg ring-2 ring-offset-2 ${color.accent}`
                  : `${color.bg} ${color.text} ${color.border}
                     opacity-70 hover:opacity-100 hover:scale-105`
              }`}
                >
                  {/* Title */}
                  <div className="text-xs font-semibold capitalize">{p}</div>

                  {/* Percentage */}
                  <div
                    className={`text-xs font-bold ${
                      isActive ? color.accent : `${color.accent} opacity-70`
                    }`}
                  >
                    {progressMap[p] ?? 0}%
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-1 mb-2">
            <button
              onClick={() => setselectedType(null)}
              className={`px-3 py-1 rounded-md border text-sm ${
                selectedType === null ? "bg-primary text-white" : "bg-white"
              }`}
            >
              All
            </button>

            {equipmentTypes.map((p) => (
              <button
                key={p}
                onClick={() => setselectedType(p)}
                className={`px-3 py-1 rounded-md border text-sm ${
                  selectedType === p ? "bg-primary text-white" : "bg-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border px-2 py-1 rounded font-light text-xs"
          >
            <option value="tag">Ascending</option>
            <option value="-tag">Descending</option>
            <option value="-updatedCustom">Latest Updated</option>
            <option value="updatedCustom">Oldest Updated</option>
          </select>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
            </div>
          ) : (
            <div>
              <div>
                {filteredTasks.length} Joblist{""}
                {filteredTasks.length !== 1 && "s"} found
              </div>
              <div className="grid items-start grid-cols-1 gap-5">
                {filteredTasks.map((task) => (
                  <StepAdditional
                    key={task.id}
                    task={task}
                    onStepToggle={handleStepToggle}
                    setTasks={setTasks}
                    state={taskStates[task.id] || {}}
                    updateTaskState={updateTaskState}
                    onSave={handleSave}
                    onDeleteJoblist={handleDeleteJoblist}
                    colID="additionals_ps2027"
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        <AddJoblistModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={loadTasks}
          collectionName="additionals_ps2027"
        />
      </div>
  );
}

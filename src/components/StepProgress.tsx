import {
  typeClasses,
  StepTask,
  Priority,
  EquipmentType,
} from "@/types/maintenance";
import { Check, Circle, Hourglass, Pencil, Plus, Trash2, MoreHorizontal } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import DateRange from "./DateRange";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import ProgressSlider from "./ProgressSlider";
import AutoResizeTextarea from "./TextArea";
import { baseUrl, pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import MultiImageUpload from "./MultiImageUpload";
import { Collapsible } from "./Collapsible";
import ImagePreviewRow from "./ImagePreview";

type DeleteTarget = { type: "step"; id: string } | { type: "item"; stepId: string; id: string } | null;

function ItemMenu({
  onEdit,
  onAdd,
  onDelete,
}: {
  onEdit?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        title="More options"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border bg-popover shadow-xl py-1 animate-in fade-in zoom-in-95">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAdd(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
            >
              <Plus size={12} />
              Add Item
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface StepProgressProps {
  task: StepTask;
  onStepToggle: (taskId: string, stepId: string, itemId: string) => void;
  setTasks: React.Dispatch<React.SetStateAction<StepTask[]>>;
  state: {
    isDirty?: boolean;
    isSaving?: boolean;
    isSaved?: boolean;
  };
  updateTaskState: (taskId: string, state: any) => void;
  onSave: (taskId: string) => void;
  colID: string;
}

const priorityClasses: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-warning/20 text-warning-foreground",
  critical: "bg-destructive/15 text-destructive",
};

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const typeLabels: Record<EquipmentType, string> = {
  "Heat Exchanger": "Heat Exchanger",
  Piping: "Piping",
  Column: "Column",
  Furnace: "Furnace",
  Vessel: "Vessel",
  Pump: "Pump",
  Compressor: "Compressor",
  "Jet Ejector": "Jet Ejector",
  Strainer: "Strainer",
  Instrument: "Instrument",
  Electrical: "Electrical",
  Other: "Other",
};

function getDuration(start?: number, end?: number) {
  if (!start || !end) return "-";

  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return "-";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

export function StepProgress({
  task,
  onStepToggle,
  setTasks,
  state,
  updateTaskState,
  onSave,
  colID,
}: StepProgressProps) {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setOpenSteps((prev) => ({
      [stepId]: !prev[stepId],
    }));
  };

  useEffect(() => {
    setOpenSteps((prev) => {
      const updated = { ...prev };

      task.steps.forEach((s) => {
        if (!(s.id in updated)) {
          updated[s.id] = false;
        }
      });

      return updated;
    });
  }, [task.steps]);

  function formatDate(ts?: number) {
    if (!ts) return "-- ---";
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }

  function formatTime(ts?: number) {
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const handleTimeChange = (
    taskId: string,
    stepId: string,
    itemId: string,
    field: "startdate" | "enddate",
    value: number,
  ) => {
    updateTaskState(task.id, {
      isDirty: true,
      isSaved: false,
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      steplist: step.steplist.map((item) =>
                        item.id === itemId ? { ...item, [field]: value } : item,
                      ),
                    }
                  : step,
              ),
            }
          : t,
      ),
    );
  };

  const totalProgress = task.steps.reduce(
    (acc, step) =>
      acc + step.steplist.reduce((sum, item) => sum + (item.progress || 0), 0),
    0,
  );

  const totalItems = task.steps.reduce(
    (acc, step) => acc + step.steplist.length,
    0,
  );

  const percent = totalItems > 0 ? Math.round(totalProgress / totalItems) : 0;

  const allDone = task.steps.every((s) =>
    s.steplist.every((i) => i.status === "completed"),
  );

  const onUpdateDescription = (
    taskId: string,
    stepId: string,
    itemId: string,
    value: string,
  ) => {
    updateTaskState(task.id, {
      isDirty: true,
      isSaved: false,
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      steplist: step.steplist.map((item) =>
                        item.id === itemId
                          ? { ...item, description: value }
                          : item,
                      ),
                    }
                  : step,
              ),
            }
          : t,
      ),
    );
  };

  const handleProgressChange = (
    taskId: string,
    stepId: string,
    itemId: string,
    val: number,
  ) => {
    updateTaskState(task.id, {
      isDirty: true,
      isSaved: false,
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      steplist: step.steplist.map((item) =>
                        item.id === itemId
                          ? {
                              ...item,
                              progress: val,
                              status:
                                val === 100
                                  ? "completed"
                                  : val > 0
                                    ? "in-progress"
                                    : "not yet",
                            }
                          : item,
                      ),
                    }
                  : step,
              ),
            }
          : t,
      ),
    );
  };

  // ─── Step name inline edit ────────────────────────────────
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [stepNameDraft, setStepNameDraft] = useState("");

  const startEditStep = (stepId: string, currentName: string) => {
    setEditingStepId(stepId);
    setStepNameDraft(currentName);
  };

  const saveEditStep = (stepId: string) => {
    if (!stepNameDraft.trim()) {
      setEditingStepId(null);
      return;
    }
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, stepname: stepNameDraft.trim() } : s,
              ),
            }
          : t,
      ),
    );
    setEditingStepId(null);
  };

  const cancelEditStep = () => {
    setEditingStepId(null);
    setStepNameDraft("");
  };

  // ─── Steplist item title inline edit ───────────────────
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitleDraft, setItemTitleDraft] = useState("");

  const startEditItem = (itemId: string, currentTitle: string) => {
    setEditingItemId(itemId);
    setItemTitleDraft(currentTitle);
  };

  const saveEditItem = (stepId: string, itemId: string) => {
    if (!itemTitleDraft.trim()) {
      setEditingItemId(null);
      return;
    }
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      steplist: s.steplist.map((i) =>
                        i.id === itemId
                          ? { ...i, steptitle: itemTitleDraft.trim() }
                          : i,
                      ),
                    }
                  : s,
              ),
            }
          : t,
      ),
    );
    setEditingItemId(null);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setItemTitleDraft("");
  };

  // ─── Delete steplist item ──────────────────────────────
  const deleteSteplistItem = (stepId: string, itemId: string) => {
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId
                  ? { ...s, steplist: s.steplist.filter((i) => i.id !== itemId) }
                  : s,
              ),
            }
          : t,
      ),
    );
  };

  // ─── Delete step ──────────────────────────────────────
  const deleteStep = (stepId: string) => {
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) }
          : t,
      ),
    );
  };

  // ─── Add steplist item ────────────────────────────────
  const addSteplistItem = (stepId: string) => {
    const newItem = {
      id: crypto.randomUUID(),
      steptitle: "",
      description: "",
      progress: 0,
      status: "not yet" as const,
    };
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, steplist: [...s.steplist, newItem] } : s,
              ),
            }
          : t,
      ),
    );
    setEditingItemId(newItem.id);
    setItemTitleDraft("");
  };

  // ─── Add step ────────────────────────────────────────
  const addStep = () => {
    const newStep = {
      id: crypto.randomUUID(),
      stepname: "",
      steplist: [],
    };
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, steps: [...t.steps, newStep] } : t,
      ),
    );
    setEditingStepId(newStep.id);
    setStepNameDraft("");
  };

  const [pic, setPic] = useState(task.assignee || "");
  const [editing, setEditing] = useState(false);
  const [photosMap, setPhotosMap] = useState<Record<string, File[]>>({});

  const handlePhotosChange = (files: File[], taskId: string) => {
    setPhotosMap((prev) => ({
      ...prev,
      [taskId]: files,
    }));
  };

  const handleSave = async () => {
    setEditing(false);

    if (pic !== task.assignee) {
      await onUpdateAssignee(task.id, pic);
    }
  };

  const onUpdateAssignee = async (taskId: string, assignee: string) => {
    try {
      await pb.collection("pitstop2027").update(taskId, {
        assignee,
        updatedCustom: new Date().toISOString(),
      });
      toast.success("PIC updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update PIC");
    }
  };

  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [imagesMap, setImagesMap] = useState<Record<string, string[]>>({});
  const [uploadDoneKey, setUploadDoneKey] = useState(0);

  const handleUpload = async (taskId: string, colID: string) => {
    const files = photosMap[taskId];
    if (!files || files.length === 0) return;

    setUploadingMap((prev) => ({ ...prev, [taskId]: true }));

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("photos+", file);
    });

    try {
      await pb.collection(colID).update(taskId, formData);

      const updated = await pb.collection(colID).getOne(taskId);

      setImagesMap((prev) => ({
        ...prev,
        [taskId]: updated.photos || [],
      }));

      setPhotosMap((prev) => ({
        ...prev,
        [taskId]: [],
      }));
      setUploadDoneKey((prev) => prev + 1);
      toast.success("Photos uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploadingMap((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  return (
    <div className="bg-card rounded-xl border p-3 hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between">
        <div className="flex flex-row gap-4">
          <div className="flex flex-row items-center">
            <h3 className="font-display select-none text-base font-semibold text-card-foreground">
              {task.title}
              <span className="mx-1">•</span>
            </h3>
            <div className="select-none text-[9px] text-muted-foreground">
              last modified:{" "}
              <span className="italic text-[9px] text-muted-foreground">
                {formatDistanceToNow(new Date(task.lastmodified), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
          <span
            className={`select-none rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider ${typeClasses[task.type]}`}
          >
            {typeLabels[task.type]}
          </span>
        </div>

        <button
          onClick={() => onSave(task.id)}
          disabled={!state.isDirty || state.isSaving}
          className={`rounded-md px-2 py-1 text-[10px] font-mono select-none transition ${
            state.isSaved
              ? "bg-green-500/10 text-green-400"
              : state.isDirty
                ? "bg-blue-500/10 text-blue-600"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          {state.isSaving
            ? "Saving..."
            : state.isSaved
              ? "Saved ✓"
              : state.isDirty
                ? "Save"
                : "Saved"}
        </button>
      </div>

      <div className="mb-1">
        <p className="font-mono text-sm text-blue-800 mt-0.5">
          {task.equipment}
        </p>
        <div className="mb-1 flex items-center justify-between">
          <span className="select-none text-xs font-medium text-muted-foreground">
            Progress
          </span>
          <span
            className={`text-xs font-mono font-semibold ${allDone ? "text-success" : "text-foreground"}`}
          >
            {percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${allDone ? "bg-success" : "bg-accent"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
        <span>
          PIC:{" "}
          {editing ? (
            <input
              className="rounded border px-1 text-foreground"
              value={pic}
              autoFocus
              onChange={(e) => setPic(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setPic(task.assignee);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <strong
              className="cursor-pointer text-foreground"
              onClick={() => setEditing(true)}
            >
              {pic || "—"}
            </strong>
          )}
        </span>
      </div>

      {/* ─── Steps ─────────────────────────────────────────── */}
      <div className="space-y-1">
        {task.steps.map((step) => {
          if (!step) return null;

          const totalStepProgress = (step.steplist || []).reduce(
            (acc, item) => acc + (item.progress || 0),
            0,
          );

          const avgProgress =
            step.steplist?.length > 0
              ? totalStepProgress / step.steplist.length
              : 0;

          const isCompleted = step.steplist?.every(
            (item) => item.progress === 100,
          );

          return (
            <div key={step.id} className="rounded-lg p-1">
              <div>
                {/* Step header */}
                <div className="mb-1 flex items-center gap-2">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="flex flex-1 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${openSteps[step.id] ? "" : "-rotate-90"}`}
                    />

                    {editingStepId === step.id ? (
                      <input
                        autoFocus
                        value={stepNameDraft}
                        onChange={(e) => setStepNameDraft(e.target.value)}
                        onBlur={() => saveEditStep(step.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditStep(step.id);
                          if (e.key === "Escape") cancelEditStep();
                          e.stopPropagation();
                        }}
                        className="flex-1 rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-sky-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 text-left font-bold text-foreground"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditStep(step.id, step.stepname);
                        }}
                      >
                        {step.stepname || <span className="italic text-muted-foreground">Unnamed Step</span>}
                      </span>
                    )}
                  </button>

                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                      avgProgress === 100
                        ? "border-green-500 bg-white text-green-600 shadow-[inset_0_0_6px_rgba(34,197,94,0.5)]"
                        : "border-orange-400 bg-white text-orange-500 shadow-[inset_0_0_6px_rgba(251,146,60,0.5)]"
                    }`}
                  >
                    {avgProgress.toFixed(2)}%
                  </span>

                  <ItemMenu
                    onEdit={() => startEditStep(step.id, step.stepname)}
                    onAdd={() => addSteplistItem(step.id)}
                    onDelete={() => setDeleteTarget({ type: "step", id: step.id })}
                  />
                </div>

                {/* Step body */}
                {openSteps[step.id] && (
                  <div>
                    {step.steplist.map((item) => {
                      if (!item) return null;

                      return (
                        <div
                          key={item.id}
                          className="my-1 ml-6 mr-2 flex items-start gap-1 rounded-lg border py-2"
                        >
                          <div className="flex w-full flex-col">
                            {/* HEADER */}
                            <div className="flex items-center gap-1 px-3">
                              {/* Status icon */}
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                  item.status === "completed"
                                    ? "bg-success text-success-foreground"
                                    : ""
                                } ${
                                  item.status === "in-progress"
                                    ? "bg-accent text-accent-foreground"
                                    : ""
                                } ${
                                  item.status === "not yet"
                                    ? "bg-secondary text-muted-foreground"
                                    : ""
                                }`}
                              >
                                {item.status === "completed" ? (
                                  <Check className="h-2.5 w-2.5" />
                                ) : item.status === "in-progress" ? (
                                  <Hourglass className="h-2.5 w-2.5" />
                                ) : (
                                  <Circle className="h-2 w-2" />
                                )}
                              </div>

                              {/* Editable steptitle */}
                              {editingItemId === item.id ? (
                                <input
                                  autoFocus
                                  value={itemTitleDraft}
                                  onChange={(e) => setItemTitleDraft(e.target.value)}
                                  onBlur={() => saveEditItem(step.id, item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditItem(step.id, item.id);
                                    if (e.key === "Escape") cancelEditItem();
                                  }}
                                  className="flex-1 rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-400"
                                />
                              ) : (
                                <p
                                  className={`flex-1 truncate text-xs font-medium ${
                                    item.status === "completed"
                                      ? "text-card-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    startEditItem(item.id, item.steptitle);
                                  }}
                                >
                                  {item.steptitle || <span className="italic">Unnamed item</span>}
                                </p>
                              )}

                              <ItemMenu
                                onEdit={() => startEditItem(item.id, item.steptitle)}
                                onDelete={() =>
                                  setDeleteTarget({
                                    type: "item",
                                    stepId: step.id,
                                    id: item.id,
                                  })
                                }
                              />
                            </div>

                            {/* BODY */}
                            <div>
                              <div className="flex items-center gap-3 rounded-md px-2">
                                <div
                                  className={`min-w-[80px] shrink-0 rounded-md px-2 py-0.5 text-center text-[10px] font-mono uppercase tracking-wider ${
                                    item.status === "completed"
                                      ? "bg-success/10 text-success"
                                      : ""
                                  } ${
                                    item.status === "in-progress"
                                      ? "bg-accent/15 text-accent-foreground"
                                      : ""
                                  } ${
                                    item.status === "not yet"
                                      ? "bg-secondary text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {item.status}
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <div className="mt-1 flex items-center gap-2">
                                    <DateRange
                                      item={item}
                                      taskId={task.id}
                                      stepId={step.id}
                                      handleTimeChange={handleTimeChange}
                                      formatDate={formatDate}
                                      formatTime={formatTime}
                                      getDuration={getDuration}
                                    />
                                  </div>
                                </div>
                              </div>

                              <ProgressSlider
                                value={item.progress}
                                taskId={task.id}
                                stepId={step.id}
                                itemId={item.id}
                                onChange={handleProgressChange}
                              />

                              <div className="min-w-0 flex-1 px-3 py-2">
                                <AutoResizeTextarea
                                  value={item.description || ""}
                                  onChange={(e) => {
                                    onUpdateDescription(
                                      task.id,
                                      step.id,
                                      item.id,
                                      e.target.value,
                                    );
                                  }}
                                  placeholder="Click to add description"
                                  className="w-full rounded border bg-muted/40 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* + Add Step button */}
        <button
          onClick={addStep}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-sky-200 py-2 text-xs font-semibold text-sky-500 hover:border-sky-400 hover:text-sky-600 transition-all"
        >
          <Plus size={14} />
          Add Step
        </button>

        <ImagePreviewRow
          images={imagesMap[task.id] || task.photos || []}
          recordId={task.id}
          baseUrl={baseUrl}
          collectionID={colID}
        />
      </div>

      <Collapsible title="Upload Photos">
        <MultiImageUpload
          onChange={handlePhotosChange}
          taskId={task.id}
          uploadedTrigger={uploadDoneKey}
        />
        <button
          onClick={() => handleUpload(task.id, colID)}
          disabled={uploadingMap[task.id]}
          className={`mt-2 flex items-center gap-2 rounded px-3 py-1 text-white ${
            uploadingMap[task.id]
              ? "cursor-not-allowed bg-gray-400"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {uploadingMap[task.id] && (
            <svg
              className="h-4 w-4 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
          {uploadingMap[task.id] ? "Uploading..." : "Upload"}
        </button>
      </Collapsible>

      {/* Controlled Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !confirmLoading && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Confirm Delete</h2>
            <p className="mb-6 text-sm text-gray-600">
              {deleteTarget.type === "step"
                ? "Delete this step and all its items? This cannot be undone."
                : "Delete this steplist item? This cannot be undone."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !confirmLoading && setDeleteTarget(null)}
                disabled={confirmLoading}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    if (deleteTarget.type === "step") {
                      deleteStep(deleteTarget.id);
                    } else {
                      deleteSteplistItem(deleteTarget.stepId, deleteTarget.id);
                    }
                  } finally {
                    setConfirmLoading(false);
                    setDeleteTarget(null);
                  }
                }}
                disabled={confirmLoading}
                className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
              >
                {confirmLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

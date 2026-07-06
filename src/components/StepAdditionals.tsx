import {
  typeClasses,
  StepTask,
  Priority,
  EquipmentType,
} from "@/types/maintenance";
import { Check, Circle, Hourglass, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DateRange from "./DateRange";
import { formatDistanceToNow, set } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import ProgressSlider from "./ProgressSlider";
import AutoResizeTextarea from "./TextArea";
import { baseUrl, pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import MultiImageUpload from "./MultiImageUpload";
import { Collapsible } from "./Collapsible";
import ImagePreviewRow from "./ImagePreview";
import MinImagePreviewRow from "./MinImagePreview";
import CircularProgress from "./CircuralMin";

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
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border bg-popover shadow-lg z-50 p-1 flex flex-col gap-1 overflow-hidden">
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAdd(); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Check size={14} />
              Add Item
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface StepAdditionalProps {
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
  onDeleteJoblist?: (taskId: string) => void;
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
export function StepAdditional({
  task,
  onStepToggle,
  setTasks,
  state,
  updateTaskState,
  onSave,
  colID,
  onDeleteJoblist,
}: StepAdditionalProps) {
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
          updated[s.id] = false; // default collapsed
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
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.map((step) =>
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
          : task,
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

  // rata-rata progress
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
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.map((step) =>
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
          : task,
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
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      steplist: step.steplist.map((item) =>
                        item.id === itemId
                          ? {
                              ...item,
                              progress: val, // ✅ simpan progress per item
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
          : task,
      ),
    );
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
  const onUpdateAssignee = async (taskId, assignee) => {
    try {
      await pb.collection(colID).update(taskId, {
        assignee,
        updatedCustom: new Date().toISOString(),
      });
      toast.success("PIC updated");
    } catch (err) {
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

      // ✅ update server images preview
      setImagesMap((prev) => ({
        ...prev,
        [taskId]: updated.photos || [],
      }));

      // 🔥 CLEAR LOCAL PREVIEW
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

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepNameDraft, setStepNameDraft] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitleDraft, setItemTitleDraft] = useState("");

  type DeleteTarget = { type: "step"; id: string } | { type: "item"; stepId: string; id: string } | { type: "joblist" } | null;
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleDeleteStep = (stepId: string) => {
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) }
          : t,
      ),
    );
  };

  const handleDeleteSteplistItem = (stepId: string, itemId: string) => {
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

  const startEditStep = (stepId: string, currentName: string) => {
    setEditingStepId(stepId);
    setStepNameDraft(currentName);
  };
  const cancelEditStep = () => {
    setEditingStepId(null);
    setStepNameDraft("");
  };
  const saveEditStep = (stepId: string) => {
    if (!stepNameDraft.trim()) {
      cancelEditStep();
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
    cancelEditStep();
  };

  const startEditItem = (itemId: string, currentTitle: string) => {
    setEditingItemId(itemId);
    setItemTitleDraft(currentTitle);
  };
  const cancelEditItem = () => {
    setEditingItemId(null);
    setItemTitleDraft("");
  };
  const saveEditItem = (stepId: string, itemId: string) => {
    if (!itemTitleDraft.trim()) {
      cancelEditItem();
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
                        i.id === itemId ? { ...i, steptitle: itemTitleDraft.trim() } : i,
                      ),
                    }
                  : s,
              ),
            }
          : t,
      ),
    );
    cancelEditItem();
  };

  const addSteplistItem = (stepId: string) => {
    const newItem = {
      id: crypto.randomUUID(),
      steptitle: "New Item",
      description: "",
      progress: 0,
      status: "not yet" as const,
    };
    updateTaskState(task.id, { isDirty: true, isSaved: false });
    setOpenSteps((prev) => ({ ...prev, [stepId]: true }));
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
    startEditItem(newItem.id, "");
  };

  return (
    <div className="bg-card rounded-xl border p-3 hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-start gap-2 ">
        <MinImagePreviewRow
          images={imagesMap[task.id] || task.photos || []}
          recordId={task.id}
          baseUrl={baseUrl}
          collectionID={colID}
        />
        <div className="flex flex-col items-start">
          <div className="flex flex-row items-end gap-2">
            <div className="flex flex-row gap-4">
              <span
                className={`text-xs select-none font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${typeClasses[task.type]}`}
              >
                {typeLabels[task.type]}
              </span>
              <div className="flex flex-row items-center">
                  <h3 className="font-display font-semibold  select-none text-base text-card-foreground">
                    {task.title}
                    <span className="mx-1">•</span>
                  </h3>
                </div>

              <span
                className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-all flex items-center justify-center
  ${
    percent === 100
      ? "bg-white text-green-600 border-green-500 ]"
      : "bg-white text-yellow-500 border-yellow-400 ]"
  }`}
              >
                {percent.toFixed(2)}%
              </span>
            </div>

            <button
              onClick={() => onSave(task.id)}
              disabled={!state.isDirty || state.isSaving}
              className={`text-[10px] font-mono px-2 py-1 select-none rounded-md transition
    ${
      state.isSaved
        ? "bg-green-500/10 text-green-400"
        : state.isDirty
          ? "bg-blue-500/10 text-blue-600"
          : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
            {onDeleteJoblist && (
              <button
                onClick={() => setDeleteTarget({ type: "joblist" })}
                className="text-[10px] font-mono px-2 py-1 select-none rounded-md bg-red-100 text-red-500 hover:bg-red-200 transition"
              >
                Delete
              </button>
            )}
          </div>
          <div className="mr-3">
            <p className="text-sm text-blue-800 font-mono mt-0.5">
              {task.equipment}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {task.steps.map((step) => {
          // 🔥 place your logic here if needed
          if (!step) return null;
          const totalProgress = (step.steplist || []).reduce(
            (acc, item) => acc + (item.progress || 0),
            0,
          );

          const avgProgress =
            step.steplist?.length > 0
              ? totalProgress / step.steplist.length
              : 0;

          const isCompleted = step.steplist?.every(
            (item) => item.progress === 100,
          );

          return (
            <div key={step.id} className="rounded-lg p-1">
              <div className="flex items-center justify-between px-3 mb-1">
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
                      className="flex-1 text-left font-bold"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditStep(step.id, step.stepname);
                      }}
                    >
                      {step.stepname || <span className="italic text-muted-foreground">Unnamed Step</span>}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
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
              </div>

              {openSteps[step.id] && (
                  <div>
                    {step.steplist.map((item) => {
                      // 🔥 optional logic per item
                      if (!item) return null;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center ml-6 mr-2 mt-2 border gap-1 my-1 rounded-lg transition-colors text-left group"
                        >
                        <div className="flex flex-col w-full">
                          {/* HEADER */}
                          <div className="flex items-center justify-between pr-2">
                            <div className="flex items-center flex-1">
                              {editingItemId === item.id ? (
                                <input
                                  autoFocus
                                  value={itemTitleDraft}
                                  onChange={(e) => setItemTitleDraft(e.target.value)}
                                  onBlur={() => saveEditItem(step.id, item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditItem(step.id, item.id);
                                    if (e.key === "Escape") cancelEditItem();
                                    e.stopPropagation();
                                  }}
                                  className="ml-2 mt-2 w-full rounded border border-sky-300 px-2 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-400"
                                />
                              ) : (
                                <p
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    startEditItem(item.id, item.steptitle);
                                  }}
                                  className={`text-xs select-none text-wrap font-medium truncate ${
                                    item.status === "completed"
                                      ? "text-card-foreground"
                                      : "text-muted-foreground"
                                  } px-3 pt-2 pb-1`}
                                >
                                  {item.steptitle || <span className="italic">Unnamed Item</span>}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div
                                className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold
                          ${item.status === "completed" ? "bg-success text-success-foreground" : ""}
                          ${item.status === "in-progress" ? "bg-accent text-accent-foreground" : ""}
                          ${item.status === "not yet" ? "bg-secondary text-muted-foreground" : ""}
                        `}
                              >
                                {item.status === "completed" ? (
                                  <Check className="w-2.5 h-2.5" />
                                ) : item.status === "in-progress" ? (
                                  <Hourglass className="w-2.5 h-2.5" />
                                ) : (
                                  <Circle className="w-2 h-2" />
                                )}
                              </div>
                              <ItemMenu
                                onEdit={() => startEditItem(item.id, item.steptitle)}
                                onDelete={() => setDeleteTarget({ type: "item", stepId: step.id, id: item.id })}
                              />
                            </div>
                          </div>

                            {/* BODY */}
                            <div>
                              <div className="flex items-center w-full gap-3 px-2 rounded-md">
                                <div
                                  className={`flex-shrink-0 min-w-[80px] text-center whitespace-nowrap
                            text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md
                            ${item.status === "completed" ? "bg-success/10 text-success" : ""}
                            ${item.status === "in-progress" ? "bg-accent/15 text-accent-foreground" : ""}
                            ${item.status === "not yet" ? "bg-secondary text-muted-foreground" : ""}
                          `}
                                >
                                  {item.status}
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex select-none items-center gap-2 mt-1">
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

                              <div className="flex-1 min-w-0 px-3 py-2">
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
                                  className="w-full text-xs 
                            bg-muted/40 border border-border rounded-[2px]
                            px-2 py-1
                            outline-none
                            focus:ring-1 focus:ring-accent
                            text-foreground placeholder:text-muted-foreground"
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
          );
        })}
      </div>
      <Collapsible title="Add Photos">
        <MultiImageUpload
          onChange={handlePhotosChange}
          taskId={task.id}
          uploadedTrigger={uploadDoneKey}
        />
        <button
          onClick={() => handleUpload(task.id, colID)}
          disabled={uploadingMap[task.id]}
          className={`mt-2 px-3 py-1 rounded text-white flex items-center gap-2 ${
            uploadingMap[task.id]
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {uploadingMap[task.id] && (
            <svg
              className="animate-spin h-4 w-4 text-white"
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

      <div className="mt-3 flex justify-end">
        <div className="select-none text-[9px] text-muted-foreground">
          last modified:{" "}
          <span className="italic text-[9px] text-muted-foreground">
            {formatDistanceToNow(new Date(task.lastmodified), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !confirmLoading && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Confirm Delete</h2>
            <p className="mb-6 text-sm text-slate-600">
              {deleteTarget.type === "joblist"
                ? "Delete this entire joblist? This cannot be undone."
                : deleteTarget.type === "step"
                ? "Delete this step and all its items? This cannot be undone."
                : "Delete this steplist item? This cannot be undone."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !confirmLoading && setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                disabled={confirmLoading}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    if (deleteTarget.type === "joblist") {
                      if (onDeleteJoblist) await onDeleteJoblist(task.id);
                    } else if (deleteTarget.type === "step") {
                      handleDeleteStep(deleteTarget.id);
                    } else if (deleteTarget.type === "item") {
                      handleDeleteSteplistItem(deleteTarget.stepId, deleteTarget.id);
                    }
                  } finally {
                    setConfirmLoading(false);
                    setDeleteTarget(null);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
                disabled={confirmLoading}
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

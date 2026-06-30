import {
  typeClasses,
  StepTask,
  Priority,
  EquipmentType,
} from "@/types/maintenance";
import { Check, Circle, Hourglass } from "lucide-react";
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
                <div className="text-[9px] text-muted-foreground select-none">
                  last modified:{" "}
                  <span className="text-[9px] text-muted-foreground italic">
                    {formatDistanceToNow(new Date(task.lastmodified), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
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
              <div>
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1 hover:text-foreground"
                >
                  <div className="flex flex-row">
                    <span>{step.stepname}</span>
                  </div>

                  {openSteps[step.id] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

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
                            <div className="flex items-center">
                              <p
                                className={`text-xs select-none text-wrap font-medium truncate ${
                                  item.status === "completed"
                                    ? "text-card-foreground"
                                    : "text-muted-foreground"
                                } px-3 pt-2 pb-1`}
                              >
                                {item.steptitle}
                              </p>

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
    </div>
  );
}

import { useState } from "react";
import { X, Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import {
  EquipmentType,
  equipmentTypes,
  Priority,
  StepGroup,
  MaintenanceStep,
} from "@/types/maintenance";
import MultiImageUpload from "./MultiImageUpload";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  collectionName?: string;
};

const disciplineOptions = ["Rotating", "Stationary", "Instrument", "Electrical"];
const priorityOptions: Priority[] = ["low", "medium", "high", "critical"];

const fieldDefaults = {
  unit: "",
  tag: "",
  job: "",
  type: "Heat Exchanger" as EquipmentType,
  discipline: "Rotating",
  priority: "low" as Priority,
  assignee: "",
};

function makeStepGroup(): StepGroup {
  return { id: crypto.randomUUID(), stepname: "", steplist: [] };
}

function makeStep(): MaintenanceStep {
  return {
    id: crypto.randomUUID(),
    steptitle: "",
    description: "",
    progress: 0,
    status: "not yet",
  };
}

export default function AddJoblistModal({ open, onClose, onSaved, collectionName = "pitstop2027" }: Props) {
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadDoneKey, setUploadDoneKey] = useState(0);
  const [form, setForm] = useState(fieldDefaults);
  const [steps, setSteps] = useState<StepGroup[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(
    {},
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotosChange = (_files: File[]) => {
    setPhotos(_files);
  };

  const addStep = () => {
    const newStep = makeStepGroup();
    setSteps((prev) => [...prev, newStep]);
    setExpandedSteps((prev) => ({ ...prev, [newStep.id]: true }));
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const updateStepName = (stepId: string, name: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, stepname: name } : s)),
    );
  };

  const addItem = (stepId: string) => {
    const newItem = makeStep();
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, steplist: [...s.steplist, newItem] } : s,
      ),
    );
    setExpandedSteps((prev) => ({ ...prev, [stepId]: true }));
    setTimeout(() => {
      document
        .getElementById(`modal-item-${newItem.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const removeItem = (stepId: string, itemId: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, steplist: s.steplist.filter((i) => i.id !== itemId) }
          : s,
      ),
    );
  };

  const updateItemTitle = (stepId: string, itemId: string, title: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              steplist: s.steplist.map((i) =>
                i.id === itemId ? { ...i, steptitle: title } : i,
              ),
            }
          : s,
      ),
    );
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleClose = () => {
    setForm(fieldDefaults);
    setPhotos([]);
    setUploadDoneKey(0);
    setSteps([]);
    setExpandedSteps({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.tag.trim() || !form.job.trim()) {
      toast.error("Tag and Job are required");
      return;
    }

    const hasStepsWithName = steps.some(
      (s) => s.stepname.trim() && s.steplist.some((i) => i.steptitle.trim()),
    );

    if (hasStepsWithName) {
      const invalidStep = steps.find(
        (s) =>
          s.stepname.trim() &&
          s.steplist.some((i) => i.steptitle.trim()) &&
          (!s.stepname.trim() || s.steplist.some((i) => !i.steptitle.trim())),
      );
      if (steps.some((s) => s.stepname.trim() && s.steplist.length === 0)) {
        toast.error("Each step must have at least one steplist item");
        return;
      }
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("unit", form.unit.trim());
      formData.append("tag", form.tag.trim());
      formData.append("job", form.job.trim());
      formData.append("type", form.type);
      formData.append("discipline", form.discipline);
      formData.append("priority", form.priority);
      formData.append("assignee", form.assignee.trim());
      formData.append("updatedCustom", new Date().toISOString());

      const cleanedSteps = steps
        .filter((s) => s.stepname.trim())
        .map((s) => ({
          ...s,
          steplist: s.steplist.filter((i) => i.steptitle.trim()),
        }))
        .filter((s) => s.steplist.length > 0);

      formData.append("steps", JSON.stringify(cleanedSteps));

      photos.forEach((file) => {
        formData.append("photos", file);
      });

      await pb.collection(collectionName).create(formData);

      toast.success("Joblist created successfully");
      handleClose();
      onSaved();
    } catch (err) {
      console.error("Failed to create joblist:", err);
      toast.error("Failed to create joblist");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-sky-100">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-sky-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-sky-900">Add Joblist</h2>
            <p className="text-sm text-sky-700 mt-0.5">
              Create a new pitstop 2027 joblist entry
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white border border-sky-200 flex items-center justify-center text-sky-700 hover:bg-sky-50 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Row 1: Unit + Tag + Job */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[100px_1fr_2fr]">
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Unit
              </label>
              <input
                name="unit"
                type="text"
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. 021"
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Tag Number <span className="text-red-500">*</span>
              </label>
              <input
                name="tag"
                type="text"
                value={form.tag}
                onChange={handleChange}
                placeholder="e.g. 021E-101"
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Jobs <span className="text-red-500">*</span>
              </label>
              <input
                name="job"
                type="text"
                value={form.job}
                onChange={handleChange}
                placeholder="e.g. Cleaning, Repair, Inspection, Overhaul"
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
          </div>

          {/* Row 2: Type + Dicipline */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Equipment Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {equipmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Discipline
              </label>
              <select
                name="discipline"
                value={form.discipline}
                onChange={handleChange}
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {disciplineOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Priority + Assignee */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-800 mb-1">
                Assignee / PIC
              </label>
              <input
                name="assignee"
                type="text"
                value={form.assignee}
                onChange={handleChange}
                placeholder=""
                className="w-full rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Steps Section */}
          <div className="border-t border-sky-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-sky-800">Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-200 transition-all"
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>

            {steps.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-sky-200 rounded-lg">
                No steps added yet. Click &quot;Add Step&quot; to begin.
              </p>
            )}

            <div className="space-y-3">
              {steps.map((step, sIdx) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-sky-200 bg-sky-50/30 overflow-hidden"
                >
                  {/* Step header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-sky-100">
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 flex-1"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${expandedSteps[step.id] ? "" : "-rotate-90"}`}
                      />
                      Step {sIdx + 1}
                      {step.stepname.trim() && (
                        <span className="text-sky-800 font-bold">
                          — {step.stepname}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => addItem(step.id)}
                      className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 transition-all"
                    >
                      <Plus size={12} />
                      Add Item
                    </button>

                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Step body */}
                  {expandedSteps[step.id] && (
                    <div className="px-3 py-3 space-y-2">
                      <input
                        type="text"
                        value={step.stepname}
                        onChange={(e) =>
                          updateStepName(step.id, e.target.value)
                        }
                        placeholder="Step name (e.g. Inspection, Overhaul)"
                        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />

                      {step.steplist.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          No items yet. Click &quot;Add Item&quot; to add
                          steplist items.
                        </p>
                      )}

                      {step.steplist.map((item, iIdx) => (
                        <div
                          key={item.id}
                          id={`modal-item-${item.id}`}
                          className="flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {iIdx + 1}.
                          </span>
                          <input
                            type="text"
                            value={item.steptitle}
                            onChange={(e) =>
                              updateItemTitle(step.id, item.id, e.target.value)
                            }
                            placeholder="Steplist item title"
                            className="flex-1 rounded border border-sky-100 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(step.id, item.id)}
                            className="flex items-center justify-center w-6 h-6 rounded text-red-400 hover:bg-red-50 transition-all shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-sky-800 mb-1">
              Photos
            </label>
            <MultiImageUpload
              onChange={handlePhotosChange}
              uploadedTrigger={uploadDoneKey}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-sky-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-all"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Creating..." : "Create Joblist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

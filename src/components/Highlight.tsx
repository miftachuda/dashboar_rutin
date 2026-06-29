import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  EquipmentType,
  equipmentTypes,
  typeClasses,
} from "@/types/maintenance";
import { pb } from "@/lib/pocketbase";
import DeleteWithConfirm from "./Deletion";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import ActionList from "./ActionList";
import StatusPopup from "./StatusPopup";
import MultiImageUpload from "./MultiImageUpload";
import ImagePreviewRow from "./ImagePreview";
import EditableHighlight from "./EditableHighlight";
import SortDropdown, { SortOption } from "./SortDropdown";

export type ActionItem = {
  action: string;
  createdAt: string;
};
export type Status = "open" | "need support" | "in progress" | "done";
export type HighlightItem = {
  id: string;
  highlight: string;
  type_equipment: EquipmentType;
  status: Status;
  follow_up: string;
  created: number;
  updated?: number;
  tag_number?: string;
  unit?: string;
  pic?: string;
  date_closed?: number;
  photos?: string[];
};

const statusColor: Record<HighlightItem["status"], string> = {
  open: "bg-red-100 text-red-700",
  "need support": "bg-yellow-100 text-yellow-700",
  "in progress": "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function Highlight() {
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState("");
  const [pic, setPic] = useState("");
  const [tag_number, setTag_number] = useState("");
  const [unit, setUnit] = useState("");
  const [type_equipment, setType_equipment] = useState<EquipmentType>("Other");
  const [status, setStatus] = useState<HighlightItem["status"]>("open");
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDoneKey, setUploadDoneKey] = useState(0);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const deleteHighlight = async (highlightId: string) => {
    try {
      await pb.collection("highlight_pitstop_2027").update(highlightId, {
        is_deleted: true,
      });
      setHighlights((prev) => prev.filter((item) => item.id !== highlightId));
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>🗑️ Deleted successfully</span>
        </div>
      ));
    } catch (err) {
      console.error("Failed to delete highlight:", err);
      toast.error("Failed to delete highlight");
    }
  };

  function recordToHighlightItem(record: any): HighlightItem {
    return {
      id: record.id,
      highlight: record.highlight,
      type_equipment: record.type_equipment,
      follow_up: record.follow_up,
      status: record.status as HighlightItem["status"],
      created: record.created,
      updated: record.updated,
      tag_number: record.tag_number,
      unit: record.unit,
      pic: record.pic,
      date_closed: record.date_closed,
      photos: record.photos || [],
    };
  }

  const handlePhotosChange = (_files: File[]) => {
    setPhotos(_files);
  };

  const handleUpload = async (taskId: string) => {
    if (!photos || photos.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    photos.forEach((file) => {
      formData.append("photos+", file);
    });

    try {
      await pb.collection("highlight_pitstop_2027").update(taskId, formData);

      const updated = await pb.collection("highlight_pitstop_2027").getOne(taskId);

      setHighlights((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, photos: updated.photos || [] }
            : item,
        ),
      );

      setPhotos([]);
      setUploadDoneKey((prev) => prev + 1);

      toast.success("Photos uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  async function loadHighlights() {
    try {
      const highlightRecords = await pb
        .collection("highlight_pitstop_2027")
        .getFullList({ sort: "-created", filter: "is_deleted = false" });

      const fetchedHighlights: HighlightItem[] = highlightRecords.map(
        (record) => recordToHighlightItem(record),
      );
      setHighlights(fetchedHighlights);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHighlights();
  }, []);

  const sortOptions: SortOption[] = [
    { label: "Status (op,ns,ip,dn)", value: "state" },
    { label: "Date (newest → oldest)", value: "date" },
    { label: "Name (A → Z)", value: "name_asc" },
    { label: "Name (Z → A)", value: "name_desc" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;
    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("highlight", highlight);
      formData.append("type_equipment", type_equipment);
      formData.append("status", status);
      formData.append("tag_number", tag_number);
      formData.append("unit", unit);
      formData.append("pic", pic);

      photos.forEach((file: File) => {
        formData.append("photos", file);
      });

      await pb.collection("highlight_pitstop_2027").create(formData);

      await loadHighlights();

      setIsOpen(false);
      setHighlight("");
      setType_equipment(equipmentTypes[0]);
      setStatus("open");
      setTag_number("");
      setUnit("");
      setPic("");
      setPhotos([]);

      toast.custom(() => (
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>✅ Saved successfully</span>
        </div>
      ));
    } catch (err) {
      console.error("Failed to save highlight:", err);
      toast.error("Failed to save highlight");
    } finally {
      setSaving(false);
    }
  };

  function parseFollowUp(value: string | null | undefined): ActionItem[] {
    try {
      if (!value) return [];

      const parsed = typeof value === "string" ? JSON.parse(value) : value;

      return (parsed?.actions ?? []).map(
        (item: any): ActionItem => ({
          action: item?.action ?? "",
          createdAt: item?.createdAt ?? Date.now(),
        }),
      );
    } catch (err) {
      console.error("JSON parse error:", err);
      return [];
    }
  }

  const handleStatusChange = async (id: string, newStatus: Status) => {
    try {
      setHighlights((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item,
        ),
      );
      await pb.collection("highlight_pitstop_2027").update(id, {
        status: newStatus,
      });
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleHighlightUpdate = (id: string, newValue: string) => {
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, highlight: newValue, updated: Date.now() } : h,
      ),
    );
  };

  const statusOrder: Record<string, number> = {
    open: 1,
    "need support": 2,
    "in progress": 3,
    done: 4,
  };

  const [sort, setSort] = useState("state");

  const sorted_hl = [...highlights].sort((a, b) => {
    switch (sort) {
      case "state":
        return statusOrder[a.status] - statusOrder[b.status];
      case "name_asc":
        return (a.tag_number || "").localeCompare(b.tag_number || "");
      case "name_desc":
        return (b.tag_number || "").localeCompare(a.tag_number || "");
      case "date":
        return a.created - b.created;
      default:
        return 0;
    }
  });

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-3">
              <h2 className="border-emerald-300 text-lg font-semibold">
                Highlights
              </h2>
              <button
                onClick={() => setIsOpen(true)}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm text-primary-foreground"
              >
                + Add Highlight
              </button>
              <SortDropdown
                options={sortOptions}
                value={sort}
                onChange={setSort}
              />

              {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setIsOpen(false)}
                  />

                  <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                    <h2 className="mb-4 text-lg font-semibold">Add Highlight</h2>

                    <form className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Highlight</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                          placeholder="Highlight"
                          value={highlight}
                          onChange={(e) => setHighlight(e.target.value)}
                        />
                      </div>
                      <MultiImageUpload
                        onChange={handlePhotosChange}
                        uploadedTrigger={uploadDoneKey}
                      />
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Type Equipment</label>
                        <select
                          value={type_equipment}
                          onChange={(e) =>
                            setType_equipment(e.target.value as EquipmentType)
                          }
                          className="rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {equipmentTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Tag Number</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                          placeholder="Tag Number"
                          value={tag_number}
                          onChange={(e) => setTag_number(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          PIC bagian terkait
                          <label className="ml-2 text-[8px] font-medium">
                            eg. LOC II, MA II, SSIE, PE, etc.
                          </label>
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                          placeholder="PIC bagian terkait"
                          value={pic}
                          onChange={(e) => setPic(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as Status)}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                        >
                          <option value="open">Open</option>
                          <option value="in progress">In Progress</option>
                          <option value="need support">Need Support</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          className="rounded border px-3 py-1 text-sm hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          onClick={handleSubmit}
                          disabled={saving}
                          className="flex items-center gap-2 rounded bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`overflow-y-auto rounded-xl border bg-card p-2 transition-all duration-300 ${
                expanded ? "max-h-none" : "max-h-[200px]"
              }`}
            >
              {sorted_hl.map((item) => {
                const isItemOpen = openId === item.id;

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-lg border transition-all"
                  >
                    <div onClick={() => toggle(item.id)} className="w-full">
                      <div className="flex flex-col items-end">
                        <div className="m-1 flex w-full cursor-pointer items-center justify-between px-3 py-1 hover:bg-slate-200">
                          <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                              <div className="flex flex-row gap-2">
                                <span
                                  className={`min-w-32 whitespace-nowrap rounded-md px-3 py-1 text-[13px] font-bold ${typeClasses[item.type_equipment]}`}
                                >
                                  {item.type_equipment}
                                </span>

                                <div className="flex-1 min-w-0">
                                  <div className="mb-2 flex flex-row gap-2">
                                    <span className="flex items-center whitespace-nowrap rounded bg-lime-50 px-2.5 py-1 text-xs text-lime-700">
                                      {item.tag_number}
                                    </span>

                                    <EditableHighlight
                                      item={item}
                                      pb={pb}
                                      onUpdated={handleHighlightUpdate}
                                    />
                                    <div className="flex w-full flex-row items-stretch gap-2 pr-3">
                                      <div className="ml-auto flex flex-row">
                                        <span className="flex items-center whitespace-nowrap rounded-2xl bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700">
                                          PIC : {item.pic}
                                        </span>
                                        <span className="px-2.5 py-1 text-xs text-muted-foreground">
                                          Created:{" "}
                                          {formatDistanceToNowStrict(
                                            new Date(item.created),
                                            { addSuffix: true },
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <ActionList
                                    itemId={item.id}
                                    initialList={parseFollowUp(item.follow_up)}
                                    colID="highlight_pitstop_2027"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3 pl-4">
                              <StatusPopup
                                item={item}
                                handleStatusChange={handleStatusChange}
                                statusColor={statusColor}
                              />
                              <DeleteWithConfirm
                                onDelete={() => deleteHighlight(item.id)}
                              />

                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isItemOpen ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-300 ${
                        isItemOpen ? "p-3" : "max-h-0 px-3"
                      } overflow-hidden`}
                    >
                      <div className="flex flex-col">
                        <ImagePreviewRow
                          images={item.photos || []}
                          recordId={item.id}
                          baseUrl="https://data.miftachuda.my.id"
                          collectionID="highlight_pitstop_2027"
                        />
                        <MultiImageUpload
                          onChange={handlePhotosChange}
                          taskId={item.id}
                          uploadedTrigger={uploadDoneKey}
                        />
                        <button
                          onClick={() => handleUpload(item.id)}
                          disabled={uploading}
                          className={`mt-2 inline-flex w-fit items-center gap-2 rounded px-3 py-1 text-white ${
                            uploading
                              ? "cursor-not-allowed bg-gray-400"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {uploading && (
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
                          {uploading ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-2 text-xs text-slate-400 hover:text-slate-500"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

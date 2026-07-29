import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  EquipmentType,
  equipmentTypes,
  StepTask,
  typeClasses,
} from "@/types/maintenance";
import { pb } from "@/lib/pocketbase";
import DeleteWithConfirm from "@/components/Deletion";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import ActionList from "@/components/ActionList";
import StatusPopup from "@/components/StatusPopup";

type ActionItem = {
  action: string;
  createdAt: string; // ISO timestamp
};
type Status = "open" | "need support" | "in progress" | "done";
export type ActivityItem = {
  id: string;
  activity: string;
  type_equipment: EquipmentType;
  status: Status;
  tag_number: string;
  follow_up: string | null; // JSON string of ActionItem[]
  discipline: string;
  pic: string;
  created: number;
  updated?: number;
};
type discipline =
  | "Stationary"
  | "Rotating"
  | "Instrument"
  | "Electrical"
  | "Operation"
  | "Other"
  | "OLLS";
const statusColor: Record<ActivityItem["status"], string> = {
  open: "bg-red-100 text-red-700",
  "need support": "bg-yellow-100 text-yellow-700",
  "in progress": "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function DailyActivity() {
  const [daily_activity, setDaily_activity] = useState<ActivityItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discipline, setDiscipline] = useState<discipline>("Stationary");
  const [activity, setActivity] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [type_equipment, setType_equipment] =
    useState<EquipmentType>("Heat Exchanger");
  const [status, setStatus] = useState<ActivityItem["status"]>("open");
  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };
  const deleteActivity = async (activityId: string) => {
    try {
      await pb.collection("daily_activity_ps2027").delete(activityId);
      setDaily_activity((prev) =>
        prev.filter((item) => item.id !== activityId),
      );
      toast.custom((t) => (
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>🗑️ Saved successfully</span>
        </div>
      ));
    } catch (err) {
      console.error("Failed to delete activity:", err);
      toast.error("Failed to delete activity");
    }
  };
  function recordToActivityItem(record: any): ActivityItem {
    return {
      id: record.id,
      activity: record.activity,
      type_equipment: record.type_equipment,
      tag_number: record.tag_number,
      discipline: record.discipline,
      pic: record.pic,
      follow_up: record.follow_up,
      status: record.status as ActivityItem["status"],
      created: record.created,
      updated: record.updated,
    };
  }
  const [loading, setLoading] = useState(true);
  const prefixes = ["021", "022", "023", "024", "025", "041"];
  const [prefixFilter, setPrefixFilter] = useState<string | null>(null);
  const [selectedType, setselectedType] = useState<EquipmentType | null>(null);
  const [search, setSearch] = useState("");

  async function loadActivity() {
    try {
      const [activityRecords] = await Promise.all([
        pb.collection("daily_activity_ps2027").getFullList({ sort: "-created" }), // example
      ]);

      const fetchedActivities: ActivityItem[] = activityRecords.map(
        (record) => recordToActivityItem(record), // create this mapper
      );
      setDaily_activity(fetchedActivities); // <- new state
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadActivity();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        activity,
        type_equipment,
        status,
        tag_number: tagNumber,
        discipline,
      };
      if (saving) return;
      setSaving(true);
      await pb.collection("daily_activity_ps2027").create(data);

      await loadActivity();

      setIsOpen(false);
      setActivity("");
      setType_equipment(equipmentTypes[0]);
      setStatus("open");
      toast.custom((t) => (
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>✅ Saved successfully</span>
        </div>
      ));
    } catch (err) {
      console.error("Failed to save activity:", err);
      toast.error("Failed to save activity");
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
      // update local state
      setDaily_activity((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item,
        ),
      );
      // update backend (PocketBase example)
      await pb.collection("daily_activity_ps2027").update(id, {
        status: newStatus,
      });
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };
  const filteredActivity = daily_activity.filter((task) => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      task.activity?.toLowerCase().includes(q) ||
      task.tag_number?.toLowerCase().includes(q);

    const matchPrefix =
      !prefixFilter ||
      task.tag_number?.substring(0, 3).toUpperCase() ===
        prefixFilter.toUpperCase();

    const matchType =
      !selectedType || // kalau belum pilih → semua lolos
      task.type_equipment === selectedType;

    return matchSearch && matchPrefix && matchType;
  });
  return (
      <div className="m-0 p-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-0">
              <div className="flex flex-col items-start gap-0 ">
                <div className="flex flex-row gap-2">
                  <h2 className="text-lg font-semibold  border-emerald-300">
                    Daily Activity
                  </h2>
                  <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-500 text-primary-foreground hover:bg-indigo-500/80 px-3 py-1 rounded text-sm"
                  >
                    + Post Daily Activity
                  </button>
                </div>

                <div className="flex flex-nowrap items-center gap-1 mt-1 mb-1 overflow-x-auto">
                  <button
                    onClick={() => setPrefixFilter(null)}
                    className={`px-3 py-1 rounded-md border text-sm whitespace-nowrap flex-shrink-0 ${
                      prefixFilter === null
                        ? "bg-primary text-white"
                        : "bg-white"
                    }`}
                  >
                    All
                  </button>
                  {prefixes.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrefixFilter(p)}
                      className={`px-3 py-1 rounded-md border text-sm whitespace-nowrap flex-shrink-0 ${
                        prefixFilter === p
                          ? "bg-primary text-white"
                          : "bg-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 mb-1">
                  <button
                    onClick={() => setselectedType(null)}
                    className={`px-3 py-1 rounded-md border text-sm ${
                      selectedType === null
                        ? "bg-primary text-white"
                        : "bg-white"
                    }`}
                  >
                    All
                  </button>

                  {equipmentTypes.map((p) => (
                    <button
                      key={p}
                      onClick={() => setselectedType(p)}
                      className={`px-3 py-1 rounded-md border text-sm ${
                        selectedType === p
                          ? "bg-primary text-white"
                          : "bg-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {isOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* BACKDROP */}
                    <div
                      className="absolute inset-0 bg-black/40"
                      onClick={() => setIsOpen(false)}
                    />

                    {/* MODAL */}
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10">
                      <h2 className="text-lg font-semibold mb-1">
                        Add Activity
                      </h2>

                      {/* FORM */}
                      <form className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Activity
                          </label>
                          <input
                            type="text"
                            className="w-full mt-1 border text-xs rounded-lg px-3 py-2"
                            placeholder="Activity description..."
                            value={activity}
                            onChange={(e) => setActivity(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Tag Number
                          </label>
                          <input
                            type="text"
                            className="w-full mt-1 border text-xs rounded-lg px-3 py-2"
                            placeholder="Tag number..."
                            value={tagNumber}
                            onChange={(e) => setTagNumber(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Discipline
                          </label>
                          <select
                            value={discipline}
                            onChange={(e) =>
                              setDiscipline(e.target.value as discipline)
                            }
                            className="w-full mt-1 text-xs border rounded-lg px-3 py-2"
                          >
                            <option value="Stationary">Stationary</option>
                            <option value="Instrument">Instrument</option>
                            <option value="Rotating">Rotating</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Operation">Operation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {/* Type Equipment */}
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            Equipment Type
                          </label>
                          <select
                            value={type_equipment}
                            onChange={(e) =>
                              setType_equipment(e.target.value as EquipmentType)
                            }
                            className="px-3 text-xs py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {equipmentTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Status */}
                        <div>
                          <label className="text-sm font-medium">Status</label>
                          <select
                            value={status}
                            onChange={(e) =>
                              setStatus(e.target.value as Status)
                            }
                            className="w-full mt-1 text-xs border rounded-lg px-3 py-2"
                          >
                            <option value="open">Open</option>
                            <option value="in progress">In Progress</option>
                            <option value="need support">Need Support</option>
                            <option value="done">Done</option>
                          </select>
                        </div>

                        {/* Follow Up (JSON style) */}
                        {/* <div>
                  <label className="text-sm font-medium">Follow Up</label>
                  <textarea
                    className="w-full mt-1 border rounded-lg px-3 py-2 font-mono text-sm"
                    rows={4}
                    defaultValue={`{
  "followup": [
    "inspection",
    "overlay shell",
    "post inspection"
  ]
}`}
                  />
                </div> */}

                        {/* ACTIONS */}
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1 rounded border hover:bg-muted text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                          >
                            {saving && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`bg-card border rounded-xl p-2 space-y-1 overflow-y-auto transition-all duration-300`}
              >
                {filteredActivity.map((item) => {
                  const isOpen = openId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg overflow-hidden transition-all"
                    >
                      {/* HEADER ROW */}
                      <div
                        onClick={() => toggle(item.id)}
                        className="w-full flex items-center justify-between p-1 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-1 text-left">
                          {/* TYPE */}
                          <span
                            className={`text-[10px] px-1 py-0 rounded ${typeClasses[item.type_equipment]}`}
                          >
                            {item.type_equipment}
                          </span>
                          <span
                            className={`text-[10px] px-1 py-0 rounded bg-gray-200 text-gray-800`}
                          >
                            {item.tag_number}
                          </span>

                          {/* TITLE */}
                          <span className="font-medium text-xs">
                            {item.activity}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground">
                              {format(
                                new Date(item.created),
                                "HH:mm EEEE-dd-MM-yyyy",
                                {
                                  locale: id,
                                },
                              )}
                            </span>
                          </div>
                          {/* STATUS */}
                          <StatusPopup
                            item={item}
                            handleStatusChange={handleStatusChange}
                            statusColor={statusColor}
                          />
                          <DeleteWithConfirm
                            onDelete={() => deleteActivity(item.id)}
                          />
                          {/* CHEVRON */}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* COLLAPSIBLE CONTENT */}
                      <div
                        className={`transition-all duration-300 ${
                          isOpen ? "max-h-40 p-3" : "max-h-0 px-3"
                        } overflow-hidden`}
                      >
                        <ActionList
                          itemId={item.id}
                          initialList={parseFollowUp(item.follow_up)}
                          colID="daily_activity"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
  );
}

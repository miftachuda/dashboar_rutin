import RestrokeInput from "@/components/RestrokeInput";
import { pb } from "@/lib/pocketbase";
import { EquipmentType, equipmentTypes } from "@/types/maintenance";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export default function CleaningStrainer() {
  type Status = "open" | "need support" | "in progress" | "done";
  type StrainerItem = {
    id: string;
    progress: number;
    shift: string;
    tanggal: string;
    status: Status;
    tag_number: string;
    pic: string;
    keterangan: string;
    created: number;
    updated?: number;
  };

  const [cleaning_strainer, setCleaningStrainer] = useState<StrainerItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [activity, setHighlight] = useState("");
  const [type_equipment, setType_equipment] = useState<EquipmentType>("Other");

  const deleteStrainer = async (activityId: string) => {
    try {
      await pb.collection("cleaning_strainer_ta2028").delete(activityId);
      setCleaningStrainer((prev) =>
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
  function recordToStrainerItem(record: any): StrainerItem {
    return {
      id: record.id,
      tag_number: record.tag_number,
      shift: record.shift,
      tanggal: record.tanggal,
      pic: record.pic,
      status: record.status as Status,
      progress: record.progress ?? 0,
      keterangan: record.keterangan ?? "",
      created: record.created,
      updated: record.updated,
    };
  }
  const [loading, setLoading] = useState(true);
  const prefixes = ["002", "021", "022", "023", "024", "025", "041"];
  const [prefixFilter, setPrefixFilter] = useState<string | null>(null);

  async function loadStrainer() {
    try {
      const [activityRecords] = await Promise.all([
        pb.collection("cleaning_strainer_ta2028").getFullList({ sort: "tag_number" }), // example
      ]);

      const fetchedHighlights: StrainerItem[] = activityRecords.map(
        (record) => recordToStrainerItem(record), // create this mapper
      );
      setCleaningStrainer(fetchedHighlights); // <- new state
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadStrainer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        activity,
        type_equipment,
      };
      if (saving) return;
      setSaving(true);
      await pb.collection("cleaning_strainer_ta2028").create(data);

      await loadStrainer();
      setHighlight("");
      setType_equipment(equipmentTypes[0]);

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
  const updateField = async (
    rowID: string,
    field: keyof StrainerItem,
    value: any,
  ) => {
    const updated = cleaning_strainer.map((r) =>
      r.id === rowID ? { ...r, [field]: value } : r,
    );
    const prev = cleaning_strainer;

    setCleaningStrainer(updated);

    try {
      await pb.collection("cleaning_strainer_ta2028").update(rowID, {
        [field]: value,
      });
      toast.success("Changes saved");
    } catch (err) {
      console.error("PB update failed:", err);
      setCleaningStrainer(prev); // rollback
      toast.error("Failed to save changes");
    }
  };
  const handleProgressBlur = async (id: string, newProgress: number) => {
    try {
      // update local state
      setCleaningStrainer((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, progress: newProgress } : item,
        ),
      );
      // update backend (PocketBase example)
      await pb.collection("cleaning_strainer_ta2028").update(id, {
        progress: newProgress,
      });
      toast.success("Progress updated");
    } catch (err) {
      toast.error("Failed to update progress");
    }
  };
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleProgressChange = (id: string, newProgress: number) => {
    // update UI immediately
    setCleaningStrainer((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, progress: newProgress } : item,
      ),
    );
    // clear previous timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // set new debounce
    debounceRef.current = setTimeout(() => {
      handleProgressBlur(id, newProgress); // your API call
    }, 500); // adjust delay (300–800ms is common)
  };
  const filteredStrainer = cleaning_strainer.filter((task) => {
    const matchPrefix =
      !prefixFilter ||
      task.tag_number?.substring(0, 3).toUpperCase() ===
        prefixFilter.toUpperCase();

    return matchPrefix;
  });
  const getProgressByPrefix = (prefix: string) => {
    const filtered = cleaning_strainer.filter(
      (t) =>
        t.tag_number?.substring(0, 3).toUpperCase() === prefix.toUpperCase(),
    );

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, t) => sum + (t.progress || 0), 0);
    return Math.round(total / filtered.length);
  };
  const allPrefixes = ["All", ...prefixes];
  const getTotalProgress = () => {
    if (!cleaning_strainer.length) return 0;

    const total = cleaning_strainer.reduce(
      (sum, t) => sum + (t.progress || 0),
      0,
    );

    return Math.round(total / cleaning_strainer.length);
  };
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};

    prefixes.forEach((p) => {
      map[p] = getProgressByPrefix(p);
    });

    map["All"] = getTotalProgress();

    return map;
  }, [cleaning_strainer, prefixes]);
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
        <main className="max-w-8xl  px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-nowrap items-center gap-1 mt-3 mb-4 ">
            {allPrefixes.map((p) => {
              const isAll = p === "All";
              const isActive = (isAll && !prefixFilter) || prefixFilter === p;

              const color = prefixColors[p] || prefixColors["All"];

              return (
                <button
                  key={p}
                  onClick={() => setPrefixFilter(isAll ? null : p)}
                  className={`flex flex-col items-center justify-center 
        w-20 h-15 rounded-xl border shadow-sm transition
        ${
          isActive
            ? // ✅ Active → stronger color
              `${color.bg} ${color.text} ${color.border} scale-105`
            : // ✅ Inactive → softer version but SAME color family
              `${color.bg} ${color.text} ${color.border} opacity-70 hover:opacity-100`
        }`}
                >
                  {/* Title */}
                  <div className="text-lg capitalize">{p}</div>

                  {/* Percentage */}
                  <div
                    className={`text-base font-semibold ${
                      isActive ? color.accent : `${color.accent} opacity-70`
                    }`}
                  >
                    {progressMap[p] ?? 0}%
                  </div>
                </button>
              );
            })}
          </div>
          <table className="min-w-full border text-sm">
            <thead className="text-center">
              <tr>
                <th
                  className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                  rowSpan={2}
                >
                  NO
                </th>
                <th
                  className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                  rowSpan={2}
                >
                  TAG NUMBER
                </th>
                <th
                  className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                  rowSpan={2}
                >
                  PROGRESS
                </th>
                <th className="sticky top-0 z-20 bg-gray-200 py-2 px-2">
                  SHIFT
                </th>
                <th className="sticky top-0 z-20 bg-gray-200 py-2 px-2">PIC</th>
                <th className="sticky top-0 z-20 bg-gray-200 py-2 px-2">
                  KETERANGAN
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStrainer.map((row, i) => (
                <tr key={i} className="text-center border whitespace-nowrap">
                  <td>{i + 1}</td>
                  <td>{row.tag_number}</td>
                  <td className="px-2 py-1">
                    <div className="relative w-32">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={row.progress}
                        onChange={(e) =>
                          handleProgressChange(row.id, Number(e.target.value))
                        }
                        className="w-full appearance-none h-5 rounded-lg outline-none"
                        style={{
                          background: `linear-gradient(to right, ${
                            row.progress === 100 ? "#22c55e" : "#6366f1"
                          } ${row.progress}%, #e5e7eb ${row.progress}%)`,
                        }}
                      />

                      {/* Hide thumb */}
                      <style>
                        {`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 0;
          height: 0;
        }
      `}
                      </style>

                      {/* Text */}
                      <div className="absolute inset-0 flex items-center mb-2 justify-center text-xs font-medium pointer-events-none">
                        {row.progress}%
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={row.shift ?? ""}
                      onChange={(e) =>
                        updateField(row.id, "shift", e.target.value)
                      }
                      className="w-full px-1 border rounded bg-white"
                    >
                      <option value="">-</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </td>
                  {/* PIC */}
                  <td>
                    <RestrokeInput
                      value={row.pic}
                      onSave={(val) => updateField(row.id, "pic", val)}
                    />
                  </td>
                  {/* KETERANGAN */}
                  <td>
                    <RestrokeInput
                      value={row.keterangan}
                      onSave={(val) => updateField(row.id, "keterangan", val)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
        </div>
  );
}

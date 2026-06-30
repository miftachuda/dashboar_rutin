import RestrokeInput from "@/components/RestrokeInput";
import { pb } from "@/lib/pocketbase";
import { useEffect, useState } from "react";
export type Status = "ok" | "rusak" | "belum";
export interface RowData {
  id: string; // tambahkan id untuk update
  no: number;
  tag_number: string;
  service: string;
  p0: Status;
  p25: Status;
  p50: Status;
  p75: Status;
  p100: Status;
  arah: Status;
  baut: Status;
  gasket: Status;
  koneksi: Status;
  shift: string;
  pic: string;
  keterangan: string;
  progress_perbaikan: string;
}
function StatusToggle({
  value,
  onChange,
}: {
  value: "ok" | "rusak" | "belum";
  onChange: (v: "ok" | "rusak" | "belum") => void;
}) {
  const next = () => {
    if (value === "belum") return onChange("ok");
    if (value === "ok") return onChange("rusak");
    return onChange("belum");
  };

  const styles = {
    belum: "bg-gray-300",
    ok: "bg-green-500 text-white",
    rusak: "bg-red-500 text-white",
  };

  const icon = {
    belum: "o",
    ok: "✓",
    rusak: "✕",
  };

  return (
    <button
      onClick={next}
      className={`w-8 h-8 rounded text-slate-700 flex px-5 items-center justify-center text-sm ${styles[value]}`}
    >
      {icon[value]}
    </button>
  );
}

export default function RestrokeCV() {
  const [rows, setRows] = useState<RowData[]>([]);
  const updateField = async (
    index: number,
    field: keyof RowData,
    value: any,
  ) => {
    const updated = rows.map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );

    setRows(updated);

    try {
      const row = updated[index];

      await pb.collection("restroke_ps2027").update(row.id, {
        [field]: value,
        customUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("PB update failed:", err);
    }
  };
  const updateRestroke = async (index: number, key: any, value: Status) => {
    const updated = [...rows];
    updated[index][key] = value;
    setRows(updated);

    try {
      const row = updated[index];

      await pb.collection("restroke_ps2027").update(row.id, {
        [key]: value, // ✅ langsung ke
      });
    } catch (err) {
      console.error("PB update failed:", err);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await pb.collection("restroke_ps2027").getFullList();

        const mapped: RowData[] = result.map((item: any, index: number) => ({
          id: item.id, // simpan id untuk update
          no: index + 1,
          tag_number: item.tag_number || "",
          service: item.service || "",

          p0: item.p0 || "belum",
          p25: item.p25 || "belum",
          p50: item.p50 || "belum",
          p75: item.p75 || "belum",
          p100: item.p100 || "belum",

          arah: item.arah || "belum",
          baut: item.baut || "belum",
          gasket: item.gasket || "belum",
          koneksi: item.koneksi || "belum",
          shift: item.shift || "",
          pic: item.pic || "",
          keterangan: item.keterangan || "",
          progress_perbaikan: item.progress_perbaikan || "",
        }));

        setRows(mapped);
      } catch (err) {
        console.error("Error fetching PocketBase:", err);
      }
    };

    fetchData();
  }, []);
  return (
      <div className="m-0 p-0 bg-background">
        <main className=" ">
          <div className="max-h-[90vh] overflow-y-auto">
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
                    TAG NO.
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    SERVICE
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    colSpan={5}
                  >
                    RESTROKE
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    ARAH
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    BAUT
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    GASKET
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    KONEKSI
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    SHIFT
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    PIC
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    KETERANGAN
                  </th>
                  <th
                    className="sticky top-0 z-20 bg-gray-200 py-3 px-2"
                    rowSpan={2}
                  >
                    Tindak Lanjut
                  </th>
                </tr>

                <tr>
                  <th className="sticky top-[44px] z-10 bg-gray-200">0%</th>
                  <th className="sticky top-[44px] z-10 bg-gray-200">25%</th>
                  <th className="sticky top-[44px] z-10 bg-gray-200">50%</th>
                  <th className="sticky top-[44px] z-10 bg-gray-200">75%</th>
                  <th className="sticky top-[44px] z-10 bg-gray-200">100%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="text-center border text-nowrap">
                    <td>{row.no}</td>
                    <td>{row.tag_number}</td>
                    <td className="text-left px-2">{row.service}</td>

                    {(
                      [
                        "p0",
                        "p25",
                        "p50",
                        "p75",
                        "p100",
                        "arah",
                        "baut",
                        "gasket",
                        "koneksi",
                      ] as const
                    ).map((k) => (
                      <td className="text-center py-3 px-2" key={k}>
                        <div className="flex justify-center items-center">
                          <StatusToggle
                            value={row[k]}
                            onChange={(v) => updateRestroke(i, k, v)}
                          />
                        </div>
                      </td>
                    ))}

                    {["shift", "pic", "keterangan", "progress_perbaikan"].map(
                      (field) => (
                        <td key={field}>
                          {field === "shift" ? (
                            <select
                              value={row.shift ?? ""}
                              onChange={(e) =>
                                updateField(
                                  i,
                                  field as keyof RowData,
                                  e.target.value,
                                )
                              }
                              className="w-full px-1 border rounded bg-white"
                            >
                              <option value="">-</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          ) : (
                            <RestrokeInput
                              value={row[field as keyof RowData] as string}
                              onSave={(val) =>
                                updateField(i, field as keyof RowData, val)
                              }
                            />
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </main>
        </div>
  );
}

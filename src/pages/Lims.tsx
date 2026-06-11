import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/MainLayout";
import SampleGroups from "@/components/LimsCard";
import { pb } from "@/lib/pocketbase";
import { SampleLimit } from "@/types/SampleLimit";

const Lims: React.FC = () => {
  const [shift, setShift] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<SampleLimit[]>([]);
  const [loadingLimit, setLoadingLimit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const loading = loadingLimit || loadingData;

  // Tentukan shift berdasarkan waktu saat pertama kali load
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 8) setShift("Malam");
    else if (hour >= 8 && hour < 16) setShift("Pagi");
    else setShift("Sore");
  }, []);
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingLimit(true);

        const records = await pb.collection("sample_limit").getFullList();

        const mapped: SampleLimit[] = records.map((r: any) => ({
          id: r.id,
          sample_code: r.sample_code,
          param_name: r.param_name,
          low_limit: r.low_limit,
          high_limit: r.high_limit,
          isNumber: r.isNumber,
        }));

        setLimit(mapped);
      } catch (error) {
        console.error("Fetch failed:", error);
      } finally {
        setLoadingLimit(false);
      }
    };

    fetchAll();
  }, []);
  // Fetch data setiap kali shift berubah
  useEffect(() => {
    if (!shift) return; // ⬅️ skip if shift not yet initialized

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const url = `https://lims.loc-2.com/${shift.toLowerCase()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
        setData(null);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [shift]);

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-sky-50/40 p-4 transition-colors duration-300">
        <div className="h-full overflow-y-auto ">
          <div className="mb-4 flex max-w-sm flex-row items-center rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
            <label
              htmlFor="shift"
              className="block flex-nowrap p-2 pr-5 pt-1 font-semibold text-sky-900"
            >
              Pilih Shift :
            </label>
            <select
              id="shift"
              value={shift || ""}
              onChange={(e) => setShift(e.target.value)}
              className="w-auto rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="Malam">Malam</option>
              <option value="Pagi">Pagi</option>
              <option value="Sore">Sore</option>
            </select>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 py-4 text-center text-sm font-semibold text-red-600">
              Error: {error}
            </p>
          )}
          <SampleGroups data={data} loading={loading} limit={limit} />
        </div>
      </main>
    </DashboardLayout>
  );
};

export default Lims;

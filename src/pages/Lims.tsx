import React from "react";
import DashboardLayout from "@/components/MainLayout";
import SampleGroups from "@/components/LimsCard";
import { useLimsData } from "@/hooks/useLimsData";

const Lims: React.FC = () => {
  const { shift, setShift, data, limit, loading, error } = useLimsData();

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

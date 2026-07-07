import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { SampleLimit } from "@/types/SampleLimit";

export function useLimsData() {
  const [shift, setShift] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<SampleLimit[]>([]);
  const [loadingLimit, setLoadingLimit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

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

  useEffect(() => {
    if (!shift) return;
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

  return { shift, setShift, data, limit, loading: loadingLimit || loadingData, error };
}

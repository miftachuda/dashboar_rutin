const fs = require('fs');

const hookContent = `import { useState, useEffect } from "react";
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

    let isCancelled = false;

    const fetchShiftData = async (targetShift: string) => {
      const url = \`https://lims.loc-2.com/\${targetShift.toLowerCase()}\`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`HTTP error: \${res.status}\`);
      const json = await res.json();
      
      // Explicitly check for an empty samples list even if response is 200 OK
      if (!json || !json.samples || Object.keys(json.samples).length === 0) {
        throw new Error("EMPTY_SAMPLES");
      }
      
      return json;
    };

    const getPreviousShift = (current: string) => {
      if (current === "Malam") return "Sore";
      if (current === "Pagi") return "Malam";
      if (current === "Sore") return "Pagi";
      return "Pagi"; // fallback default
    };

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      
      try {
        // First Attempt: Fetch the requested shift
        const json = await fetchShiftData(shift);
        if (!isCancelled) setData(json);
      } catch (err: any) {
        // If empty or errored, attempt the fallback
        if (err.message === "EMPTY_SAMPLES" || err.message.startsWith("HTTP error")) {
          try {
            const prevShift = getPreviousShift(shift);
            const prevJson = await fetchShiftData(prevShift);
            if (!isCancelled) setData(prevJson);
          } catch (fallbackErr: any) {
            if (!isCancelled) {
              setError(
                fallbackErr.message === "EMPTY_SAMPLES" 
                  ? "No samples available for current or previous shift." 
                  : fallbackErr.message
              );
              setData(null);
            }
          }
        } else {
          if (!isCancelled) {
            setError(err.message);
            setData(null);
          }
        }
      } finally {
        if (!isCancelled) setLoadingData(false);
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [shift]);

  return { shift, setShift, data, limit, loading: loadingLimit || loadingData, error };
}
`;

fs.writeFileSync('src/hooks/useLimsData.ts', hookContent);

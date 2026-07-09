import { useState, useEffect } from "react";

const vesselLevelEndpoint = "https://phd.miftachuda.my.id/GetData";

export type LiveChemical = {
  tagName: string;
  label: string;
  subtitle: string;
  unit: string;
  level: number | null;
  confidence: number;
};

const vesselConfigs = [
  { tagName: "023LI_019.PV", label: "Furfural", subtitle: "Furfural", unit: "023" },
  { tagName: "024LI_023.PV", label: "MEK", subtitle: "MEK", unit: "024" },
  { tagName: "024LI_026.PV", label: "Toluene", subtitle: "Toluene", unit: "024" },
  { tagName: "022LI_021.PV", label: "Propane", subtitle: "022V-103", unit: "022" },
  { tagName: "024LI_052.PV", label: "Propane", subtitle: "024V-112", unit: "024" },
];

export function useLiveChemicals() {
  const [chemicals, setChemicals] = useState<LiveChemical[]>(
    vesselConfigs.map(c => ({ ...c, level: null, confidence: 0 }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLevels = async () => {
      try {
        const body = [
          {
            SampleInterval: 900000,
            GetEnum: false,
            ResampleMethod: "Around",
            MinimumConfidence: 0,
            MaxRows: 100,
            TimeFormat: 6,
            ReductionData: "snapshot",
            TagName: vesselConfigs.map(c => c.tagName),
            StartTime: "NOW",
            EndTime: "NOW",
            OutputTimeFormat: 6,
            EventSequence: 0,
          },
        ];

        const response = await fetch(vesselLevelEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error("Fetch failed");

        const data = await response.json();
        
        if (isMounted && data && Array.isArray(data)) {
          setChemicals(vesselConfigs.map(config => {
            const record = data.find((item: any) => item.TagName === config.tagName);
            let level = null;
            let confidence = 0;
            
            if (record && record.Value && record.Value.length > 0) {
              confidence = Number(record.Confidence?.[0] ?? 0);
              if (confidence > 0) {
                const rawLevel = Number(record.Value[0]);
                level = Math.max(0, Math.min(100, rawLevel));
              }
            }

            return { ...config, level, confidence };
          }));
        }
      } catch (error) {
        console.error("Failed to fetch chemical levels:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLevels();
    const intervalId = setInterval(fetchLevels, 30 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return { chemicals, loading };
}

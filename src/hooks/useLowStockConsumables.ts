import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { ConsumableMaterial } from "@/types/ConsumableMaterial";

export function useLowStockConsumables() {
  const [lowStockItems, setLowStockItems] = useState<ConsumableMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMaterials = async () => {
      try {
        const records = await pb
          .collection("consumable_material")
          .getFullList<ConsumableMaterial>({
            filter: "stock <= minimum_stock",
            sort: "section,material_name",
          });

        if (isMounted) {
          setLowStockItems(records);
        }
      } catch (error) {
        console.error("Error fetching low stock consumables:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMaterials();
    // Refresh every minute
    const intervalId = setInterval(fetchMaterials, 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return { lowStockItems, loading };
}

import { useEffect, useState } from "react";
import { StatsBar } from "@/components/StatsBar";
import { StatsBar2 } from "@/components/StatsBar2";
import Highlight from "@/components/Highlight";
import { pb } from "@/lib/pocketbase";
import {
  EquipmentType,
  StepGroup,
  StepTask,
  equipmentTypes,
} from "@/types/maintenance";

function isEquipmentType(value: string): value is EquipmentType {
  return equipmentTypes.includes(value as EquipmentType);
}

function recordToStepTask(record: any): StepTask {
  let steps: StepGroup[] = [];

  try {
    steps =
      typeof record.steps === "string"
        ? JSON.parse(record.steps)
        : record.steps || [];
  } catch {
    steps = [];
  }

  const type = String(record.type ?? "").trim();
  const photos = !record.photos
    ? []
    : Array.isArray(record.photos)
      ? record.photos
      : [record.photos];

  return {
    id: record.id,
    title: record.tag ?? "",
    equipment: record.job ?? "",
    type: isEquipmentType(type) ? type : "Other",
    dicipline: record.dicipline ?? "",
    unit: record.unit ?? "",
    priority: record.priority ?? "low",
    assignee: record.assignee ?? "",
    lastmodified: record.updatedCustom ?? Date.now(),
    steps,
    photos,
  };
}

export default function Progress() {
  const [tasks, setTasks] = useState<StepTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const pitstopRecords = await pb
          .collection("turnaround2028")
          .getFullList({
            sort: "tag",
          });

        if (active) {
          setTasks(pitstopRecords.map(recordToStepTask));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <StatsBar tasks={tasks} />
      <StatsBar2 tasks={tasks} />
      <Highlight collectionName="highlight_ta_2028" />
    </div>
  );
}

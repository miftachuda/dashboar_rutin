import { useState } from "react";
import { Pencil, Plus, Check } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { ActionItem } from "./Highlight";
import { formatDistanceToNowStrict } from "date-fns";

export default function ActionList({
  itemId,
  initialList,
  colID,
}: {
  itemId: string;
  initialList: ActionItem[];
  colID: string;
}) {
  const [list, setList] = useState<ActionItem[]>(initialList || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState("");

  const [newAction, setNewAction] = useState<string>("");

  const handleSave = async (newList: ActionItem[]) => {
    setList(newList);

    try {
      await pb.collection(colID).update(itemId, {
        follow_up: {
          actions: newList,
        },
        customUpdated: new Date().toISOString(),
      });
      toast.success("Follow-up actions updated");
    } catch (err) {
      toast.error("Failed to update follow-up actions");
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setTempValue(list[index].action);
  };

  const handleUpdate = async () => {
    if (editingIndex === null) return;

    const newList = [...list];
    newList[editingIndex] = {
      ...newList[editingIndex],
      action: tempValue,
    };

    setEditingIndex(null);
    await handleSave(newList);
  };

  const handleAdd = async () => {
    if (!newAction.trim()) return;

    const newItem: ActionItem = {
      action: newAction.trim(),
      createdAt: new Date().toISOString(),
    };

    const newList = [...list, newItem];

    setNewAction("");
    await handleSave(newList);
  };

  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-start gap-2 bg-muted rounded px-2 py-1"
        >
          {editingIndex === index ? (
            <input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="border px-2 py-0 text-[12px] w-full"
            />
          ) : (
            <div className="flex flex-row gap-2">
              <span className="text-[12px]">{item.action}</span>
              <span className="text-[10px] text-gray-400">
                {item.createdAt && (
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNowStrict(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-1">
            {editingIndex === index ? (
              <button onClick={handleUpdate}>
                <Check size={16} />
              </button>
            ) : (
              <button onClick={() => handleEdit(index)}>
                <Pencil size={12} />
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="follow up..."
          className="text-xs px-2 py-1 border rounded w-full"
        />

        <button
          onClick={handleAdd}
          disabled={!newAction.trim()}
          className="text-blue-500 disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

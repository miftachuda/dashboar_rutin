import { useState } from "react";
import { Pencil, Check, Loader2 } from "lucide-react";
import AutoResizeTextarea from "./AutoResizeInput";

type Props = {
  item: any;
  pb: any;
  onUpdated?: (id: string, value: string) => void;
};

export default function EditableHighlight({ item, pb, onUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.highlight);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === item.highlight) {
      setIsEditing(false);
      return;
    }

    setSaving(true);

    try {
      await pb.collection("highlight_pitstop_2027").update(item.id, {
        highlight: value,
      });

      onUpdated?.(item.id, value);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full items-start gap-2">
      {isEditing ? (
        <div className="grid min-w-[50px] max-w-full">
          <span
            className="invisible col-start-1 row-start-1 whitespace-pre-wrap px-2 py-1 text-xs"
            aria-hidden="true"
          >
            {value || " "}
          </span>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={1}
            className="col-start-1 row-start-1 min-w-0 w-full resize-none overflow-y-auto rounded border px-2 py-1 text-xs"
          />
        </div>
      ) : (
        <span className="max-w-full break-words text-sm font-medium">
          {item.highlight}
        </span>
      )}

      <button
        onClick={isEditing ? handleSave : () => setIsEditing(true)}
        disabled={saving}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-white ${
          saving
            ? "cursor-not-allowed bg-gray-400"
            : isEditing
              ? "bg-green-500 hover:bg-green-600"
              : "text-gray-500 hover:bg-gray-200"
        }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isEditing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4 text-gray-600" />
        )}
      </button>
    </div>
  );
}

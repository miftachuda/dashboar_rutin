import { useEffect, useState } from "react";

export default function RestrokeInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  // keep sync if parent changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onSave(localValue)}
      className="w-full px-1 border rounded"
    />
  );
}

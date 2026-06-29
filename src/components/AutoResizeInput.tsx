import { useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function AutoResizeTextarea({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className="w-full min-w-0 resize-none rounded border px-2 py-1 text-xs"
    />
  );
}

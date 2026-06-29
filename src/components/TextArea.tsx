import { useLayoutEffect, useRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function AutoResizeTextarea(props: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useLayoutEffect(() => {
    resize();
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      spellCheck={false}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      className={`resize-none overflow-hidden ${props.className || ""}`}
    />
  );
}

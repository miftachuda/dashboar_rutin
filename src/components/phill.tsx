import { Wrench, Tag, Bolt, Cog } from "lucide-react";

type PillCardProps = {
  discipline: string;
  type: string;
  tag: string;
  unit: string;
};

const valueColorPalettes = [
  {
    border: "border-sky-100",
    background: "bg-sky-50",
    iconBackground: "bg-sky-100",
    iconText: "text-sky-700",
    text: "text-sky-950",
  },
  {
    border: "border-emerald-100",
    background: "bg-emerald-50",
    iconBackground: "bg-emerald-100",
    iconText: "text-emerald-700",
    text: "text-emerald-950",
  },
  {
    border: "border-amber-100",
    background: "bg-amber-50",
    iconBackground: "bg-amber-100",
    iconText: "text-amber-700",
    text: "text-amber-950",
  },
  {
    border: "border-violet-100",
    background: "bg-violet-50",
    iconBackground: "bg-violet-100",
    iconText: "text-violet-700",
    text: "text-violet-950",
  },
  {
    border: "border-rose-100",
    background: "bg-rose-50",
    iconBackground: "bg-rose-100",
    iconText: "text-rose-700",
    text: "text-rose-950",
  },
  {
    border: "border-cyan-100",
    background: "bg-cyan-50",
    iconBackground: "bg-cyan-100",
    iconText: "text-cyan-700",
    text: "text-cyan-950",
  },
];

export const getValueColorPalette = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  const hash = Array.from(normalizedValue).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return valueColorPalettes[hash % valueColorPalettes.length];
};

export default function PillCards({
  discipline,
  type,
  tag,
  unit,
}: PillCardProps) {
  const items = [
    {
      icon: <Bolt size={22} />,
      value: unit,
    },
    {
      icon: <Tag size={22} />,
      value: tag,
    },
    {
      icon: <Wrench size={22} />,
      value: discipline,
    },
    {
      icon: <Cog size={22} />,
      value: type,
    },
  ];

  return (
    <div className="flex  gap-4">
      {items.map((item, idx) => {
        const color = getValueColorPalette(item.value);

        return (
          <div
            key={idx}
            className={`
            rounded-sm
            border
            ${color.border}
            ${color.background}
            px-1
            py-1
            shadow-sm
            hover:shadow-md
            transition-all
            flex
            items-center
            gap-2
          `}
          >
            <div
              className={`
              w-5
              h-5
              rounded-md
              ${color.iconBackground}
              ${color.iconText}
              flex
              items-center
              justify-center
              shrink-0
            `}
            >
              {item.icon}
            </div>

            <span className={`text-xs font-semibold ${color.text}`}>
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

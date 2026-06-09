import { Wrench, Tag, Bolt, Cog, Factory, Gauge, Zap } from "lucide-react";

type PillCardProps = {
  discipline: string;
  type: string;
  tag: string;
  unit: string;
};

type PillKind = "unit" | "tag" | "type" | "discipline";

const valueColorPalettes = [
  {
    border: "border-blue-200",
    background: "bg-blue-50",
    iconBackground: "bg-blue-100",
    iconText: "text-blue-700",
    text: "text-sky-950",
  },
  {
    border: "border-emerald-200",
    background: "bg-emerald-50",
    iconBackground: "bg-emerald-100",
    iconText: "text-emerald-700",
    text: "text-emerald-950",
  },
  {
    border: "border-amber-200",
    background: "bg-amber-50",
    iconBackground: "bg-amber-100",
    iconText: "text-amber-700",
    text: "text-amber-950",
  },
  {
    border: "border-violet-200",
    background: "bg-violet-50",
    iconBackground: "bg-violet-100",
    iconText: "text-violet-700",
    text: "text-violet-950",
  },
  {
    border: "border-rose-200",
    background: "bg-rose-50",
    iconBackground: "bg-rose-100",
    iconText: "text-rose-700",
    text: "text-rose-950",
  },
  {
    border: "border-cyan-200",
    background: "bg-cyan-50",
    iconBackground: "bg-cyan-100",
    iconText: "text-cyan-700",
    text: "text-cyan-950",
  },
];

const disciplineColorPalettes: Record<
  string,
  (typeof valueColorPalettes)[number]
> = {
  rotating: {
    border: "border-orange-200",
    background: "bg-orange-50",
    iconBackground: "bg-orange-100",
    iconText: "text-orange-700",
    text: "text-orange-950",
  },
  stationary: {
    border: "border-indigo-200",
    background: "bg-indigo-50",
    iconBackground: "bg-indigo-100",
    iconText: "text-indigo-700",
    text: "text-indigo-950",
  },
  instrument: {
    border: "border-fuchsia-200",
    background: "bg-fuchsia-50",
    iconBackground: "bg-fuchsia-100",
    iconText: "text-fuchsia-700",
    text: "text-fuchsia-950",
  },
  electrical: {
    border: "border-yellow-200",
    background: "bg-yellow-50",
    iconBackground: "bg-yellow-100",
    iconText: "text-yellow-700",
    text: "text-yellow-950",
  },
};

const unitColorPalettes = [
  {
    border: "border-blue-500",
    background: "bg-gradient-to-r from-blue-600 to-cyan-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-yellow-500",
    background: "bg-gradient-to-r from-yellow-400 to-amber-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-indigo-500",
    background: "bg-gradient-to-r from-indigo-600 to-violet-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-fuchsia-500",
    background: "bg-gradient-to-r from-fuchsia-600 to-pink-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-amber-500",
    background: "bg-gradient-to-r from-amber-500 to-orange-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-red-500",
    background: "bg-gradient-to-r from-red-600 to-rose-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
  {
    border: "border-lime-500",
    background: "bg-gradient-to-r from-lime-600 to-green-500",
    iconBackground: "bg-white/20",
    iconText: "text-white",
    text: "text-white",
  },
] as const;

const knownUnitColorIndexes: Record<string, number> = {
  "002": 0,
  "021": 1,
  "022": 2,
  "023": 4,
  "024": 3,
  "025": 5,
  "041": 6,
};

const categoryColorPalettes: Record<
  Exclude<PillKind, "discipline" | "unit">,
  (typeof valueColorPalettes)[number]
> = {
  tag: {
    border: "border-emerald-200",
    background: "bg-emerald-50",
    iconBackground: "bg-emerald-100",
    iconText: "text-emerald-700",
    text: "text-emerald-950",
  },
  type: {
    border: "border-violet-200",
    background: "bg-violet-50",
    iconBackground: "bg-violet-100",
    iconText: "text-violet-700",
    text: "text-violet-950",
  },
};

export const getUnitColorPalette = (unit: string) => {
  const normalizedUnit = unit.trim().toLowerCase();
  const knownIndex = knownUnitColorIndexes[normalizedUnit];
  if (knownIndex !== undefined) return unitColorPalettes[knownIndex];

  const hash = Array.from(normalizedUnit).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return unitColorPalettes[hash % unitColorPalettes.length];
};

const getDisciplineIcon = (discipline: string) => {
  switch (discipline.trim().toLowerCase()) {
    case "rotating":
      return <Cog size={14} />;
    case "stationary":
      return <Factory size={14} />;
    case "instrument":
      return <Gauge size={14} />;
    case "electrical":
      return <Zap size={14} />;
    default:
      return <Wrench size={14} />;
  }
};

export const getValueColorPalette = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  const disciplinePalette = disciplineColorPalettes[normalizedValue];
  if (disciplinePalette) return disciplinePalette;

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
      kind: "unit",
      icon: <Bolt size={14} />,
      value: unit,
    },
    {
      kind: "tag",
      icon: <Tag size={14} />,
      value: tag,
    },
    {
      kind: "type",
      icon: null,
      value: type,
    },
    {
      kind: "discipline",
      icon: getDisciplineIcon(discipline),
      value: discipline,
    },
  ] satisfies Array<{
    kind: PillKind;
    icon: React.ReactNode;
    value: string;
  }>;

  return (
    <div className="flex  gap-4">
      {items.map((item, idx) => {
        const color =
          item.kind === "unit"
            ? getUnitColorPalette(item.value)
            : item.kind === "discipline"
              ? getValueColorPalette(item.value)
              : categoryColorPalettes[item.kind];

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
            {item.icon && (
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
            )}

            <span className={`text-xs font-semibold ${color.text}`}>
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

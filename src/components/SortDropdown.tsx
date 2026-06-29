import React from "react";

export type SortOption = {
  label: string;
  value: string;
};

type Props = {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
};

const SortDropdown: React.FC<Props> = ({ options, value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600">Sort by:</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortDropdown;

export const FILTER_OPTIONS = [
  { value: "minggu", label: "Minggu Ini" },
  { value: "bulan", label: "Bulan Ini" },
  { value: "tahun", label: "Tahun Ini" },

  { value: "januari", label: "Januari" },
  { value: "februari", label: "Februari" },
  { value: "maret", label: "Maret" },
  { value: "april", label: "April" },
  { value: "mei", label: "Mei" },
  { value: "juni", label: "Juni" },
  { value: "juli", label: "Juli" },
  { value: "agustus", label: "Agustus" },
  { value: "september", label: "September" },
  { value: "oktober", label: "Oktober" },
  { value: "november", label: "November" },
  { value: "desember", label: "Desember" },

  { value: "semuaWaktu", label: "Sepanjang Waktu" },
] as const;

export type FilterRange = (typeof FILTER_OPTIONS)[number]["value"];

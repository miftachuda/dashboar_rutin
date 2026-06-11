export type PropaneTank = "022V-103" | "024V-112";

export interface ChemicalUsage {
  id: string;
  chemical_name: string;
  amount: number;
  unit: string;
  propane_tank?: PropaneTank | "";
  propane_start_level?: number;
  propane_end_level?: number;
  propane_volume_m3?: number;
  time: number;
  created: string;
  updated: string;
  description: string;
  isDeleted: boolean;
}

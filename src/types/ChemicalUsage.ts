export interface ChemicalUsage {
  id: string;
  chemical_name: string;
  amount: number;
  unit: string;
  time: number;
  created: string;
  updated: string;
  description: string; // ✅ ADD THIS
}

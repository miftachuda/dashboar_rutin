export const consumableMaterialSections = [
  "Pelumas",
  "Gasket",
  "Hose",
  "Belt",
] as const;

export type ConsumableMaterialSection =
  (typeof consumableMaterialSections)[number];

export const consumableMaterialTypeOptions = {
  Pelumas: ["Oil", "Grease", "Additive"],
  Gasket: [],
  Hose: [],
  Belt: [],
} as const satisfies Record<ConsumableMaterialSection, readonly string[]>;

export type ConsumableMaterialTypeMap = typeof consumableMaterialTypeOptions;

export type ConsumableMaterialType =
  ConsumableMaterialTypeMap[ConsumableMaterialSection][number];

export type ConsumptionPeriod = "day" | "week" | "month" | "year";

export interface ConsumableMaterial {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  section: ConsumableMaterialSection;
  type: ConsumableMaterialType;
  material_name: string;
  stock: number;
  unit: string;
  minimum_stock?: number;
  consumption_rate?: number;
  consumption_unit?: string;
  consumption_period?: ConsumptionPeriod;
  description?: string;
}

export type MapLayerId =
  | "base"
  | "med_income"
  | "income_skewness"
  | "bachelor_plus_pct"
  | "transit_pct"
  | "owner_pct"
  | string;

export type LayerState = Record<MapLayerId, boolean>;

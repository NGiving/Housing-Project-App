export type MapLayerId =
  | "base"
  | "med_income"
  | "avg_age"
  | "avg_household_size"
  | "employment_rate"
  | "unemployment_rate"
  | "commute_time"
  | string;

export type LayerState = Record<MapLayerId, boolean>;

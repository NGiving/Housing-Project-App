export interface NeighbourhoodMetrics {
  med_income: number;
  avg_psf: number;
  avg_dom: number;
  bachelor_plus_pct: number;
  transit_pct: number;
  listing_count: number;
  // If more census columns later, add them here
}

export type NeighbourhoodDataMap = Record<string, NeighbourhoodMetrics>;
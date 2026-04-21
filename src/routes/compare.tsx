import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import type {
  NeighbourhoodDataMap,
  NeighbourhoodMetrics,
} from "@/types/neighbourhood";

const compareSearchSchema = z.object({
  n: z.array(z.string()).default([]),
});

export const Route = createFileRoute("/compare")({
  validateSearch: (search) => compareSearchSchema.parse(search),
  component: Compare,
});

interface ComparisonItem extends NeighbourhoodMetrics {
  name: string;
}

interface MetricConfig {
  key: keyof NeighbourhoodMetrics;
  label: string;
  format: "currency" | "pct" | "number" | "days";
}

const METRICS: MetricConfig[] = [
  { key: "med_income", label: "Median Income", format: "currency" },
  { key: "avg_psf", label: "Avg. Price/Sqft", format: "currency" },
  { key: "bachelor_plus_pct", label: "Degree Holders", format: "pct" },
  { key: "transit_pct", label: "Transit Usage", format: "pct" },
  { key: "listing_count", label: "Active Listings", format: "number" },
  { key: "avg_dom", label: "Avg. Days on Market", format: "days" },
];

function ComparisonRow({
  label,
  data,
  attr,
  format,
}: {
  label: string;
  data: ComparisonItem[];
  attr: keyof NeighbourhoodMetrics;
  format: MetricConfig["format"];
}) {
  const formatValue = (val: number | null | undefined) => {
    if (val === undefined || val === null) return "—";
    switch (format) {
      case "currency":
        return `$${Math.round(val).toLocaleString()}`;
      case "pct":
        return `${(val * 100).toFixed(1)}%`;
      case "number":
        return Math.round(val).toLocaleString();
      case "days":
        return `${Math.round(val)} days`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <tr className="group hover:bg-blue-50/50 transition-colors">
      <td className="sticky left-0 z-10 p-5 font-bold text-slate-500 bg-white border-r group-hover:bg-blue-50/50 text-sm">
        {label}
      </td>
      {data.map((item) => (
        <td
          key={item.name}
          className="p-5 border-l font-mono text-sm text-slate-700"
        >
          {formatValue(item[attr])}
        </td>
      ))}
    </tr>
  );
}

function Compare() {
  const { n: selectedNames }: { n: string[] } = Route.useSearch();
  const [data, setData] = useState<NeighbourhoodDataMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      await fetch("/neighbourhood_data.json")
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load neighbourhood data:", err);
          setLoading(false);
        });
    }
    fetchData();
  }, []);

  const compareData: ComparisonItem[] = data
    ? selectedNames
        .filter((name: string) => name in data)
        .map((name: string) => ({
          name,
          ...data[name],
        }))
    : [];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (compareData.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-slate-50 mx-6 mt-10">
        <h2 className="text-xl font-bold">No Neighbourhoods Found</h2>
        <p className="text-slate-500 mt-2">
          Return to the map to select areas for comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Market Matrix
        </h1>
        <p className="text-slate-500">
          Cross-comparing {compareData.length} selected urban zones
        </p>
      </header>

      <div className="relative overflow-hidden border rounded-2xl bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-20 w-[180px] p-5 bg-slate-900 font-bold uppercase text-xs tracking-widest border-r border-slate-800">
                  Metric
                </th>
                {compareData.map((d) => (
                  <th
                    key={d.name}
                    className="p-5 min-w-[240px] border-l border-slate-700"
                  >
                    <span className="block text-blue-400 text-xs mb-1 uppercase">
                      Zone
                    </span>
                    <span className="text-lg font-black truncate block">
                      {d.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {METRICS.map((metric) => (
                <ComparisonRow
                  key={metric.key}
                  label={metric.label}
                  data={compareData}
                  attr={metric.key}
                  format={metric.format}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

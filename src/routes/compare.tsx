import type {
  NeighbourhoodDataMap,
  NeighbourhoodMetrics,
} from "@/types/neighbourhood";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

const compareSearchSchema = z.object({
  n: z.array(z.string()).default([]),
});

type CompareSearch = z.infer<typeof compareSearchSchema>;

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

      {data.length < 5 && (
        <td className="p-5 border-l bg-slate-50/30 italic text-slate-300 text-xs">
          —
        </td>
      )}
    </tr>
  );
}

function Compare() {
  const { n: selectedNames }: { n: string[] } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [data, setData] = useState<NeighbourhoodDataMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const addNeighbourhood = (name: string) => {
    navigate({
      search: (prev: CompareSearch) => ({
        ...prev,
        n: [...prev.n, name],
      }),
    });
    setSearchQuery("");
  };

  const removeNeighbourhood = (name: string) => {
    navigate({
      search: (prev: CompareSearch) => ({
        ...prev,
        n: prev.n.filter((item) => item !== name),
      }),
    });
  };

  const availableOptions = data
    ? Object.keys(data).filter((name) => !selectedNames.includes(name))
    : [];

  const filteredOptions = availableOptions
    .filter((name) => name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 8);

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
      <div className="max-w-2xl mx-auto p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mt-20 shadow-sm">
        <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-sm border">
          <Search className="w-8 h-8 text-slate-400" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Compare Neighbourhoods
        </h2>
        <p className="text-slate-500 mt-2 mb-8 max-w-sm mx-auto">
          Search and add up to 5 neighbourhood to compare housing metrics and
          demographics.
        </p>

        <div className="relative max-w-md mx-auto mb-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Type a neighbourhood name (e.g. High Park)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
            />
          </div>

          {searchQuery.length > 0 && (
            <ul className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-50 text-left">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li key={option}>
                    <button
                      onClick={() => addNeighbourhood(option)}
                      className="w-full text-left px-5 py-4 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors flex justify-between items-center group"
                    >
                      {option}
                      <span className="text-xs font-normal text-slate-400 group-hover:text-blue-400">
                        Add +
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-5 py-4 text-sm text-slate-400 italic">
                  No matching neighbourhoods...
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-8 bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            or
          </span>
          <div className="h-px w-8 bg-slate-200" />
        </div>

        <Link
          to="/"
          className="mt-6 inline-flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to interactive map
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-400 mx-auto">
      <nav>
        <Link
          to="/"
          className="group flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to City Map
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Comparison
        </h1>
        <p className="text-slate-500">
          Cross-comparing {compareData.length} selected neighbourhoods
        </p>
      </header>

      <div className="relative overflow-hidden border rounded-2xl bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-20 w-45 p-5 bg-slate-900 font-bold uppercase text-xs tracking-widest border-r border-slate-800">
                  Metric
                </th>
                {compareData.map((d) => (
                  <th
                    key={d.name}
                    className="p-5 min-w-60 border-l border-slate-700 relative group/col"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block text-blue-400 text-xs mb-1 uppercase">
                          Neighbourhood
                        </span>
                        <span className="text-lg font-black block w-40">
                          {d.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeNeighbourhood(d.name)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
                {compareData.length < 5 && (
                  <th className="p-5 min-w-60 border-l border-slate-700 bg-slate-800/50 relative overflow-visible">
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Add Neighbourhood..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Dropdown Menu */}
                      {searchQuery.length > 0 && (
                        <ul className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-50 text-slate-900">
                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                              <li key={option}>
                                <button
                                  onClick={() => addNeighbourhood(option)}
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors border-b last:border-0 border-slate-50"
                                >
                                  <span className="font-bold">{option}</span>
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-3 text-xs text-slate-400 italic">
                              No matches found
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </th>
                )}
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

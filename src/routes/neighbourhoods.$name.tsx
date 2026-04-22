import { BokehEmbed } from "@/components/BokehEmbed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

const snapshots = import.meta.glob("../assets/snapshots/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const Route = createFileRoute("/neighbourhoods/$name")({
  component: Neighbourhood,
});

const HOUSING_GRAPHS = [
  {
    key: "price_hist",
    title: "Price Distribution",
    containerId: "bokeh-price-hist-container",
  },
  {
    key: "price_over_time",
    title: "Median Price Over Time",
    containerId: "bokeh-price-over-time-container",
  },
  {
    key: "price_by_type",
    title: "Price by House Type",
    containerId: "bokeh-price-by-type-container",
  },
  {
    key: "beds",
    title: "Bedroom Distribution",
    containerId: "bokeh-beds-container",
  },
] as const;

interface HoodStats {
  population: number | null;
  transit_pct: number | null;
  non_english_pct: number | null;
  bachelor_pct: number | null;
  city: {
    transit_pct: number;
    non_english_pct: number;
    bachelor_pct: number;
  };
}

function StatCard({
  label,
  value,
  cityValue,
}: {
  label: string;
  value: string | null;
  cityValue?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg border p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-3xl font-bold tracking-tight text-slate-900">
        {value ?? "—"}
      </p>
      {cityValue && (
        <p className="text-xs text-slate-400">City average: {cityValue}</p>
      )}
    </div>
  );
}

function fmt_pct(v: number | null) {
  return v != null ? `${(v * 100).toFixed(1)}%` : null;
}

function fmt_pop(v: number | null) {
  return v != null ? v.toLocaleString() : null;
}

function Neighbourhood() {
  const { name } = Route.useParams();
  console.log(name);
  const snapshotSrc = snapshots[`../assets/snapshots/${name}.svg`];
  const [stats, setStats] = useState<HoodStats | null>(null);

  const safeName = encodeURIComponent(name);

  useEffect(() => {
    const fetchData = async () => {
      setStats(null);
      fetch(`/neighbourhoods/${safeName}/stats.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: HoodStats | null) => setStats(data))
        .catch(() => setStats(null));
    };
    fetchData();
  }, [safeName]);

  if (!snapshotSrc) {
    return (
      <div className="container max-w-5xl mx-auto px-8 py-6">
        <Link
          to="/"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Map
        </Link>
        <h1 className="text-center text-2xl font-bold">
          Neighbourhood not found
        </h1>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
      <nav>
        <Link
          to="/"
          className="group flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to City Map
        </Link>
      </nav>
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight">{name}</h1>
        <p className="text-xl text-slate-600 mt-2">
          Toronto neighbourhood housing snapshot
        </p>
      </header>

      <figure className="bg-slate-50/50 rounded-lg border p-6">
        <img
          src={snapshotSrc}
          alt={name}
          className="w-full h-auto"
        />
        <figcaption className="mt-4 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          Location Overview — {name}
        </figcaption>
      </figure>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-6">
          Housing Market Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HOUSING_GRAPHS.map(({ key, title, containerId }) => (
            <Card
              key={key}
              className="overflow-hidden"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <BokehEmbed
                  configUrl={`/neighbourhoods/${safeName}/${key}_config.json`}
                  containerId={containerId}
                  className="w-full"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Population</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Population"
            value={fmt_pop(stats?.population ?? null)}
          />
          <StatCard
            label="Use Public Transit"
            value={fmt_pct(stats?.transit_pct ?? null)}
            cityValue={
              stats ? (fmt_pct(stats.city.transit_pct) ?? undefined) : undefined
            }
          />
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <BokehEmbed
              configUrl={`/neighbourhoods/${safeName}/age_bars_config.json`}
              containerId="bokeh-age-bars-container"
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Language</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Non-English at Home"
            value={fmt_pct(stats?.non_english_pct ?? null)}
            cityValue={
              stats
                ? (fmt_pct(stats.city.non_english_pct) ?? undefined)
                : undefined
            }
          />
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Languages Spoken at Home
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <BokehEmbed
              configUrl={`/neighbourhoods/${safeName}/languages_pie_config.json`}
              containerId="bokeh-languages-pie-container"
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Education</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Bachelor's Degree or Higher"
            value={fmt_pct(stats?.bachelor_pct ?? null)}
            cityValue={
              stats
                ? (fmt_pct(stats.city.bachelor_pct) ?? undefined)
                : undefined
            }
          />
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Highest Education Attained
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <BokehEmbed
              configUrl={`/neighbourhoods/${safeName}/education_bars_config.json`}
              containerId="bokeh-education-bars-container"
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type { LayerState, MapLayerId } from "@/types/map";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as Bokeh from "@bokeh/bokehjs";
import propTypeDist from "../assets/prop_type_dist.svg";

export const Route = createFileRoute("/")({
  component: Home,
});

const LAYER_DISPLAY_NAMES: Record<MapLayerId, string> = {
  base: "Base Map",
  med_income: "Median Household Income",
  avg_age: "Average Resident Age",
  avg_household_size: "Average Household Size",
  employment_rate: "Employment Rate",
  unemployment_rate: "Unemployment Rate",
};

interface MapControlsProps {
  onToggleLayer: (id: MapLayerId, val: boolean) => void;
  layers: LayerState;
  selected: string[];
  onRemove: (name: string) => void;
}

function MapControls({
  onToggleLayer,
  layers,
  selected,
  onRemove,
}: MapControlsProps) {
  // Determine if a data layer is currently active to style the heading
  const activeLayer = (Object.keys(layers) as MapLayerId[]).find(
    (id) => layers[id] && id !== "base",
  );
  const navigate = useNavigate({ from: "/" });

  const handleCompareClick = () => {
    if (selected.length === 0) return;

    console.log(selected.join(","));

    navigate({
      to: "/compare",
      search: {
        name: selected.join(","),
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Histogram Section */}
      <Card className="overflow-hidden border-none shadow-none bg-slate-50/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {activeLayer
              ? `${LAYER_DISPLAY_NAMES[activeLayer]} Distribution`
              : "City-wide Baseline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="z-10 w-full px-2 pb-2">
            <div
              className="h-45 w-full"
              id="bokeh-hist-container"
            />
          </div>
        </CardContent>
      </Card>

      {/* Layers Selection Card */}
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Map Layers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Layer Switches */}
          <div className="grid gap-3">
            {(Object.keys(layers) as MapLayerId[])
              .filter((k) => k !== "base")
              .map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <Label
                    htmlFor={id}
                    className="grow cursor-pointer font-medium"
                  >
                    {LAYER_DISPLAY_NAMES[id]}
                  </Label>
                  <Switch
                    id={id}
                    checked={layers[id]}
                    onCheckedChange={(checked) => onToggleLayer(id, checked)}
                  />
                </div>
              ))}
          </div>

          <hr className="opacity-50" />

          {/* Comparison List */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-sm font-bold">Comparison List</Label>
              <span className="text-xs text-muted-foreground">
                {selected.length} / 5
              </span>
            </div>

            {selected.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground italic">
                  Tap neighborhoods on map to compare
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selected.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 text-xs bg-muted/50 rounded-md border animate-in fade-in slide-in-from-right-1"
                  >
                    <span className="truncate pr-2 font-medium">{name}</span>
                    <button
                      onClick={() => onRemove(name)}
                      className="rounded-full p-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full mt-2"
              variant={selected.length > 0 ? "default" : "secondary"}
              disabled={selected.length === 0}
              onClick={handleCompareClick}
            >
              Compare Neighborhoods
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<number | null>(null);
  const isMapLoaded = useRef(false);
  const isHistLoaded = useRef(false);
  const [layers, setLayers] = useState<LayerState>({
    base: true,
    med_income: false,
    avg_age: false,
    avg_household_size: false,
    employment_rate: false,
    unemployment_rate: false,
  });
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  // Load histogram
  useEffect(() => {
    if (isHistLoaded.current) return;
    isHistLoaded.current = true;

    const loadHist = async () => {
      try {
        const response = await fetch("/hist_config.json");
        const histData = await response.json();
        await window.Bokeh.embed.embed_item(histData, "bokeh-hist-container");
      } catch (err) {
        console.error("Failed to load histogram:", err);
        isHistLoaded.current = false;
      }
    };
    loadHist();
  }, []);

  // Update the histogram on map layer changes
  useEffect(() => {
    const activeLayerId =
      Object.keys(layers).find(
        (key) => layers[key] === true && key !== "base",
      ) || "base";

    if (activeLayerId && window.Bokeh) {
      window.Bokeh.documents.forEach((doc) => {
        const source = doc.get_model_by_name(
          "active_source",
        ) as Bokeh.ColumnDataSource | null;
        const histPlot = doc.get_model_by_name(
          "dynamic_hist",
        ) as Bokeh.Plot | null;

        if (source && histPlot) {
          source.tags = [activeLayerId];
          source.change.emit();

          if (activeLayerId !== "base") {
            setTimeout(() => {
              const data = source.data as Record<string, number[]>;
              const counts = data["top"];
              if (counts?.length > 0) {
                const maxCount = Math.max(...counts);
                histPlot.y_range.setv({
                  start: 0,
                  end: maxCount * 1.25,
                });
                histPlot.change.emit();
              }
            }, 150);
          }
        }
      });
    }
  }, [layers]);

  useEffect(() => {
    const activeLayerId =
      Object.keys(layers).find(
        (key) => layers[key as MapLayerId] === true && key !== "base",
      ) || "base";

    if (window.Bokeh) {
      window.Bokeh.documents.forEach((doc) => {
        // Update the Map source so the hover callback knows which column to read
        const mapSource = doc.get_model_by_name(
          "main_geosource",
        ) as Bokeh.ColumnDataSource | null;
        if (mapSource) {
          mapSource.tags = [activeLayerId];
        }
      });
    }
  }, [layers]);

  useEffect(() => {
    if (isMapLoaded.current) return;
    isMapLoaded.current = true;

    const loadMap = async () => {
      try {
        const response = await fetch("/map_config.json");
        const map = await response.json();

        if (mapRef.current) {
          mapRef.current.innerHTML = "";
        }

        await window.Bokeh.embed.embed_item(map, "bokeh-map-container");
      } catch (err) {
        console.error("Failed to load map template:", err);
        isMapLoaded.current = false;
      }
    };

    loadMap();
  }, []);

  // Update the red line in histogram
  useEffect(() => {
    const handleHover = (e: Event) => {
      const customEvent = e as CustomEvent<{ value: number | null }>;
      const val = customEvent.detail.value;

      if (!window.Bokeh) return;

      window.Bokeh.documents.forEach((doc) => {
        const span = doc.get_model_by_name("hover_indicator") as Bokeh.Span;
        const label = doc.get_model_by_name("hover_label_text") as Bokeh.Label;
        const plot = doc.get_model_by_name("dynamic_hist") as Bokeh.Plot;

        if (span && label && plot) {
          if (val === null) {
            setTimeout(() => {
              if (lastValueRef.current === null) {
                span.visible = false;
                label.visible = false;
              }
            }, 50);
            lastValueRef.current = null;
            return;
          }

          lastValueRef.current = val;
          span.visible = true;
          span.location = val;
          label.visible = true;
          label.x = val;
          label.y = plot.inner_height - 10;
          label.text = val.toLocaleString();
        }
      });
    };

    window.addEventListener("bokeh_hover", handleHover);
    return () => window.removeEventListener("bokeh_hover", handleHover);
  }, []);

  const handleToggle = (layerId: string, isVisible: boolean): void => {
    setLayers((prev: LayerState) => {
      const nextState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as LayerState);

      const activeId = isVisible && layerId !== "base" ? layerId : "base";
      nextState[activeId as MapLayerId] = true;

      const bokeh = window.Bokeh;
      if (bokeh?.documents.length > 0) {
        bokeh.documents.forEach((doc) => {
          Object.keys(prev).forEach((key) => {
            const layer = doc.get_model_by_name(
              `${key}_layer`,
            ) as Bokeh.GlyphRenderer | null;
            const cb = doc.get_model_by_name(
              `${key}_cb`,
            ) as Bokeh.ColorBar | null;
            const hover = doc.get_model_by_name(
              `${key}_hover`,
            ) as Bokeh.HoverTool | null;
            if (layer) layer.visible = false;
            if (cb) cb.visible = false;
            if (hover) hover.visible = false;
          });

          if (activeId === "base") {
            const baseLayer = doc.get_model_by_name(
              "base_layer",
            ) as Bokeh.GlyphRenderer;
            const baseHover = doc.get_model_by_name(
              "base_hover",
            ) as Bokeh.HoverTool;
            if (baseLayer) baseLayer.visible = true;
            if (baseHover) baseHover.visible = true;
          } else {
            const layer = doc.get_model_by_name(
              `${activeId}_layer`,
            ) as Bokeh.GlyphRenderer;
            const cb = doc.get_model_by_name(
              `${activeId}_cb`,
            ) as Bokeh.ColorBar;
            const hover = doc.get_model_by_name(
              `${activeId}_hover`,
            ) as Bokeh.HoverTool;
            if (layer) layer.visible = true;
            if (cb) cb.visible = true;
            if (hover) hover.visible = true;
          }
        });
      }
      return nextState;
    });
  };

  useEffect(() => {
    const handleSelection = (e: Event) => {
      const customEvent = e as CustomEvent<{ names: string[] }>;
      const newNames = customEvent.detail.names;
      setSelectedNames(newNames.slice(0, 5));
    };

    window.addEventListener("bokeh_select", handleSelection);
    return () => window.removeEventListener("bokeh_select", handleSelection);
  }, []);

  const handleRemove = (name: string) => {
    const next = selectedNames.filter((n) => n !== name);
    setSelectedNames(next);

    const bokeh = window.Bokeh;
    if (bokeh?.documents.length > 0) {
      bokeh.documents.forEach((doc) => {
        const source = doc.get_model_by_name(
          "main_geosource",
        ) as Bokeh.ColumnDataSource;
        if (source) {
          const data = source.data as Record<string, string[]>;
          const neighbourhoodData = data["neighbourhood"] as string[];
          const currentIndces = source.selected.indices as number[];
          const indices = currentIndces.filter(
            (i: number) => neighbourhoodData[i] !== name,
          );
          source.selected.indices = indices;
        }
      });
    }
  };

  return (
    <main className="flex flex-col w-full bg-background">
      <section className="h-[calc(100vh-65px)] w-full border-b">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full"
        >
          <ResizablePanel
            defaultSize="80%"
            minSize="50%"
          >
            <div
              className="h-full w-full bg-slate-50"
              ref={mapRef}
              id="bokeh-map-container"
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize="20%"
            minSize="15%"
          >
            <ScrollArea className="h-full border-l bg-card">
              <div className="p-6">
                <MapControls
                  onToggleLayer={handleToggle}
                  layers={layers}
                  selected={selectedNames}
                  onRemove={handleRemove}
                />
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
      <div className="container max-w-4xl mx-auto px-6">
        <section className="pt-24 pb-18 space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Introduction
            </h2>
          </div>
          <p className="text-xl text-slate-600 leading-relaxed">
            In 2024, real estate related activities accounted for 13.42% of
            Ontario's gross domestic product (GDP) output. For homebuyers and
            investors, however, it is important to understand that this
            aggregate value is often decoupled from the intrinsic value of
            individual properties. While buyers recognize that neighbourhood
            desirability drives cost, the composition of a home's price is
            unclear. A closing price is not only the combination of measurable
            factors in a home (i.e., square footage), but also the socioeconomic
            factors and neighbourhood premium. This project aims to quantify the
            intuition from investors. We utilize machine learning models to
            regress property values. By integrating structural housing data with
            socioeconomic indicators, we can see the impact of factors beyond
            what intrinsic utility can justify.
          </p>
        </section>

        <section className="py-18 space-y-6 border-t border-slate-100">
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Data Collection
            </h2>
          </div>
          <p className="text-xl text-slate-600 leading-relaxed">
            We obtained listings from Zolo.ca by scraping their Toronto listings
            that were marked as sold. The data contains 11,968 properties,
            although the data lacks granularity. We supplemented missing details
            using Google's Geocoding API to provide the exact latitude and
            longitude of properties. The listings span a period of 6 months,
            from May 19, 2025, to November 12, 2025. The socioeconomic data
            comes from the City of Toronto's Neighbourhood Profiles 2021. We
            acknowledge the limitations of the census data. Although the latest
            Torontoian data was unavailable, the relational information
            sufficed. The geographical boundaries of Toronto's neighbourhoods
            come from the City of Toronto's 158 neighbourhoods, subdivided by
            Statistics Canada census tracts.
          </p>
        </section>

        <section className="py-18 space-y-8 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Exploratory Data Analysis
            </h2>
            <p className="text-slate-500 max-w-2xl">
              We analyzed 11,000+ property records to identify structural trends
              before modeling.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Property Type Distribution
              </h3>
              <p className="text-sm text-slate-500">
                Condominium Apartments 
              </p>
            </div>

            <figure className="bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border p-8">
              <img
                src={propTypeDist}
                alt="Property Type Distribution chart"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.1 — Residential Distribution (n=11k)
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}

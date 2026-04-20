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
import * as Bokeh from "@bokeh/bokehjs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import educationHouseDist from "../assets/education_house_type_dist.svg";
import featureImportance from "../assets/feature_importance.svg";
import priceDist from "../assets/price_dist.svg";
import priceDomDist from "../assets/price_dom_dist.svg";
import priceIncomeReg from "../assets/price_income_regplot.svg";
import priceOccupancyDist from "../assets/price_occupancy_dist.svg";
import priceSqft from "../assets/price_sqft.svg";
import priceTransitReg from "../assets/price_transit_regplot.svg";
import propTypeDist from "../assets/prop_type_dist.svg";
import structTypeDist from "../assets/struct_type_dist.svg";
import toClusters from "../assets/toronto_kmean_clusters.svg";
import priceTorontoDist from "../assets/toronto_static_map.webp";
import transactionFreq from "../assets/transaction_frequency.svg";

export const Route = createFileRoute("/")({
  component: Home,
});

const LAYER_DISPLAY_NAMES: Record<MapLayerId, string> = {
  base: "Base Map",
  med_income: "Median Household Income",
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
                  Tap neighbourhoods on the map to compare
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
              Compare Neighbourhoods
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
            factors in a home (i.e., square footage, rooms, lot size), but also
            the socioeconomic factors and neighbourhood premium. This project
            aims to quantify the intuition from investors. We utilize machine
            learning models to regress property values. By integrating
            structural housing data with socioeconomic indicators, we can see
            the impact of factors beyond what intrinsic utility can justify.
          </p>
        </section>

        <section className="py-18 space-y-6 border-t border-slate-100">
          <div className="space-y-4">
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
            acknowledge the limitations of the 2021 census data. Although the
            latest Torontoian data was unavailable, the relational information
            sufficed. The geographical boundaries of Toronto's neighbourhoods
            come from the City of Toronto's 158 neighbourhoods, subdivided by
            Statistics Canada census tracts.
          </p>
        </section>

        <section className="py-18 space-y-12 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Exploratory Data Analysis
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
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
                Condominium apartments make up the majority of properties sold
                in the 6 months, follow by detached housing. This is a direct
                reflection of the volume of condominiums constructed over the
                past 5 years.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={propTypeDist}
                alt="Bar chart of property type distribution"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.1 — Residential Distribution (n=11k)
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Structure Type Distribution
              </h3>
              <p className="text-sm text-slate-500">
                Approximately 80% of the properties sold in this period are
                multi-storey or condominium. Note, we group any building that
                are listed as 1 1/2 storey or greater as multi-storey, bungalow
                and loft as single, split multi-level as split-level, apartment
                and bachelor/studio as apartment/condominium, stacked townhouse
                as townhouse, and the rest in others.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={structTypeDist}
                alt="Bar chart of structure type tistribution"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.2 — Residential Distribution (n=11k)
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Market Transaction Frequency
              </h3>
              <p className="text-sm text-slate-500">
                Daily transaction volume in Toronto fluctuates highly on a
                day-to-day basis. However, when we apply a 7-day rolling
                average, we can see the transaction volume declines from July
                until early September, before it recovered.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={transactionFreq}
                alt="Line plot of market transaction frequency showing 7-day rolling average"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.3 — Transaction Volume vs. Rolling Trend
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Price Stratification by Property Type
              </h3>
              <p className="text-sm text-slate-500">
                Visualizing price distribution on a logarithmic scale reveals
                the segmentation of the Toronto housing market. The majority of
                condominiums fall below $1M, whereas detached and semi-detached
                properties exhibit a significantly wider variance. This
                highlights the prioritized demand for land ownership over
                high-density living spaces.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceDist}
                alt="Log-normalized histogram of price distribution by property type"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.4 — Stratified Price Distribution - Log Scale
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Price per Square Foot by Property Type
              </h3>
              <p className="text-sm text-slate-500">
                We observe a high variance in price per square footage across
                several property types. As established above, property types
                that include land ownership command a higher median price per
                square footage. However, it cannot explain the large variance
                within individual property categories. This suggests that square
                footage independently is an insufficient predictor of market
                value.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceSqft}
                alt="Log-normalized boxplot of price per square foot by property type"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.5 — Stratified Price Distribution - Log Scale
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Distribution of Days on Market vs. Sale Price
              </h3>
              <p className="text-sm text-slate-500">
                Figure 1.6 illustrates the relationship between days on market
                and selling price. The bivariate distribution reveals a strong
                leftward skew, with peak transaction density occurring within
                the first 30 days. While this confirms that market transactions
                are highest for correctly priced assets, the significant
                vertical dispersion of prices on any given day on the market
                suggests that time-axis alone cannot account for final
                valuation. This variance highlights the necessity of
                socioeconomic features to differentiate between high-demand
                markets and slow-moving listings.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceDomDist}
                alt="Bivariate distribution scatterplot of days on market vs. sale price"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.6 — Price vs. DOM Distribution
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Distribution of Neighbourhood Median Household Income vs. Sale
                Price
              </h3>
              <p className="text-sm text-slate-500">
                The price of homes grows exponentially with household income, as
                seen in Figure 1.7. By using a logarithmic scale for the house
                prices, we have normalized the skewed distribution of the
                market. A straight line indicates that for every fixed dollar
                increase in a neighbourhood's income, the property value grows
                by a consistent percentage. While the physical details set the
                baseline for a home's price, this figure proves that the
                neighbourhood's purchasing power acts exponentially on the base
                value.
              </p>
              <p className="text-sm text-slate-500">
                Looking closer at the red trendline, we can see an upward bend
                starting around the $75k-$100k income mark. This suggests that
                once a neighbourhood crosses into a certain level of wealth,
                house prices increase exponentially instead of linearly. Once
                buyers have disposable income beyond their basic needs, they
                begin to compete much more aggressively for the exclusivity of a
                neighbourhood, driving prices up at a faster rate than in
                lower-income areas.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceIncomeReg}
                alt="Regplot of price vs. neighbourhood median household income with regression line"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.7 — Price vs. Neighbourhood Median Household Income
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Distribution of Neighbourhood Transit Usage vs. Sale Price
              </h3>
              <p className="text-sm text-slate-500">
                The most fascinating thing we uncovered from the data can be
                seen in this figure. We logically expect transit access and
                utilization to add value. However, the data shows a "U-shaped"
                curve where the most expensive properties often have the lowest
                transit utilization.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceTransitReg}
                alt="Regplot of price vs. neighbourhood transit usage with regression line"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.8 — Price vs. Neighbourhood Transit Usage
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Property Type vs. Percentage of Residents with Bachelor's Degree
                or Higher
              </h3>
              <p className="text-sm text-slate-500">
                As seen in Figure 1.9, the relationship between property types
                and educational attainment reveals that certain housing styles
                are more prevalent in higher education zones. The vertical
                distribution, particularly in the Condo Apt category, shows a
                large concentration of data points in the upper percentiles,
                suggesting that a highly educated population gravitate toward
                denser, urban-integrated housing. On the other hand, the wide
                bands for almost every category demonstrate that a
                neighbourhood's socioeconomic profile acts as a neighbourhood
                baseline. Whether a home is detached or a multiplex, its value
                is based on the collective human capital of the surrounding
                community.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={educationHouseDist}
                alt="Stripplot of property type vs. percentage of residents with bachelor's degree or higher"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.9 — Property Type vs. Percentage of Residents with
                Bachelor's Degree or Higher (%)
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Sale Price vs. Neighbourhood Tenure Percentage
              </h3>
              <p className="text-sm text-slate-500">
                By correlating 2021 Census tenure data with housing sales, we
                observe how Owner Occupancy acts as a proxy for neighbourhood
                stability. Higher concentrations of homeownership typically
                align with price premiums, whereas areas dominated by rental
                tenure often exhibit lower prices.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceOccupancyDist}
                alt="Scatter plot showing the correlation between household tenure and home sale prices"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.10 — Regression Analysis of Log Sale Price vs. Percentage
                of Owner-Occupied Households
              </figcaption>
            </figure>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                The Geography of Home Prices
              </h3>
              <p className="text-sm text-slate-500">
                The spatial distribution in Figure 1.11 shows clusters of
                high-value neighbourhoods, where prices consistently exceed
                $2.5M. Highlighted by the deep purple surrounding these
                clusters, where prices drop abruptly. Ultimately, the map proves
                that Toronto's property value is heavily anchored to specific
                geographic and socioeconomic boundaries rather than a uniform
                city-wide trend.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={priceTorontoDist}
                alt="Heatmap of sale price vs. housing location"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 1.11 — Spatial Distribution of Sold Prices ($) overlaid on
                neighbourhood boundaries
              </figcaption>
            </figure>
          </div>
        </section>
        <section className="py-18 space-y-12 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Feature Engineering
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              In addition to property attributes, we constructed three new
              features to improve model performance. These engineered variables
              were constructed to represent practical considerations in real
              life housing valuation. The first feature, Total number of
              bedrooms (total_beds), is the sum of bedrooms and bedrooms_plus.
              The second feature, Square Footage per Room (sqft_per_room), is
              the division between sqft and rooms. The third feature, Bedrooms
              to Bathrooms Ratio (beds_to_bath), is the division between
              total_beds and bathrooms.
            </p>
            <p className="text-xl text-slate-600 leading-relaxed">
              Our second model includes the base model's features and the
              socioeconomic features of each neighbourhood. The model includes
              median household income, the percentage of bachelor's degree or
              higher, transit utilization, percentage of owner occupancy, and
              income skewness. We hypothesize that the socioeconomic features
              will outweigh most of the property attributes.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Toronto Pricing Clusters</h3>
              <p className="text-sm text-slate-500">
                This visualization uses k-means clustering on Latitude and
                Longitude to segment the Toronto housing market into 15 distinct
                zones. By clustering spatially, we segmented local property
                prices regardless of their physical neighbourhood.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={toClusters}
                alt="Spatial cluster map of Toronto housing sale prices"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 2.1 — Geographic Centroids and Log-Price Density
                Distribution
              </figcaption>
            </figure>
          </div>
        </section>
        <section className="py-18 space-y-12 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Algorithm Selection
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              We chose LightGBM, short for Light Gradient Boosting Machine, a
              widely used model in predictive tasks as an ensemble method that
              sequentially builds decision trees. We constructed two models, a
              base model using exclusively physical attributes of a property,
              and an advanced model that is aware of socioeconomic and spatial
              features, for comparison.
            </p>
          </div>
        </section>
        <section className="py-18 space-y-12 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Model Evaluation
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              To validate the impact of socioeconomic data, we compared a
              baseline model against our socioeconomic and spatial aware model.
              The results confirm that socioeconomic indicators provide a
              superior price estimation, outperforming traditional structure
              metrics in explaining pricing variance.Integrating socioeconomic
              data, we achieved a 31.6% reduction in Mean Absolute Error (MAE).
              In other words we narrowed the evaluation gap from $
              {Number(225499).toLocaleString()} to $
              {Number(154157).toLocaleString()}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Predictive Lift
              </h4>
              <div className="text-3xl font-mono font-bold text-slate-900">
                -31.6%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Reduction in Mean Absolute Error (MAE) compared to physical
                baseline.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Dominant Driver
              </h4>
              <div className="text-3xl font-bold text-slate-900">
                Income Skewness
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ranked as the #2 most influential feature, surpassing bathroom
                and bedroom counts.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Feature Importance Hierarchy
              </h3>
              <p className="text-sm text-slate-500">
                Figure 3.1 shows a shift in the model logic as physical features
                are relatively less important to estimating housing prices.
                While square footage remains a strong indicator, socioeconomic
                indicators, specifically income skewness and educational
                attainment, emerge as the dominant indicator of price.
              </p>
            </div>

            <figure className="bg-slate-50/50 rounded-lg border p-8">
              <img
                src={featureImportance}
                alt="Bar chart showing socioeconomic features outranking physical attributes in predictive gain"
                className="w-full h-auto"
              />
              <figcaption className="mt-6 text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Fig 3.1 — Feature Importance (Total Gain)
              </figcaption>
            </figure>
          </div>
        </section>
        <section className="py-18 space-y-12 border-t border-slate-100">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Conclusion
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              This project successfully demonstrates that property valuation in
              Toronto can be decomposed into physical and socioeconomic factors.
              While square footage remains the fundamental value of a property,
              market value is aggressively depressed or inflated based on the
              conditions of a neighbourhood. By integrating with socioeconomic
              data, we reduced predictive error by 31.6%, showing that market
              values can be quantified rather than subjective intuition. For
              participants in the housing market, smaller properties in a
              rapidly gentrifying area could see higher appreciation than a
              larger property in a socioeconomically stagnant area.
            </p>
            <p className="text-xl text-slate-600 leading-relaxed">
              There are several limitations in this project. First, the analysis
              is only using a small snapshot in time for Toronto, which is not a
              good representation of housing markets in other cities or the GTA
              housing market as a whole. Therefore, it limits the generalization
              of our findings concluded in this project. Second, the
              socioeconomic data collected by Census Canada is subdivided into
              census tracts, which are designed for administrative and
              demographic stability, not for housing market analysis. The model
              assumes a uniform socioeconomic environment across the entire
              neighbourhood, which may not reflect the reality of houses located
              in arbitrary demographic zones with no real physical boundaries.
              Finally, the census data collected in 2021, which leaves a large
              gap in time where demographic shifts already occurred. The model
              lacks the ability to capture the speed of change, potentially
              underestimates the value in rapidly gentrifying neighbourhoods or
              overestimates in declining ones.
            </p>
            <p className="text-xl text-slate-600 leading-relaxed">
              For future work, we aim to leverage more comprehensive housing
              datasets, such as those maintained by the Canadian Real Estate
              Association (CREA), to expand the scope of our analysis. Our
              primary objective is to investigate the "fundamental value" of
              residential property and quantify the extent to which current
              market valuations deviate from these economic baselines. Drawing
              on the behavioural finance theories of American economist Robert
              J. Shiller, we seek to identify the speculative craze, castles in
              the air, constructed by market participants that drive housing
              prices significantly beyond their intrinsic utility.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

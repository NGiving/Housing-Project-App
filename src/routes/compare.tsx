import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const compareSearchSchema = z.object({
  name: z.array(z.string()).catch([]),
});

export const Route = createFileRoute("/compare")({
  validateSearch: (search) => compareSearchSchema.parse(search),
  component: Compare,
});

function Compare() {
  const { name: selectedNeighbourhoods } = Route.useSearch();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Comparison Analysis</h1>

      {selectedNeighbourhoods.length === 0 ? (
        <p>No neighborhoods selected for comparison.</p>
      ) : (
        <div className="grid gap-4">
          {selectedNeighbourhoods.map((name: string) => (
            <div
              key={name}
              className="p-4 border rounded-lg shadow-sm"
            >
              <h2 className="font-semibold">{name}</h2>
              {/* Data visualization for this specific neighborhood */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

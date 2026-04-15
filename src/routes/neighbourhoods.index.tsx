import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/neighbourhoods/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hi</div>;
}

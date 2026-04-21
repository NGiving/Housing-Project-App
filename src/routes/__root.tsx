import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <nav className="p-4 border-b bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <h2 className="text-lg font-bold tracking-tight">
          Toronto Neighborhood Data
        </h2>
        {/* You can add a Theme Toggle or Search here later */}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  ),
});

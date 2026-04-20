import { createRootRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <nav className="p-4 border-b bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <h2 className="text-lg font-bold tracking-tight">
          {/* Toronto Neighborhood Data */}
          <Link to="/">
            <img src="../../public/logo.svg" alt="6ixhomes logo" className="w-35" />
          </Link>
        </h2>
        {/* You can add a Theme Toggle or Search here later */}
      </nav>

      <main>
        <Outlet />
      </main>
      <footer>
        <div className="text-center p-5">
          <p className="text-s text-slate-600 leading-relaxed">&copy;2026 6IXHOMES Team</p>
        </div>
      </footer>

    </div>
  ),
});

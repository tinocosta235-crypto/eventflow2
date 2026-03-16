import { Suspense } from "react";
import { TopNav } from "./top-nav";
import { ContextualSidebar } from "./contextual-sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: "var(--background)" }}>
      <div className="ef-bg-aurora" />
      <div className="ef-bg-grid" />
      <TopNav />
      <Suspense fallback={null}>
        <ContextualSidebar />
      </Suspense>
      <main className="relative z-10" style={{ marginLeft: "var(--sidebar-width)", paddingTop: "var(--nav-height)", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}

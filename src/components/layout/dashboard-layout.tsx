import { Suspense } from "react";
import { TopNav } from "./top-nav";
import { ContextualSidebar } from "./contextual-sidebar";
import { FloatingAgentPanel } from "@/components/ui/floating-agent-panel";

export function DashboardLayout({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: "transparent" }}>
      <div className="ef-bg-aurora" />
      <div className="ef-bg-grid" />
      <TopNav />
      <Suspense fallback={null}>
        <ContextualSidebar />
      </Suspense>
      <main
        className="relative z-10"
        style={{
          marginLeft: "var(--sidebar-width)",
          minHeight: "100vh",
          paddingTop: "var(--nav-height)",
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
        }}
      >
        {children}
      </main>
      <FloatingAgentPanel />
    </div>
  );
}

// src/components/layout/StaticPageShell.tsx
import React from "react";
import MarqueeBar from "@/components/layout/MarqueeBar";

export default function StaticPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#151515] text-[#fbfbfb]" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      <MarqueeBar />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}

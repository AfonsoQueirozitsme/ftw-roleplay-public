// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import DashboardNavbar from "@/components/dashboard/Navbar";
import MarqueeBar from "@/components/layout/MarqueeBar";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (pathname === "/dashboard") {
      navigate("/dashboard/reports", { replace: true });
    }
  }, [pathname, navigate]);

  return (
    <div
      className="min-h-[100dvh] bg-[#151515] text-[#fbfbfb]"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      {/* Header sticky com empilhamento correto */}
      <header className="sticky top-0 z-40">
        <div className="relative z-40">
          <DashboardNavbar />
        </div>
        <div className="relative z-30">
          <MarqueeBar />
        </div>
      </header>

      {/* Content container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

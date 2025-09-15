import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import DashboardNavbar from "@/components/dashboard/Navbar";
import MarqueeBar from "@/components/layout/MarqueeBar";
export default function DashboardPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // exige sessão
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  // redireciona /dashboard root para /dashboard/reports
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
      <DashboardNavbar />
      <MarqueeBar />


      {/* Content container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

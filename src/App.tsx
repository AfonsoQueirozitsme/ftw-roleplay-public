// file: src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* — Público — */
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

/* — Auth (cliente) — */
import AuthPage from "@/pages/dashboard/auth/AuthPage";
import AuthCallback from "@/pages/dashboard/auth/AuthCallback";
import RequireAuth from "@/components/dashboard/RequireAuth";

/* — Client Dashboard (layout + outlet) — */
import DashboardPage from "@/pages/dashboard/Index"; // contém a navbar do dashboard e <Outlet/>

/* Vistas do dashboard (cada uma é um ecrã/aba) */
import ReportsTab from "@/pages/dashboard/ReportsTab";
import EarlyAccessTab from "@/pages/dashboard/EarlyAccessTab";
import RulesTab from "@/pages/dashboard/RulesTab";

/* — Páginas estáticas (públicas) — */
import Terms from "@/pages/static/Terms";
import RulesStatic from "@/pages/static/Rules";       // evitar conflito com RulesTab
import Privacy from "@/pages/static/Privacy";
import CookiesPage from "@/pages/static/Cookies";     // evitar conflito com name genérico
import About from "@/pages/static/About";
import Shop from "@/pages/static/Shop";
import Events from "@/pages/static/Events";
import News from "@/pages/static/News";
import NewsDetail from "@/pages/static/NewsDetail";

/* — Admin — */
import AdminLayout from "@/components/admin/layout/AdminLayout";
import AdminLogin from "@/pages/admin/auth";
import Dashboard from "@/pages/admin/index";
import Players from "@/pages/admin/players";
import PlayerDetail from "@/pages/admin/player-detail";
import TxAdmin from "@/pages/admin/txadmin";
import Candidaturas from "@/pages/admin/candidaturas";
import Logs from "@/pages/admin/logs";
import Imagens from "@/pages/admin/imagens";
import Resources from "@/pages/admin/resources";
import DevWork from "@/pages/admin/DevWork";
import DevLeaders from "@/pages/admin/DevLeaders";

export default function App() {
  return (
    <Routes>
      {/* Público (Navbar/Footer via <Layout/>) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* Auth público (fora do RequireAuth) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Estáticas */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/rules" element={<RulesStatic />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/events" element={<Events />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />

        {/* 404 público */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Client Dashboard (protegido) */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      >
        {/* /dashboard → /dashboard/reports */}
        <Route index element={<Navigate to="reports" replace />} />
        <Route path="reports" element={<ReportsTab />} />
        <Route path="early-access" element={<EarlyAccessTab />} />
        <Route path="rules" element={<RulesTab />} />
        {/* 404 específico do /dashboard */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin (sem Navbar/Footer público) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:ref" element={<PlayerDetail />} />
        <Route path="txadmin" element={<TxAdmin />} />
        <Route path="candidaturas" element={<Candidaturas />} />
        <Route path="logs" element={<Logs />} />
        <Route path="imagens" element={<Imagens />} />
        <Route path="devwork" element={<DevWork />} />
        <Route path="resources" element={<Resources />} />
        <Route path="devleaders" element={<DevLeaders />} />
        {/* 404 específico do /admin */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

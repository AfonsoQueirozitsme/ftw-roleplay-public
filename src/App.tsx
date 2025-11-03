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

/* — Client Dashboard — */
import DashboardPage from "@/pages/dashboard/Index";
import ReportsTab from "@/pages/dashboard/ReportsTab";
import EarlyAccessTab from "@/pages/dashboard/EarlyAccessTab";
import RulesTab from "@/pages/dashboard/RulesTab";
import CharactersTab from "@/pages/dashboard/CharactersTab";

/* — Páginas estáticas — */
import Terms from "@/pages/static/Terms";
import RulesStatic from "@/pages/static/Rules";
import Privacy from "@/pages/static/Privacy";
import CookiesPage from "@/pages/static/Cookies";
import About from "@/pages/static/About";
import Events from "@/pages/static/Events";
import News from "@/pages/static/News";
import NewsDetail from "@/pages/static/NewsDetail";
import Punishments from "@/pages/Punishments";

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
import RolesManagement from "@/pages/admin/roles";
import AdminTickets from "@/pages/admin/tickets";
import AdminRules from "@/pages/admin/rules";
import AdminPunishments from "@/pages/admin/punishments";
import AdminNews from "@/pages/admin/news";
import AdminUsers from "@/pages/admin/users";
import AdminPlayerInfo from "@/pages/admin/player-info";
import AdminEvents from "@/pages/admin/events";

/* — Redirect externo — */
function ExternalShopRedirect() {
  React.useEffect(() => {
    window.location.href = "https://shopftwrp.ftw.pt/";
  }, []);
  return <p style={{ textAlign: "center", marginTop: "2rem" }}>A redirecionar para a loja...</p>;
}

export default function App() {
  return (
    <Routes>
      {/* Público */}
        <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* Auth público */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Estáticas */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/rules" element={<RulesStatic />} />
        <Route path="/punishments" element={<Punishments />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />

        {/* Redirecionamento externo */}
        <Route path="/shop" element={<ExternalShopRedirect />} />

        {/* 404 público */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Client Dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="reports" replace />} />
        <Route path="reports" element={<ReportsTab />} />
        <Route path="early-access" element={<EarlyAccessTab />} />
        <Route path="characters" element={<CharactersTab />} />
        <Route path="rules" element={<RulesTab />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
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
        <Route path="news" element={<AdminNews />} />
        <Route path="player-info" element={<AdminPlayerInfo />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="roles" element={<RolesManagement />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="rules" element={<AdminRules />} />
        <Route path="punishments" element={<AdminPunishments />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

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
import DataManagementTab from "@/pages/dashboard/DataManagementTab";
import VipTab from "@/pages/dashboard/VipTab";

/* — Páginas estáticas — */
import Terms from "@/pages/static/Terms";
import RulesStatic from "@/pages/static/Rules";
import Privacy from "@/pages/static/Privacy";
import CookiesPage from "@/pages/static/Cookies";
import About from "@/pages/static/About";
import Events from "@/pages/static/Events";
import News from "@/pages/static/News";
import NewsDetail from "@/pages/static/NewsDetail";
import Shop from "@/pages/static/Shop";
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
import Tickets from "@/pages/admin/tickets";
import Rules from "@/pages/admin/rules";
import PunishmentsAdmin from "@/pages/admin/punishments";
import Users from "@/pages/admin/users";
import NewsAdmin from "@/pages/admin/news";
import EventsAdmin from "@/pages/admin/events";
import PlayerInfo from "@/pages/admin/player-info";

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

        {/* Loja */}
        <Route path="/shop" element={<Shop />} />

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
        <Route path="applications" element={<Navigate to="/dashboard/early-access" replace />} />
        <Route path="characters" element={<CharactersTab />} />
        <Route path="rules" element={<RulesTab />} />
        <Route path="data-management" element={<DataManagementTab />} />
        <Route path="vip" element={<VipTab />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<AdminLogin />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:id" element={<PlayerDetail />} />
        <Route path="candidaturas" element={<Candidaturas />} />
        <Route path="txadmin" element={<TxAdmin />} />
        <Route path="logs" element={<Logs />} />
        <Route path="imagens" element={<Imagens />} />
        <Route path="resources" element={<Resources />} />
        <Route path="devwork" element={<DevWork />} />
        <Route path="devleaders" element={<DevLeaders />} />
        <Route path="roles" element={<RolesManagement />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="rules" element={<Rules />} />
        <Route path="punishments" element={<PunishmentsAdmin />} />
        <Route path="users" element={<Users />} />
        <Route path="news" element={<NewsAdmin />} />
        <Route path="events" element={<EventsAdmin />} />
        <Route path="player-info" element={<PlayerInfo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}


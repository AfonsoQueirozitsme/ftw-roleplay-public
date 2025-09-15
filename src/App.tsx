import React from "react";
import { Routes, Route } from "react-router-dom";

// Público
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

// Auth (cliente)
import AuthPage from "@/pages/dashboard/auth/AuthPage";
import AuthCallback from "@/pages/dashboard/auth/AuthCallback";
import RequireAuth from "@/components/dashboard/RequireAuth";

// Client Dashboard
import ClientDashboard from "@/pages/dashboard/Index"; // contém tabs: Reports, Early Access, Regras

// Admin
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

export default function App() {
  return (
    <Routes>
      {/* Público (com Navbar/Footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* Auth público (fora do RequireAuth) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Client Dashboard (protegido) */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <ClientDashboard />
          </RequireAuth>
        }
      />

      {/* Admin (sem Navbar/Footer público) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:ref" element={<PlayerDetail />} /> {/* rota filha (relativa) */}
        <Route path="txadmin" element={<TxAdmin />} />
        <Route path="candidaturas" element={<Candidaturas />} />
        <Route path="logs" element={<Logs />} />
        <Route path="imagens" element={<Imagens />} />
        <Route path="resources" element={<Resources />} />
        {/* 404 específico do /admin */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

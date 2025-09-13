import React from "react";
import { Routes, Route } from "react-router-dom";

// Público
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

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
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin (sem Navbar/Footer público) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Players />} />
        <Route path="/admin/players/:ref" element={<PlayerDetail />} />
        <Route path="txadmin" element={<TxAdmin />} />
        <Route path="candidaturas" element={<Candidaturas />} />
        <Route path="logs" element={<Logs />} />
        <Route path="imagens" element={<Imagens />} />
        <Route path="resources" element={<Resources />} />
      </Route>
    </Routes>
  );
}

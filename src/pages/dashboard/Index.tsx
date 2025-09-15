// file: src/pages/dashboard/Page.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  MessageSquare,
  FilePlus2,
  Info,
  LogOut,
  User2,
  PanelsTopLeft,
  Sparkles,
  ShieldCheck,
  Bell,
  Settings,
  User as UserIcon,
  CheckCheck,
} from "lucide-react";

// Reutiliza os teus separadores existentes
import ReportsTab from "@/pages/dashboard/ReportsTab";
import EarlyAccessTab from "@/pages/dashboard/EarlyAccessTab";
import RulesTab from "@/pages/dashboard/RulesTab";

// UI helpers
const ring =
  "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black";

type TabKey = "reports" | "early" | "rules";
const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "reports", label: "Reports", icon: <MessageSquare className="w-4 h-4" /> },
  { key: "early", label: "Early Access", icon: <FilePlus2 className="w-4 h-4" /> },
  { key: "rules", label: "Regras & Info", icon: <Info className="w-4 h-4" /> },
];

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<TabKey>("reports");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unread = notifications.filter((n) => !n.read_at).length;

  const menuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(data.user.id);
      const url =
        (data.user.user_metadata?.avatar_url as string | undefined) ||
        (data.user.user_metadata?.picture as string | undefined) ||
        null;
      setAvatarUrl(url);
    });
  }, [navigate]);

  useEffect(() => {
    // tenta carregar notificações (se tiveres tabela `notifications`)
    (async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("id,title,body,created_at,read_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (!error && data) setNotifications(data as Notification[]);
      } catch {
        // se não existir tabela / erro silencioso
      }
    })();
  }, [userId]);

  // fecha dropdowns ao clicar fora
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen, notifOpen]);

  const fade = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  async function markAllRead() {
    if (!userId || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      }
    } catch {
      // ignora erro
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(90rem_40rem_at_20%_-10%,rgba(255,0,79,0.14),transparent),radial-gradient(80rem_40rem_at_120%_20%,rgba(255,255,255,0.08),transparent)]">
      {/* Topbar sticky */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-3">
          <PanelsTopLeft className="w-5 h-5 text-red-400" />
          <span className="font-semibold tracking-tight">FTW • Client Dashboard</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> beta
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setMenuOpen(false);
                }}
                className={`relative p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 ${ring}`}
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-black text-[10px] flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-semibold">Notificações</div>
                      <button
                        onClick={markAllRead}
                        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/15"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
                      </button>
                    </div>
                    <div className="max-h-[50vh] overflow-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-white/70">Sem notificações por agora.</div>
                      ) : (
                        <ul className="divide-y divide-white/10">
                          {notifications.map((n) => (
                            <li key={n.id} className="px-4 py-3 hover:bg-white/5">
                              <div className="text-sm font-medium">{n.title}</div>
                              {n.body && <div className="text-xs opacity-80 mt-0.5">{n.body}</div>}
                              <div className="text-[10px] opacity-60 mt-1">
                                {new Date(n.created_at).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar + menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 ${ring}`}
                aria-label="Abrir menu da conta"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 border border-white/15">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User2 className="w-4 h-4 opacity-70" />
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-[220px] rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
                    role="menu"
                    aria-label="Menu da conta"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-xs opacity-60">Conta</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 border border-white/15">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User2 className="w-4 h-4 opacity-70" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm opacity-90">Ligado via Discord</span>
                      </div>
                    </div>

                    <div className="p-1">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10"
                        onClick={() => {
                          setMenuOpen(false);
                          setNotifOpen(true);
                        }}
                      >
                        <Bell className="w-4 h-4" /> Notificações
                        {unread > 0 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-black">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                        <UserIcon className="w-4 h-4" /> Perfil
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                        <Settings className="w-4 h-4" /> Definições
                      </button>
                    </div>

                    <div className="p-1 border-t border-white/10">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-red-300"
                      >
                        <LogOut className="w-4 h-4" /> Sair
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Layout sem sidebar esquerda: conteúdo + painel direito */}
      <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Conteúdo central */}
        <section className="min-h-[60vh] rounded-2xl p-6 bg-white/10 border border-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          {/* Cabeçalho da área */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-semibold">Área do Cliente</h2>
            </div>

            {/* Tab strip com scroll horizontal em móvel */}
            <div className="relative flex items-center gap-1 rounded-xl p-1 bg-white/5 border border-white/10 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`relative px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
                    active === t.key ? "text-black" : "text-white/80 hover:text-white"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {t.icon}
                    {t.label}
                  </span>
                  {active === t.key && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-lg bg-red-500"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {active === "reports" && (
              <motion.div key="reports" variants={fade} initial="hidden" animate="show" exit="exit">
                <ReportsTab />
              </motion.div>
            )}
            {active === "early" && (
              <motion.div key="early" variants={fade} initial="hidden" animate="show" exit="exit">
                <EarlyAccessTab />
              </motion.div>
            )}
            {active === "rules" && (
              <motion.div key="rules" variants={fade} initial="hidden" animate="show" exit="exit">
                <RulesTab />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Painel direito (estado/AI/activity) mantém-se */}
        <aside className="h-fit lg:sticky lg:top-16 space-y-6">
          <div className="rounded-2xl p-5 bg-white/10 border border-white/10 backdrop-blur-xl">
            <h3 className="font-semibold mb-1">Boas-vindas 👋</h3>
            <p className="text-sm opacity-80">
              Usa <span className="px-1 rounded bg-white/10 border border-white/10">Reports</span> para abrir tickets com anexos.
              O sistema marca categoria/severidade e tenta detetar duplicados.
            </p>
          </div>

          <AccountStateCard />
          <ChangelogCard />
        </aside>
      </div>
    </div>
  );
}

function AccountStateCard() {
  return (
    <div className="rounded-2xl p-5 bg-white/10 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
        <h3 className="font-semibold">Estado da conta</h3>
      </div>
      <ul className="text-sm space-y-1">
        <li className="opacity-80">Sessão: <span className="text-emerald-300">ativa</span></li>
        <li className="opacity-80">Acesso: <span className="opacity-100">Early Access (conforme candidatura)</span></li>
      </ul>
    </div>
  );
}

function ChangelogCard() {
  return (
    <div className="rounded-2xl p-5 bg-white/10 border border-white/10 backdrop-blur-xl">
      <h3 className="font-semibold mb-2">Atualizações recentes</h3>
      <ul className="text-sm space-y-2 opacity-85">
        <li>• Novo menu de conta com avatar e notificações.</li>
        <li>• Tabs com “pill” animado.</li>
        <li>• Threads de reports com anexos privados.</li>
      </ul>
    </div>
  );
}

// Rota sugerida:
// <Route
//   path="/dashboard/page"
//   element={
//     <RequireAuth>
//       <DashboardPage />
//     </RequireAuth>
//   }
// />

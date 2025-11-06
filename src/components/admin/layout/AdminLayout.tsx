import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { listOnlinePlayers, listPlayers } from "@/lib/api/players";
import { listVehiclesGlobal } from "@/lib/api/vehicles";
import { clearPermissionsCache } from "@/shared/permissions";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileText,
  Settings,
  Key,
  Newspaper,
  Image,
  BookOpen,
  Calendar,
  Shield,
  Ticket,
  Ban,
  Code,
  Search,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Activity,
  Server,
  Zap,
  Bell,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminGuard } from "./useAdminGuard";

const Icon = {
  dashboard: LayoutDashboard,
  users: Users,
  account: UserCircle,
  ticket: Ticket,
  ban: Ban,
  search: Search,
  menu: Menu,
  chevronRight: ChevronRight,
  logout: LogOut,
  news: Newspaper,
  image: Image,
  article: FileText,
  calendar: Calendar,
  book: BookOpen,
  support: Activity,
  code: Code,
  form: FileText,
  discord: UserCircle,
  activity: Activity,
  settings: Settings,
  key: Key,
  shield: Shield,
};

type AdminNavSectionId = "overview" | "people" | "content" | "operations" | "dev" | "system";

type AdminNavItem = {
  to: string;
  label: string;
  icon: keyof typeof Icon;
  exact?: boolean;
  need: string[] | "staff";
  section: AdminNavSectionId;
  shortcut?: string;
};

type QuickAction = {
  label: string;
  description?: string;
  icon: keyof typeof Icon;
  onTrigger: () => void;
  shortcut?: string;
};

const SECTION_COLORS: Record<AdminNavSectionId, { bg: string; text: string; border: string; dot: string }> = {
  overview: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/30", dot: "bg-rose-400" },
  people: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30", dot: "bg-blue-400" },
  content: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30", dot: "bg-purple-400" },
  operations: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-400" },
  dev: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  system: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30", dot: "bg-gray-400" },
};

const NAV_SECTIONS: Array<{ id: AdminNavSectionId; label: string; description?: string }> = [
  { id: "overview", label: "Dashboard", description: "Visão geral" },
  { id: "people", label: "Pessoas", description: "Jogadores e utilizadores" },
  { id: "content", label: "Conteúdo", description: "Media e recursos" },
  { id: "operations", label: "Operações", description: "Monitorização" },
  { id: "dev", label: "Development", description: "Equipa dev" },
  { id: "system", label: "Sistema", description: "Configurações" },
];

const ACL: Record<string, string[] | "staff"> = {
  "/admin": "staff",
  "/admin/players": ["players.manage", "players.view"],
  "/admin/users": ["users.manage"],
  "/admin/candidaturas": ["applications.manage"],
  "/admin/txadmin": ["server.manage"],
  "/admin/logs": ["logs.view"],
  "/admin/imagens": ["content.manage"],
  "/admin/news": ["content.manage"],
  "/admin/player-info": ["content.manage"],
  "/admin/events": ["content.manage"],
  "/admin/resources": ["server.manage"],
  "/admin/devwork": ["dev.work"],
  "/admin/devleaders": ["dev.lead"],
};

function isStaffByPerms(perms?: string[] | null): boolean {
  if (!perms) return false;
  return perms.some(
    (p) =>
      p.startsWith("ftw.") ||
      p.startsWith("group.ftw_") ||
      p === "admin.access" ||
      p.startsWith("admin.") ||
      p.startsWith("support.") ||
      p.startsWith("supervise.") ||
      p.startsWith("management.") ||
      p.includes("staff") ||
      p.includes("admin") ||
      p.includes("management")
  );
}

function isManagement(perms?: string[] | null): boolean {
  if (!perms) return false;
  return perms.some((p) => p.includes("management") || p.includes("owner") || p === "ftw.management.all");
}

function hasAny(perms?: string[] | null, needs?: string[]): boolean {
  if (!perms || !needs) return false;
  return needs.some((need) => {
    // Verificação exata
    if (perms.includes(need)) return true;
    
    // Verificação por prefixo (ex: "players.*" para "players.manage" ou "players.view")
    // Se a necessidade é "players.view", aceita se tiver "players.manage" (geralmente inclui view)
    if (need.includes(".")) {
      const [prefix, action] = need.split(".");
      // Se tem manage, geralmente tem view também
      if (action === "view" && perms.includes(`${prefix}.manage`)) return true;
      // Se tem manage, tem todas as permissões desse módulo
      if (perms.includes(`${prefix}.manage`)) return true;
    }
    
    return false;
  });
}

function getInitials(email: string | null): string {
  if (!email) return "?";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const players = await listOnlinePlayers();
        if (!cancelled) {
          setCount(players.length);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setCount(0);
          setLoading(false);
        }
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { count, loading };
}

function CommandPalette({
  open,
  onClose,
  navigate,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
  pages: AdminNavItem[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      }
      if (e.key === "Enter" && filtered[selected]) {
        navigate(filtered[selected].to);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selected, navigate, onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return pages.filter((p) => p.label.toLowerCase().includes(q) || p.to.toLowerCase().includes(q)).slice(0, 10);
  }, [query, pages]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#0a0a0f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar páginas, jogadores, veículos..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
          <kbd className="rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-white/50">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/50">Nenhum resultado encontrado</div>
          ) : (
            <div className="p-2">
              {filtered.map((page, idx) => {
                const PageIcon = Icon[page.icon];
                return (
                  <button
                    key={page.to}
                    onClick={() => {
                      navigate(page.to);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      selected === idx
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <PageIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{page.label}</div>
                      <div className="text-xs text-white/40 truncate">{page.to}</div>
                    </div>
                    {page.shortcut && (
                      <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
                        {page.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-2 text-xs text-white/40">
          Use ↑↓ para navegar, Enter para selecionar, ESC para fechar
        </div>
      </motion.div>
    </div>
  );
}

function OnlineDrawer({
  open,
  onClose,
  navigateToPlayer,
}: {
  open: boolean;
  onClose: () => void;
  navigateToPlayer: (id: string) => void;
}) {
  const [players, setPlayers] = useState<Array<{ id: string; name: string; citizenid?: string; license?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setLoading(true);
    listOnlinePlayers()
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.citizenid ?? "").toLowerCase().includes(q) ||
        (p.license ?? "").toLowerCase().includes(q)
    );
  }, [players, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0a0a0f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Jogadores Online</div>
            <div className="text-xs text-white/50">{players.length} conectados</div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/15 bg-white/10 p-2 text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por nome, citizenid ou licença"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/50">Nenhum jogador encontrado</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    navigateToPlayer(player.id);
                    onClose();
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="text-sm font-medium text-white">{player.name}</div>
                  <div className="mt-1 flex gap-3 text-xs text-white/50">
                    {player.citizenid && <span>CID: {player.citizenid}</span>}
                    {player.license && <span>License: {player.license}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminLayout() {
  const { ready, perms, loading } = useAdminGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const { count: onlineCount, loading: countLoading } = useOnlineCount();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItems = useMemo<AdminNavItem[]>(() => {
    const base: AdminNavItem[] = [
      { to: "/admin", label: "Dashboard", icon: "dashboard", exact: true, need: "staff", section: "overview" },
      { to: "/admin/players", label: "Jogadores", icon: "users", need: ACL["/admin/players"] as string[], section: "people" },
      { to: "/admin/users", label: "Utilizadores", icon: "account", need: ACL["/admin/users"] as string[], section: "people" },
      { to: "/admin/candidaturas", label: "Candidaturas", icon: "form", need: ACL["/admin/candidaturas"] as string[], section: "people" },
      { to: "/admin/txadmin", label: "txAdmin", icon: "key", need: ACL["/admin/txadmin"] as string[], section: "operations" },
      { to: "/admin/logs", label: "Logs", icon: "activity", need: ACL["/admin/logs"] as string[], section: "operations" },
      { to: "/admin/imagens", label: "Galeria", icon: "image", need: ACL["/admin/imagens"] as string[], section: "content" },
      { to: "/admin/news", label: "Notícias", icon: "news", need: ACL["/admin/news"] as string[], section: "content" },
      { to: "/admin/player-info", label: "Player Info", icon: "article", need: ACL["/admin/player-info"] as string[], section: "content" },
      { to: "/admin/events", label: "Eventos", icon: "calendar", need: ACL["/admin/events"] as string[], section: "content" },
      { to: "/admin/resources", label: "Recursos", icon: "book", need: ACL["/admin/resources"] as string[], section: "content" },
      { to: "/admin/roles", label: "Permissões", icon: "shield", need: "staff", section: "system" },
      { to: "/admin/tickets", label: "Tickets", icon: "ticket", need: "staff", section: "system" },
      { to: "/admin/rules", label: "Regras", icon: "book", need: "staff", section: "system" },
      { to: "/admin/punishments", label: "Punições", icon: "ban", need: "staff", section: "system" },
      { to: "/admin/devwork", label: "Dev Work", icon: "code", need: ACL["/admin/devwork"] as string[], section: "dev" },
      { to: "/admin/devleaders", label: "Dev Leaders", icon: "users", need: ACL["/admin/devleaders"] as string[], section: "dev" },
    ];

    if (isManagement(perms)) return base;
    return base.filter((item) => (item.need === "staff" ? isStaffByPerms(perms) : hasAny(perms, item.need)));
  }, [perms]);

  const groupedNav = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: navItems.filter((item) => item.section === section.id),
    })).filter((section) => section.items.length > 0);
  }, [navItems]);

  const activeNavItem = useMemo(() => {
    return navItems.find((item) => {
      if (item.exact) return location.pathname === item.to;
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    });
  }, [navItems, location.pathname]);

  const activeSection = useMemo(() => {
    if (!activeNavItem) return null;
    return NAV_SECTIONS.find((s) => s.id === activeNavItem.section);
  }, [activeNavItem]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        label: "Pesquisa Rápida",
        description: "Ctrl+K",
        icon: "search",
        onTrigger: () => setPaletteOpen(true),
        shortcut: "Ctrl+K",
      },
      {
        label: "Jogadores Online",
        description: `${onlineCount ?? 0} conectados`,
        icon: "users",
        onTrigger: () => setOnlineOpen(true),
      },
      {
        label: "Gestão de Jogadores",
        description: "Ver todos os jogadores",
        icon: "users",
        onTrigger: () => navigate("/admin/players"),
      },
    ],
    [navigate, onlineCount]
  );

  const onLogout = async () => {
    clearPermissionsCache();
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508] text-white">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-white/70">A validar permissões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] text-white">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-white/10 bg-[#0a0a0f] transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Logo/Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          {sidebarOpen && (
            <div>
              <div className="text-sm font-bold text-white">FTW Admin</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Control Panel</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {groupedNav.map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.id} className="mb-4">
                {sidebarOpen && (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {section.label}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.exact
                        ? location.pathname === item.to
                        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                    const ItemIcon = Icon[item.icon];
                    const colors = SECTION_COLORS[section.id];
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={!!item.exact}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? `${colors.bg} ${colors.text} ${colors.border} border`
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <ItemIcon className="h-4 w-4 flex-shrink-0" />
                        {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                        {sidebarOpen && isActive && (
                          <div className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e53e30] text-xs font-bold text-white">
              {getInitials(email)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium text-white">{email?.split("@")[0] || "Admin"}</div>
                <div className="text-[10px] text-white/40">Administrador</div>
              </div>
            )}
            <button
              onClick={onLogout}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0f] px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">{activeNavItem?.label || "Dashboard"}</h1>
              {activeSection && (
                <div className="text-xs text-white/40">{activeSection.description || activeSection.label}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Ctrl+K</span>
            </button>
            <button
              onClick={() => setOnlineOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              <Users className="h-4 w-4" />
              <span>{countLoading ? "..." : onlineCount ?? 0}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#050508]">
          <div className="mx-auto max-w-[1920px] p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[#0a0a0f] md:hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-bold text-white">Menu</div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              {groupedNav.map((section) => (
                <div key={section.id} className="mb-4">
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {section.label}
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive =
                        item.exact
                          ? location.pathname === item.to
                          : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                      const ItemIcon = Icon[item.icon];
                      const colors = SECTION_COLORS[section.id];
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={!!item.exact}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                            isActive
                              ? `${colors.bg} ${colors.text} ${colors.border} border`
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <ItemIcon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} pages={navItems} />

      {/* Online Drawer */}
      <OnlineDrawer
        open={onlineOpen}
        onClose={() => setOnlineOpen(false)}
        navigateToPlayer={(id) => navigate(`/admin/users/profiles/${encodeURIComponent(id)}`)}
      />
    </div>
  );
}


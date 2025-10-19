import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { listOnlinePlayers, listPlayers } from "@/lib/api/players";
import { listVehiclesGlobal } from "@/lib/api/vehicles";
import { clearPermissionsCache, getUserPermissions } from "@/shared/permissions";

const Icon = {
  menu: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  ticket: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" d="M2 7v2c0 1.1.9 2 2 2s2 .9 2 2-.9 2-2 2-2 .9-2 2v2c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2s-2-.9-2-2 .9-2 2-2 2-.9 2-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
    </svg>
  ),
  ban: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" d="M4.93 4.93l14.14 14.14" />
    </svg>
  ),
  search: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  ),
  dashboard: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12h7V3H3zm11 9h7v-7h-7zm0-9h7V3h-7zM3 21h7v-7H3z" />
    </svg>
  ),
  users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeWidth="2" strokeLinecap="round" d="M16 7a4 4 0 1 1 0 8" />
    </svg>
  ),
  shield: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z" />
      <path strokeWidth="2" strokeLinecap="round" d="M10 13.5 12.2 15.5 16 11" />
    </svg>
  ),
  key: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 7a5 5 0 1 1-9.9 1M10 12l8 8 3-3-8-8" />
      <path strokeWidth="2" strokeLinecap="round" d="M7 14l3 3" />
    </svg>
  ),
  news: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M7 8h7M7 12h10M7 16h5" />
    </svg>
  ),
  book: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 22V7a3 3 0 0 0-3-3" />
    </svg>
  ),
  support: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  ),
  code: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m7 8-4 4 4 4m10-8 4 4-4 4M14 4l-4 16" />
    </svg>
  ),
  form: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M8 8h8M8 12h6M8 16h5" />
    </svg>
  ),
  discord: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 4c-1.3-.6-2.6-.9-4-.9s-2.7.3-4 .9C5.5 4.7 3 7.8 3 11.4c0 2.2 1 4.2 2.5 5.6 1.1 1 2.5 1.7 4 1.9l.5-1.7c-.8-.2-1.5-.6-2.1-1.2.6.3 1.3.5 2 .6.9.2 1.8.3 2.7.3s1.8-.1 2.7-.3c.7-.1 1.4-.3 2-.6-.6.6-1.3 1-2.1 1.2l.5 1.7c1.5-.2 2.9-.9 4-1.9 1.5-1.4 2.5-3.4 2.5-5.6C21 7.8 18.5 4.7 17 4z" />
      <circle cx="9" cy="11" r="1.2" fill="currentColor" />
      <circle cx="15" cy="11" r="1.2" fill="currentColor" />
    </svg>
  ),
  activity: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  ),
  settings: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 5 15a1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 5 9a1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 5c.7-.2 1.2-.8 1.2-1.5V3a2 2 0 0 1 4 0v.2c0 .7.5 1.3 1.2 1.5a1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19 9c.7.2 1.3.8 1.2 1.5V11c0 .7.5 1.3 1.2 1.5z" />
    </svg>
  ),
  account: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <circle cx="12" cy="8" r="4" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
    </svg>
  ),
  chevronLeft: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  ),
  chevronRight: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  ),
  logout: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeWidth="2" d="M15 3h4a2 2 0 0 1 2 2v3" />
      <path strokeWidth="2" d="M10 7 5 12l5 5" />
      <path strokeWidth="2" d="M5 12h13" />
    </svg>
  ),
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white", className)}
      aria-label="Loading"
    />
  );
}

const getInitials = (value?: string | null) =>
  (value?.trim().split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "??").toUpperCase();

type Perms = string[];

const PERMS_CACHE_KEY = "admin:perms_cache_v2";
const PERMS_TTL_MS = 48 * 60 * 60 * 1000;

type PermsCache = { user_id: string; perms: string[]; cached_at: number };

const readPermsCache = (): PermsCache | null => {
  try {
    const raw = localStorage.getItem(PERMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.user_id !== "string" ||
      !Array.isArray(parsed.perms) ||
      typeof parsed.cached_at !== "number"
    ) {
      return null;
    }
    return parsed as PermsCache;
  } catch (error) {
    console.error("Failed to read perms cache", error);
    return null;
  }
};

const writePermsCache = (payload: PermsCache) => {
  try {
    localStorage.setItem(PERMS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to write perms cache", error);
  }
};

const clearPermsCache = () => {
  try {
    localStorage.removeItem(PERMS_CACHE_KEY);
  } catch (error) {
    console.error("Failed to clear perms cache", error);
  }
  clearPermissionsCache();
};

const isStaffByPerms = (perms?: Perms | null) =>
  !!perms?.some(
    (value) =>
      value.startsWith("ftw.") ||
      value.startsWith("group.ftw_") ||
      value === "admin.access" ||
      value.startsWith("admin.") ||
      value.startsWith("support.") ||
      value.startsWith("supervise.") ||
      value.startsWith("management.") ||
      value.startsWith("roles.") ||
      value.startsWith("users.") ||
      value.startsWith("logs.") ||
      value.startsWith("settings.") ||
      value.startsWith("resources.") ||
      value.startsWith("applications.") ||
      value.startsWith("analytics.") ||
      value.startsWith("vehicles.")
  );

const has = (perms: Perms | null | undefined, perm: string) => !!perms?.includes(perm);
const hasAny = (perms: Perms | null | undefined, required: string[]) =>
  !!perms && required.some((perm) => perms.includes(perm));
const isManagement = (perms?: Perms | null) =>
  has(perms, "ftw.management.all") || has(perms, "management.all") || has(perms, "group.ftw_management");

type AdminNavSectionId =
  | "overview"
  | "people"
  | "content"
  | "operations"
  | "dev"
  | "system";

type AdminNavItem = {
  to: string;
  label: string;
  icon: (props: any) => JSX.Element;
  exact?: boolean;
  need: string[] | "staff";
  section: AdminNavSectionId;
};

type QuickAction = {
  label: string;
  description?: string;
  icon: (props: any) => JSX.Element;
  onTrigger: () => void;
};

const NAV_SECTIONS: Array<{ id: AdminNavSectionId; label: string; description?: string }> = [
  { id: "overview", label: "Dashboard", description: "Resumo da operacao" },
  { id: "people", label: "Pessoas", description: "Jogadores e candidaturas" },
  { id: "content", label: "Media", description: "Galeria e recursos partilhados" },
  { id: "operations", label: "Operacoes", description: "Monitorizacao e administracao" },
  { id: "dev", label: "Development", description: "Fluxo de trabalho da equipa" },
  { id: "system", label: "Governanca", description: "Permissoes e configuracoes" },
];

const SECTION_ACCENT: Record<AdminNavSectionId, { pill: string; glow: string; border: string }> = {
  overview: {
    pill: "from-rose-500/80 via-red-500/80 to-orange-400/80",
    glow: "bg-rose-500/15",
    border: "border-rose-400/40",
  },
  people: {
    pill: "from-sky-500/80 via-cyan-500/80 to-emerald-400/80",
    glow: "bg-sky-500/15",
    border: "border-sky-400/40",
  },
  content: {
    pill: "from-indigo-500/80 via-purple-500/80 to-pink-500/80",
    glow: "bg-indigo-500/15",
    border: "border-indigo-400/40",
  },
  operations: {
    pill: "from-amber-500/80 via-yellow-500/80 to-lime-400/80",
    glow: "bg-amber-500/15",
    border: "border-amber-400/40",
  },
  dev: {
    pill: "from-emerald-500/80 via-teal-500/80 to-blue-500/80",
    glow: "bg-emerald-500/15",
    border: "border-emerald-400/40",
  },
  system: {
    pill: "from-gray-500/80 via-gray-400/80 to-gray-300/80",
    glow: "bg-gray-500/15",
    border: "border-gray-400/40",
  },
};

const ACL: Record<string, string[] | "staff"> = {
  "/admin": "staff",
  "/admin/players": ["admin.access", "users.manage"],
  "/admin/candidaturas": ["admin.access", "applications.manage"],
  "/admin/txadmin": ["admin.access", "logs.view", "resources.manage"],
  "/admin/logs": ["admin.access", "logs.view"],
  "/admin/imagens": ["admin.access", "resources.manage"],
  "/admin/resources": ["admin.access", "resources.manage"],
  "/admin/devwork": ["admin.access", "roles.manage", "analytics.view"],
  "/admin/devleaders": ["admin.access", "roles.manage", "analytics.view"],
  "/admin/roles": ["admin.access", "roles.manage"],
  "/admin/tickets": ["admin.access", "tickets.manage"],
  "/admin/rules": ["admin.access", "rules.manage"],
  "/admin/punishments": ["admin.access", "punishments.manage"],
};

const requiredForPath = (pathname: string): string[] | "staff" => {
  const match = Object.keys(ACL)
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ACL[match] : "staff";
};

const canAccess = (perms: Perms | null | undefined, pathname: string): boolean => {
  if (isManagement(perms)) return true;
  const need = requiredForPath(pathname);
  if (need === "staff") return isStaffByPerms(perms);
  return hasAny(perms, need);
};

function useStaffPerms() {
  const [perms, setPerms] = useState<Perms | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Failed to fetch auth user for perms", error);
        }

        if (cancelled) return;

        if (!user) {
          setPerms([]);
          clearPermsCache();
          return;
        }

        const cached = readPermsCache();
        const fresh = cached && cached.user_id === user.id && Date.now() - cached.cached_at < PERMS_TTL_MS;

        if (fresh) {
          setPerms(cached!.perms);
          return;
        }

        clearPermissionsCache(user.id);
        const permissions = await getUserPermissions(user.id);
        if (cancelled) return;
        setPerms(permissions);
        writePermsCache({ user_id: user.id, perms: permissions, cached_at: Date.now() });
      } catch (error) {
        console.error("Unexpected perms error", error);
        setPerms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { perms, loading };
}

function useAdminGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { perms, loading } = useStaffPerms();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const evaluate = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        if (location.pathname !== "/admin/login") navigate("/admin/login", { replace: true });
        setReady(true);
        return;
      }

      if (!loading) {
        if (!canAccess(perms, location.pathname)) navigate("/admin", { replace: true });
        setReady(true);
      }
    };

    evaluate();
    return () => {
      active = false;
    };
  }, [perms, loading, navigate, location.pathname]);

  return { ready, perms, loading };
}
type OnlinePlayer = {
  id: string;
  name: string;
  citizenid: string | null;
  license: string | null;
  job: string | null;
  ping: number | null;
};

function useOnlinePlayers(enabled: boolean) {
  const [rows, setRows] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNow = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listOnlinePlayers();
      setRows(
        result.map((row: any) => ({
          id: String(row.id ?? ""),
          name: row.name ?? "Sem nome",
          citizenid: row.citizenid ?? null,
          license: row.license ?? null,
          job: row.job ?? null,
          ping: row.ping ?? null,
        }))
      );
    } catch (err: any) {
      setError(err?.message ?? "Falha ao carregar jogadores online");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchNow();
    const id = setInterval(() => {
      if (active) fetchNow();
    }, 7000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled]);

  return { rows, loading, error, refresh: fetchNow };
}

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const rows = await listOnlinePlayers();
        if (!active) return;
        setCount(Array.isArray(rows) ? rows.length : null);
      } catch (error) {
        if (!active) return;
        console.error("Failed to fetch online count", error);
        setCount(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { count, loading };
}
type SearchItem =
  | { kind: "page"; label: string; to: string; icon: (props: any) => JSX.Element }
  | { kind: "player"; id: string; label: string }
  | { kind: "vehicle"; id: string; plate: string; model: string; citizenid?: string | null; license?: string | null };

function usePalette(open: boolean, query: string, pages: AdminNavItem[]) {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<SearchItem[]>([]);
  const [vehicles, setVehicles] = useState<SearchItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const value = query.trim();
    if (!value) {
      setPlayers([]);
      setVehicles([]);
      return;
    }

    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const [playerResponse, vehicleResponse] = await Promise.all([
          listPlayers({ q: value, page: 1, limit: 5, sort: "name", dir: "asc" }).catch(() => ({ data: [] })),
          listVehiclesGlobal(value).catch(() => ({ data: [] })),
        ]);
        if (!active) return;

        setPlayers(
          (playerResponse.data ?? []).map((player: any) => ({ kind: "player" as const, id: player.id, label: player.name ?? player.id }))
        );
        setVehicles(
          (vehicleResponse.data ?? []).map((vehicle: any) => ({
            kind: "vehicle" as const,
            id: vehicle.id,
            plate: vehicle.plate ?? "sem-plate",
            model: vehicle.model ?? "Sem modelo",
            citizenid: vehicle.citizenid ?? null,
            license: vehicle.license ?? null,
          }))
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [open, query]);

  const pageItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    const items = pages.map((item) => ({ kind: "page" as const, label: item.label, to: item.to, icon: item.icon }));
    if (!value) return items.slice(0, 6);
    return items.filter((item) => item.label.toLowerCase().includes(value));
  }, [pages, query]);

  return { loading, pageItems, players, vehicles };
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading, pageItems, players, vehicles } = usePalette(open, query, pages);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter") {
        const first = pageItems[0] ?? players[0] ?? vehicles[0];
        if (first) handleSelect(first);
      }
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pageItems, players, vehicles]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    if (item.kind === "page") {
      navigate(item.to);
      return;
    }
    if (item.kind === "player") {
      navigate(`/admin/users/profiles/${encodeURIComponent(item.id)}`);
      return;
    }
    if (item.kind === "vehicle") {
      const ref = item.citizenid || item.license || item.plate;
      navigate(`/admin/users/profiles/${encodeURIComponent(String(ref))}?tab=vehicles`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-24 sm:py-20">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#050509]/95 text-white shadow-[0_35px_80px_rgba(6,6,20,0.55)]">
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
          <Icon.search className="h-4 w-4 text-white/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar paginas, utilizadores ou veiculos"
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
          />
          <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider text-white/50">
            Esc
          </span>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Navegacao</p>
            <div className="space-y-2">
              {pageItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-white/20 hover:bg-white/10"
                >
                  <item.icon className="h-4 w-4 text-white/70" />
                  <span>{item.label}</span>
                </button>
              ))}
              {!pageItems.length && <p className="text-sm text-white/50">Sem resultados.</p>}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Jogadores</p>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelect(player)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-white/20 hover:bg-white/10"
                  >
                    <span className="truncate">{player.label}</span>
                    <span className="text-xs text-white/40">ID: {player.id}</span>
                  </button>
                ))}
                {!players.length && <p className="text-sm text-white/50">Nenhum jogador encontrado.</p>}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Veiculos</p>
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelect(vehicle)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-white/20 hover:bg-white/10"
                  >
                    <span className="truncate">{vehicle.model}</span>
                    <span className="text-xs text-white/40">{vehicle.plate}</span>
                  </button>
                ))}
                {!vehicles.length && <p className="text-sm text-white/50">Nenhum veiculo encontrado.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-5 py-3 text-xs text-white/40">
          <span>{loading ? "A pesquisar..." : "Ctrl + K para abrir rapidamente"}</span>
          <button onClick={onClose} className="rounded-full border border-white/20 px-3 py-1 text-white/60 transition hover:border-white/40 hover:text-white">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
function AvatarMenu({ email, onLogout }: { email: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = getInitials(email);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="h-9 w-9 rounded-full bg-white text-black font-semibold shadow hover:opacity-90"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-3xl border border-white/10 bg-[#08080d] text-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <div className="h-10 w-10 rounded-full bg-white text-black font-semibold grid place-items-center">{initials}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Administrator</p>
              <p className="truncate text-xs text-white/60">{email ?? "Conta sem email"}</p>
            </div>
          </div>
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            onClick={() => alert("Area de conta em desenvolvimento")}
          >
            <Icon.key className="h-4 w-4" /> Minha conta
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            onClick={onLogout}
          >
            <Icon.logout className="h-4 w-4" /> Terminar sessao
          </button>
        </div>
      )}
    </div>
  );
}
function MobileSidebar({
  open,
  onClose,
  groups,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  groups: Array<{ id: AdminNavSectionId; label: string; description?: string; items: AdminNavItem[] }>;
  pathname: string;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#06060a] border-r border-white/10 p-4 md:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Menu</p>
          <button className="rounded-lg border border-white/15 bg-white/10 p-2 text-white/70" onClick={onClose}>
            <Icon.chevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-5">
          {groups.map((section) => {
            const accent = SECTION_ACCENT[section.id];
            return (
              <div key={section.id}>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">{section.label}</p>
                <nav className="mt-2 flex flex-col gap-2">
                  {section.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    const accentStyles = SECTION_ACCENT[item.section];
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={!!item.exact}
                        onClick={onClose}
                        className={cx(
                          "flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
                          isActive
                            ? `border-white/25 bg-gradient-to-r ${accentStyles.pill} text-black`
                            : "border-transparent text-white/80 hover:border-white/20 hover:bg-white/10"
                        )}
                      >
                        <span
                          className={cx(
                            "flex h-9 w-9 items-center justify-center rounded-xl border bg-white/5 text-white",
                            accent.border,
                            isActive ? "bg-white text-black" : ""
                          )}
                        >
                          <ItemIcon className={cx("h-4 w-4", isActive ? "text-black" : "text-white/70")} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.label}</p>
                          <p className="truncate text-xs text-white/45">{sectionLabelMap.get(item.section)}</p>
                        </div>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      </aside>
    </>
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
  const { rows, loading, error, refresh } = useOnlinePlayers(open);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((player) =>
      player.name.toLowerCase().includes(term) ||
      (player.citizenid ?? "").toLowerCase().includes(term) ||
      (player.license ?? "").toLowerCase().includes(term) ||
      player.id.toLowerCase().includes(term)
    );
  }, [rows, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#050509] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Jogadores online</p>
            <p className="text-xs text-white/50">{rows.length} jogadores conectados</p>
          </div>
          <button className="rounded-lg border border-white/15 bg-white/10 p-2 text-white/70" onClick={onClose}>
            <Icon.chevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Icon.search className="h-4 w-4 text-white/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nome, citizenid ou licenca"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
            />
            <button
              onClick={refresh}
              className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/60 hover:text-white"
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-white/60">A carregar lista de jogadores...</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {!loading && !filtered.length && <p className="text-sm text-white/60">Nenhum jogador corresponde ao filtro.</p>}
          <div className="space-y-3">
            {filtered.map((player) => (
              <button
                key={player.id}
                onClick={() => {
                  navigateToPlayer(player.id);
                  onClose();
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{player.name}</p>
                  <span className="text-xs text-white/50">Ping: {player.ping ?? "-"} ms</span>
                </div>
                <p className="mt-1 text-xs text-white/45">CitizenID: {player.citizenid ?? "—"}</p>
                <p className="text-xs text-white/45">Licenca: {player.license ?? "—"}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
export default function AdminLayout() {
  const { ready, perms, loading } = useAdminGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [primaryPermission, setPrimaryPermission] = useState<string | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

useEffect(() => {
  const fetchUserAndPermissions = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[admin-layout] Failed to fetch auth user", error);
      return;
    }

    const user = data.user;
    const userId = user?.id ?? null;

    setEmail(user?.email ?? null);
    console.log("[admin-layout] resolved auth user", { userId, email: user?.email });

    if (!userId) {
      setUserPermissions([]);
      setPrimaryPermission(null);
      return;
    }

    setPermissionsLoading(true);
    try {
      const permissions = await getUserPermissions(userId);
      console.log("[admin-layout] Loaded permissions for user", { userId, permissions });
      setUserPermissions(permissions);
      setPrimaryPermission(permissions[0] ?? null);
    } catch (err) {
      console.error("[admin-layout] Failed to load permissions", err);
      setUserPermissions([]);
      setPrimaryPermission(null);
    } finally {
      setPermissionsLoading(false);
    }
  };

  fetchUserAndPermissions();
}, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { count: onlineCount, loading: countLoading } = useOnlineCount();

  const navItems = useMemo<AdminNavItem[]>(() => {
    const base: AdminNavItem[] = [
      { to: "/admin", label: "Dashboard", icon: Icon.dashboard, exact: true, need: "staff", section: "overview" },
      { to: "/admin/players", label: "Gestao de Jogadores", icon: Icon.users, need: ACL["/admin/players"] as string[], section: "people" },
      { to: "/admin/candidaturas", label: "Candidaturas", icon: Icon.form, need: ACL["/admin/candidaturas"] as string[], section: "people" },
      { to: "/admin/txadmin", label: "txAdmin", icon: Icon.key, need: ACL["/admin/txadmin"] as string[], section: "operations" },
      { to: "/admin/logs", label: "Logs", icon: Icon.activity, need: ACL["/admin/logs"] as string[], section: "operations" },
      { to: "/admin/imagens", label: "Galeria", icon: Icon.news, need: ACL["/admin/imagens"] as string[], section: "content" },
      { to: "/admin/resources", label: "Recursos", icon: Icon.book, need: ACL["/admin/resources"] as string[], section: "content" },
      { to: "/admin/roles", label: "Roles & Permissões", icon: Icon.shield, need: "staff", section: "system" },
      { to: "/admin/tickets", label: "Tickets", icon: Icon.ticket, need: "staff", section: "system" },
      { to: "/admin/rules", label: "Rules", icon: Icon.book, need: "staff", section: "system" },
      { to: "/admin/punishments", label: "Punições", icon: Icon.ban, need: "staff", section: "system" },
      { to: "/admin/devwork", label: "Dev Work", icon: Icon.code, need: ACL["/admin/devwork"] as string[], section: "dev" },
      { to: "/admin/devleaders", label: "Dev Leaders", icon: Icon.users, need: ACL["/admin/devleaders"] as string[], section: "dev" },
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

  const sectionLabelMap = useMemo(() => {
    const map = new Map<AdminNavSectionId, string>();
    NAV_SECTIONS.forEach((section) => map.set(section.id, section.label));
    return map;
  }, []);

  const activeNavItem = useMemo(() => {
    const ordered = [...navItems].sort((a, b) => b.to.length - a.to.length);
    return (
      ordered.find((item) => {
        if (item.exact) return location.pathname === item.to;
        return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
      }) ?? ordered[0] ?? null
    );
  }, [navItems, location.pathname]);

  const activeSectionMeta = useMemo(() => {
    if (!activeNavItem) return null;
    return NAV_SECTIONS.find((section) => section.id === activeNavItem.section) ?? null;
  }, [activeNavItem]);

  const isDashboard = activeNavItem?.to === "/admin";

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const dayFormatter = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" });
    const weekdayFormatter = new Intl.DateTimeFormat("pt-PT", { weekday: "long" });

    return [
      {
        label: "Jogadores online",
        value: countLoading ? "..." : String(onlineCount ?? 0),
        note: "Atualiza a cada 15s",
        icon: Icon.users,
      },
      {
        label: "Secao ativa",
        value: activeNavItem?.label ?? "—",
        note: activeSectionMeta?.label ?? "Navegacao",
        icon: Icon.dashboard,
      },
      {
        label: "Pesquisa global",
        value: "Ctrl + K",
        note: "Abre a command palette",
        icon: Icon.search,
      },
      {
        label: "Hoje",
        value: dayFormatter.format(now),
        note: weekdayFormatter.format(now),
        icon: Icon.activity,
      },
    ];
  }, [countLoading, onlineCount, activeNavItem, activeSectionMeta]);

  const breadcrumb = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path === "/admin" || path === "/admin/") return ["Dashboard"];
    const segments = path.split("/").filter(Boolean).slice(1);
    const map = new Map<string, string>();
    navItems.forEach((item) => {
      const key = item.to.split("/").filter(Boolean).pop();
      if (key) map.set(key, item.label);
    });
    return ["Dashboard", ...segments.map((segment) => map.get(segment) ?? segment)];
  }, [location.pathname, navItems]);

  const activeAccent = useMemo(() => {
    const sectionId = activeSectionMeta?.id ?? "overview";
    return SECTION_ACCENT[sectionId as AdminNavSectionId];
  }, [activeSectionMeta]);

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      label: "Abrir pesquisa",
      description: "Ctrl + K",
      icon: Icon.search,
      onTrigger: () => setPaletteOpen(true),
    },
    {
      label: "Gestao de jogadores",
      description: "Aceder rapidamente a /admin/players",
      icon: Icon.users,
      onTrigger: () => navigate("/admin/players"),
    },
    {
      label: "Abrir Dev Work",
      description: "Ver tarefas da equipa",
      icon: Icon.code,
      onTrigger: () => navigate("/admin/devwork"),
    },
  ], [navigate]);
  const onLogout = async () => {
    clearPermsCache();
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (!ready || loading) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#040406] text-white">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Spinner /> A validar permissoes...
      </div>
    </div>
  );
}

return (
  <div className="relative min-h-screen bg-[#040406] text-white">
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(234,44,97,0.18),rgba(27,22,60,0.35),transparent_75%)]" />
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-black/95 via-black/75 to-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/70 transition hover:text-white md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Icon.menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-sm font-semibold tracking-[0.3em]">
              FTW
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide">Control Center</p>
              <p className="text-xs text-white/50">For The Win Admin</p>
            </div>
          </div>
        </div>
        {activeSectionMeta && (
          <span
            className={cx(
              "hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-white/80 sm:inline-flex",
              activeAccent.border,
              activeAccent.glow
            )}
          >
            {activeSectionMeta.label}
          </span>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:text-white md:flex"
          >
            <Icon.search className="h-4 w-4" />
            <span>Ctrl + K</span>
          </button>
          <button
            onClick={() => setOnlineOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-400/20 sm:flex"
          >
            <Icon.users className="h-4 w-4" />
            <span>{countLoading ? "..." : `${onlineCount ?? 0}`} online</span>
          </button>
          <AvatarMenu email={email} onLogout={onLogout} />
        </div>
      </div>
    </header>

    <div className="flex">
      <aside
        className={cx(
          "hidden md:flex flex-col border-r border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent backdrop-blur-xl px-4 py-5 transition-all duration-300",
          collapsed ? "w-24 items-center" : "w-80"
        )}
      >
        <div className={cx("flex items-center justify-between", collapsed ? "w-full" : "")}> 
          {!collapsed && (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.35em] text-white/40">Navigation</span>
              <span className="text-sm font-semibold text-white/80">For The Win Layers</span>
            </div>
          )}
          <button
            className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/70 transition hover:text-white"
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Alternar navegacao"
          >
            {collapsed ? <Icon.chevronRight className="h-4 w-4" /> : <Icon.chevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          {groupedNav.map((section) => {
            const accent = SECTION_ACCENT[section.id];
            return (
              <div key={section.id} className="mb-6">
                {!collapsed && (
                  <div
                    className={cx(
                      "mb-3 flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70",
                      accent.border,
                      accent.glow
                    )}
                  >
                    <span>{section.label}</span>
                    <span className="text-white/40">{section.items.length}</span>
                  </div>
                )}
                <nav className={cx("flex flex-col gap-2", collapsed && "items-center")}>
                  {section.items.map((item) => {
                    const isActive = item.exact
                      ? location.pathname === item.to
                      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                    const accentStyles = SECTION_ACCENT[item.section];
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={!!item.exact}
                        title={item.label}
                        className={cx(
                          "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
                          collapsed ? "justify-center" : "pl-3 pr-4",
                          isActive
                            ? `border-white/30 bg-gradient-to-r ${accentStyles.pill} text-black shadow-[0_18px_40px_rgba(18,18,40,0.45)]`
                            : "border-transparent text-white/70 hover:border-white/15 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span
                          className={cx(
                            "flex h-9 w-9 items-center justify-center rounded-xl border bg-white/5 text-white",
                            accentStyles.border,
                            isActive ? "bg-white text-black" : ""
                          )}
                        >
                          <ItemIcon className={cx("h-4 w-4", isActive ? "text-black" : "text-white/70")} />
                        </span>
                        {!collapsed && (
                          <div className="flex min-w-0 flex-col text-left">
                            <span className="text-sm font-semibold">{item.label}</span>
                            <span className="text-xs text-white/45">{sectionLabelMap.get(item.section)}</span>
                          </div>
                        )}
                        {!collapsed && isActive && (
                          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-black/70">
                            Live
                            <span className="h-2 w-2 rounded-full bg-black/60" />
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      </aside>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} groups={groupedNav} pathname={location.pathname} />

      <main className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(255,86,146,0.25),transparent_65%)] blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-[200px] flex-col gap-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/40">
                {breadcrumb.map((crumb, index) => (
                  <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                    {index > 0 && <span className="opacity-40">/</span>}
                    <span className={cx(index === breadcrumb.length - 1 && "text-white/80")}>{crumb}</span>
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                {activeNavItem?.label ?? "Painel"}
              </h1>
              {activeSectionMeta?.description && (
                <p className="max-w-xl text-sm text-white/55">{activeSectionMeta.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                <Icon.search className="h-4 w-4" />
                <span>Pesquisar</span>
              </button>
              <button
                onClick={() => setOnlineOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
                title="Ver jogadores online"
              >
                <Icon.users className="h-4 w-4" />
                <span>{countLoading ? "..." : `${onlineCount ?? 0}`} online</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-[0_18px_45px_rgba(6,5,20,0.55)] backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/45">{stat.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-1 text-xs text-white/50">{stat.note}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 text-white">
                      <StatIcon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onTrigger}
                  className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left shadow-[0_12px_30px_rgba(6,5,20,0.35)] transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{action.label}</p>
                    {action.description && <p className="text-xs text-white/55">{action.description}</p>}
                  </div>
                  <span className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition group-hover:bg-white/20">
                    <ActionIcon className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.02] shadow-[0_20px_60px_rgba(10,8,25,0.45)] backdrop-blur">
            <div className="rounded-[28px] border border-white/[0.08] bg-black/30 p-4 sm:p-6">
              <Outlet />
            </div>
          </div>

          <footer className="pb-6 text-xs text-white/45">
            (c) {new Date().getFullYear()} FTW Roleplay - Painel administrativo
          </footer>
        </div>
      </main>
    </div>

    <OnlineDrawer open={onlineOpen} onClose={() => setOnlineOpen(false)} navigateToPlayer={(id) => navigate(`/admin/users/profiles/${encodeURIComponent(id)}`)} />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} pages={navItems} />
  </div>
);
}

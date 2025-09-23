// src/admin/AdminLayout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { listOnlinePlayers, listPlayers } from "@/lib/api/players";
import { listVehiclesGlobal } from "@/lib/api/vehicles";

/* ---------------- Icons (inline) ---------------- */
const Icon = {
  Menu: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>),
  Search: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round"/></svg>),
  Home: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3H8v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>),
  Users: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4" strokeWidth="2"/><path strokeWidth="2" strokeLinecap="round" d="M20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 21v-2a4.6 4.6 0 0 0-3-4.3"/></svg>),
  Server: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><rect x="3" y="3" width="18" height="8" rx="2" strokeWidth="2"/><rect x="3" y="13" width="18" height="8" rx="2" strokeWidth="2"/><path d="M7 8h.01M7 18h.01" strokeWidth="2" strokeLinecap="round"/></svg>),
  Clipboard: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><rect x="7" y="3" width="10" height="4" rx="1" strokeWidth="2"/><rect x="4" y="7" width="16" height="14" rx="2" strokeWidth="2"/></svg>),
  Image: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/><path d="m21 15-5-5L5 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Logs: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" d="M3 5h18M3 12h18M3 19h18"/><path strokeWidth="2" d="M8 5v14"/></svg>),
  ChevronLeft: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6"/></svg>),
  ChevronRight: (p: any) => (<svg viewBox="0 0 24 24  fill="none" stroke="currentColor" {...p}><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/></svg>),
  Logout: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path strokeWidth="2" d="M15 3h4a2 2 0 0 1 2 2v3"/><path strokeWidth="2" d="M10 7 5 12l5 5"/><path strokeWidth="2" d="M5 12h13"/></svg>),
  External: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}><path d="M14 3h7v7" strokeWidth="2"/><path d="M10 14 21 3" strokeWidth="2"/><path d="M5 7v11a2 2 0 0 0 2 2h11" strokeWidth="2"/></svg>),
};

/* ---------------- Utils ---------------- */
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
function Spinner({ className = "" }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white", className)} aria-label="a carregar" />;
}
const getInitials = (s?: string | null) =>
  (s?.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,2).map(x=>x[0]).join("") || "??").toUpperCase();

/* ---------------- Permissões (staff) ---------------- */
type Perms = string[];
const PERMS_CACHE_KEY = "admin:perms_cache_v1";
const PERMS_TTL_MS = 48 * 60 * 60 * 1000; // 48h

type PermsCache = { user_id: string; perms: string[]; cached_at: number };
const readPermsCache = (): PermsCache | null => {
  try { return JSON.parse(localStorage.getItem(PERMS_CACHE_KEY) || "null"); } catch { return null; }
};
const writePermsCache = (v: PermsCache) => { try { localStorage.setItem(PERMS_CACHE_KEY, JSON.stringify(v)); } catch {} };
const clearPermsCache = () => { try { localStorage.removeItem(PERMS_CACHE_KEY); } catch {} };

const isStaffByPerms = (perms?: Perms | null) =>
  !!perms?.some(p => p.startsWith("ftw.") || p.startsWith("group.ftw_"));

const has = (perms: Perms | null | undefined, p: string) => !!perms?.includes(p);
const hasAny = (perms: Perms | null | undefined, req: string[]) =>
  !!perms && req.some(r => perms.includes(r));
const isGestao = (perms?: Perms | null) => has(perms, "ftw.management.all");

/** ACL por rota (prefix match) */
const ACL: Record<string, string[] | "staff"> = {
  "/admin": "staff",
  "/admin/devleaders": "staff",
  "/admin/devwork": ["group.ftw_dev","ftw.dev.head","ftw.management.all"],
  "/admin/players": ["ftw.supervise.basic","ftw.supervise.advanced","ftw.admin.basic","ftw.admin.senior","ftw.admin.head","ftw.management.all"],
  "/admin/txadmin": ["ftw.admin.senior","ftw.admin.head","ftw.management.all"],
  "/admin/candidaturas": ["ftw.support.read","ftw.support.manage","ftw.admin.basic","ftw.management.all"],
  "/admin/logs": ["ftw.admin.basic","ftw.admin.senior","ftw.admin.head","ftw.management.all"],
  "/admin/imagens": ["ftw.dev","group.ftw_dev","ftw.management.all"],
  "/admin/resources": ["ftw.dev","group.ftw_dev","ftw.management.all"],
};

function requiredForPath(pathname: string): string[] | "staff" {
  const key = Object.keys(ACL)
    .filter(k => pathname === k || pathname.startsWith(k + "/"))
    .sort((a,b) => b.length - a.length)[0];
  return key ? ACL[key] : "staff";
}

function canAccess(perms: Perms | null | undefined, pathname: string): boolean {
  if (isGestao(perms)) return true;
  const need = requiredForPath(pathname);
  if (need === "staff") return isStaffByPerms(perms);
  return hasAny(perms, need);
}

/* --- Hook: obter perms (uma validação por carga + cache 48h) --- */
function useStaffPerms() {
  const [perms, setPerms] = useState<Perms | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          setPerms(null);
          clearPermsCache();
          return;
        }

        // tenta cache 48h
        const cached = readPermsCache();
        const fresh = cached && cached.user_id === user.id && (Date.now() - cached.cached_at) < PERMS_TTL_MS;

        if (fresh) {
          setPerms(cached!.perms as string[]);
          return;
        }

        // fetch uma vez
        const { data, error } = await supabase
          .from("staff_perms")
          .select("perms")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const prms = (error ? [] : (data?.perms as string[]) ?? []);
        setPerms(prms);
        writePermsCache({ user_id: user.id, perms: prms, cached_at: Date.now() });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // NÃO nos inscrevemos em onAuthStateChange (evita refresh ao focar a aba).
    // Só limpamos cache no logout explícito (botão) ou se o utilizador mudar.
    return () => { cancelled = true; };
  }, []);

  return { perms, loading };
}

/* ---------------- Guard ---------------- */
function useAdminGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { perms, loading } = useStaffPerms();
  const [ready, setReady] = useState(false);
  const sessionChecked = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      // valida sessão só uma vez por montagem
      if (!sessionChecked.current) {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          if (location.pathname !== "/admin/login") navigate("/admin/login", { replace: true });
          setReady(true);
          sessionChecked.current = true;
          return;
        }
        sessionChecked.current = true;
      }

      if (loading) return;

      const go = (to: string) => { if (location.pathname !== to) navigate(to, { replace: true }); };

      if (!isStaffByPerms(perms)) {
        go("/auth");
      } else if (!canAccess(perms, location.pathname)) {
        go("/admin");
      }

      if (alive) setReady(true);
    })();

    return () => { alive = false; };
  }, [loading, perms, location.pathname, navigate]);

  return { ready, perms, loading };
}

/* ---------------- Online: contador + drawer ---------------- */
type PlayerMini = { id: string; name: string; citizenid?: string | null; license?: string | null };

function useOnlinePlayers(enabled: boolean) {
  const [rows, setRows] = useState<PlayerMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fetchNow = async () => {
    try { setLoading(true); setErro(null); setRows(await listOnlinePlayers()); }
    catch (e:any) { setErro(e?.message ?? "Falha a carregar players online"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!enabled) return;
    fetchNow();
    const id = setInterval(fetchNow, 5000);
    return () => clearInterval(id);
  }, [enabled]);
  return { rows, loading, erro, refresh: fetchNow };
}
function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const d = await listOnlinePlayers(); if (alive) setCount(d.length); }
      catch { if (alive) setCount(null); }
      finally { if (alive) setLoading(false); }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { count, loading };
}

/* ---------------- Avatar + dropdown ---------------- */
function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ref, onOutside]);
}
function AvatarMenu({ email, onLogout }: { email: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const initials = getInitials(email);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 rounded-full bg-white text-black font-semibold grid place-items-center hover:opacity-90"
        title={email ?? "Conta"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      <div className={cx(
        "absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0b0b0c] text-white shadow-xl overflow-hidden transition-all",
        open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
      )} role="menu">
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white text-black font-semibold grid place-items-center">{initials}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Admin</div>
              <div className="text-xs text-white/60 truncate">{email ?? "—"}</div>
            </div>
          </div>
        </div>
        <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2" onClick={() => alert("Minha conta (breve)")}>
          <Icon.External className="h-4 w-4" /> Minha conta
        </button>
        <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2" onClick={onLogout}>
          <Icon.Logout className="h-4 w-4" /> Terminar sessão
        </button>
      </div>
    </div>
  );
}

/* ---------------- Command Palette (⌘K) ---------------- */
type SearchItem =
  | { kind: "page"; label: string; to: string; icon: keyof typeof Icon }
  | { kind: "player"; id: string; label: string }
  | { kind: "vehicle"; id: string; plate: string; model: string; citizenid?: string|null; license?: string|null };

const STATIC_PAGES: SearchItem[] = [
  { kind: "page", label: "Dashboard", to: "/admin", icon: "Home" },
  { kind: "page", label: "Players", to: "/admin/players", icon: "Users" },
  { kind: "page", label: "txAdmin", to: "/admin/txadmin", icon: "Server" },
  { kind: "page", label: "Candidaturas", to: "/admin/candidaturas", icon: "Clipboard" },
  { kind: "page", label: "Logs", to: "/admin/logs", icon: "Logs" },
  { kind: "page", label: "Imagens", to: "/admin/imagens", icon: "Image" },
];

function usePalette(open: boolean, query: string) {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<SearchItem[]>([]);
  const [vehicles, setVehicles] = useState<SearchItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) { setPlayers([]); setVehicles([]); return; }

    let aborted = false;
    const doSearch = async () => {
      try {
        setLoading(true);
        const [p, v] = await Promise.all([
          listPlayers({ q, page: 1, limit: 5, sort: "name", dir: "asc" }).catch(() => ({ data: [] })),
          listVehiclesGlobal(q).catch(() => ({ data: [] })),
        ]);
        if (aborted) return;
        setPlayers((p.data ?? []).map((r: any) => ({ kind: "player", id: r.id, label: r.name })));
        setVehicles((v.data ?? []).map((r: any) => ({ kind: "vehicle", id: r.id, plate: r.plate, model: r.model, citizenid: r.citizenid, license: r.license })));
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    doSearch();
    return () => { aborted = true; };
  }, [open, query]);

  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_PAGES.slice(0, 5);
    return STATIC_PAGES.filter(p => p.label.toLowerCase().includes(q));
  }, [query]);

  return { loading, pageHits, players, vehicles };
}

function CommandPalette({
  open, onClose, navigate,
}: { open: boolean; onClose: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading, pageHits, players, vehicles } = usePalette(open, q);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    } else {
      setQ("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function go(item: SearchItem) {
    if (item.kind === "page") {
      navigate(item.to);
    } else if (item.kind === "player") {
      navigate(`/admin/players/${encodeURIComponent(item.id)}`);
    } else if (item.kind === "vehicle") {
      const ref = item.citizenid || item.license || item.plate;
      navigate(`/admin/players/${encodeURIComponent(String(ref))}?tab=garage`);
    }
    onClose();
  }

  return (
    <>
      <div className={cx("fixed inset-0 z-50 bg-black/40 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")} onClick={onClose} />
      <div className={cx("fixed left-1/2 top-16 z-50 w-[min(92vw,720px)] -translate-x-1/2 transition-all",
                         open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2")}>
        <div className="rounded-2xl border border-white/10 bg-[#0b0b0c] shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Icon.Search className="h-4 w-4 text-white/60" />
            <input ref={inputRef} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Pesquisa global…"
                   className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50 py-2" />
            <span className="text-[10px] text-white/40 hidden sm:inline">Esc para fechar</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5">
              <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">Páginas</div>
              <ul className="p-1">
                {pageHits.map((p) => {
                  const I = Icon[p.icon];
                  return (
                    <li key={p.to}>
                      <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2"
                              onClick={()=>go(p)}>
                        <I className="h-4 w-4" /> {p.label}
                      </button>
                    </li>
                  );
                })}
                {pageHits.length === 0 && <div className="px-3 py-2 text-xs text-white/50">{loading ? "A carregar…" : "Sem resultados"}</div>}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5">
              <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">Players</div>
              <ul className="p-1">
                {players.map((p) => (
                  <li key={`pl-${p.id}`}>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2"
                            onClick={()=>go(p)}>
                      <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px]">{getInitials(p.label)}</div>
                      <span className="truncate">{p.label}</span>
                    </button>
                  </li>
                ))}
                {players.length === 0 && <div className="px-3 py-2 text-xs text-white/50">{loading ? "A carregar…" : "Escreve para procurar"}</div>}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5">
              <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">Carros</div>
              <ul className="p-1">
                {vehicles.map((v) => (
                  <li key={`vh-${v.id}`}>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10"
                            onClick={()=>go(v)}>
                      <div className="text-sm font-medium truncate">{v.model || "(modelo desconhecido)"}</div>
                      <div className="text-xs text-white/60 truncate">Matrícula: {v.plate} {v.citizenid ? `· cid: ${v.citizenid}` : ""}</div>
                    </button>
                  </li>
                ))}
                {vehicles.length === 0 && <div className="px-3 py-2 text-xs text-white/50">{loading ? "A carregar…" : "Escreve para procurar"}</div>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Layout ---------------- */
export default function AdminLayout() {
  const { ready, perms, loading } = useAdminGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // online
  const [onlineOpen, setOnlineOpen] = useState(false);
  const { count: onlineCount, loading: countLoading } = useOnlineCount();

  // command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);
  const onLogout = async () => {
    clearPermsCache();               // limpa cache no logout
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  // Navegação com ACL por item
  const nav = useMemo(() => {
    const all = [
      { to: "/admin", label: "Dashboard", icon: Icon.Home, exact: true, need: "staff" as const },
      { to: "/admin/players", label: "Players", icon: Icon.Users, need: ACL["/admin/players"] as string[] },
      { to: "/admin/txadmin", label: "txAdmin", icon: Icon.Server, need: ACL["/admin/txadmin"] as string[] },
      { to: "/admin/candidaturas", label: "Candidaturas", icon: Icon.Clipboard, need: ACL["/admin/candidaturas"] as string[] },
      { to: "/admin/logs", label: "Logs", icon: Icon.Logs, need: ACL["/admin/logs"] as string[] },
      { to: "/admin/imagens", label: "Imagens", icon: Icon.Image, need: ACL["/admin/imagens"] as string[] },
      { to: "/admin/resources", label: "Recursos", icon: Icon.Image, need: ACL["/admin/resources"] as string[] },
      { to: "/admin/devleaders", label: "Dev Leaders", icon: Icon.Image, need: ACL["/admin/devleaders"] as string[] },
      { to: "/admin/devwork", label: "Dev Work", icon: Icon.Clipboard, need: ACL["/admin/devwork"] as string[] },
    ];
    if (isGestao(perms)) return all;
    return all.filter(i => (i.need === "staff" ? isStaffByPerms(perms) : hasAny(perms, i.need)));
  }, [perms]);

  const breadcrumb = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path === "/admin" || path === "/admin/") return ["Dashboard"];
    const segs = path.split("/").filter(Boolean).slice(1);
    const map: Record<string, string> = Object.fromEntries(nav.map((i) => [i.to.split("/").pop()!, i.label]));
    return ["Dashboard", ...segs.map((s) => map[s] ?? s)];
  }, [location.pathname, nav]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0b0b0c] text-white">
        <div className="flex items-center gap-2 text-sm text-white/70"><Spinner /> A validar permissões…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      {/* Topbar */}
      <header className="h-14 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] backdrop-blur flex items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-3">
          <button className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/15" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Icon.Menu className="h-5 w-5" />
          </button>
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 rounded-xl bg-white/10 p-1" onError={(e)=>((e.currentTarget as HTMLImageElement).style.display="none")} />
          <h1 className="text-sm md:text-base font-semibold">Painel de Administração</h1>
        </div>

        {/* Pesquisa global (abre palette) */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-3">
          <button onClick={()=>setPaletteOpen(true)} className="group relative w-full text-left">
            <div className="relative w-full">
              <Icon.Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <div className="w-full rounded-lg border border-white/10 bg-black/30 text-white pl-8 pr-3 py-1.5 group-hover:bg-black/40 transition">
                <span className="text-white/50">Pesquisa global…</span>
                <span className="float-right text-[10px] text-white/40">⌘K</span>
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setOnlineOpen(true)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15" title="Ver players online">
            {countLoading ? <span className="inline-flex items-center gap-2"><Spinner /> Players</span> : <>Players: {onlineCount ?? "—"}</>}
          </button>
          <AvatarMenu email={email} onLogout={onLogout} />
        </div>
      </header>

      {/* Body */}
      <div className="flex">
        {/* Sidebar desktop */}
        <aside className={cx("hidden md:flex flex-col gap-2 border-r border-white/10 bg-white/[0.04] backdrop-blur p-3 transition-all duration-300", collapsed ? "w-16" : "w-64")}>
          <button className="self-end text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10" onClick={() => setCollapsed((v) => !v)} aria-label="Alternar sidebar" title={collapsed ? "Expandir" : "Colapsar"}>
            {collapsed ? <Icon.ChevronRight className="h-4 w-4" /> : <Icon.ChevronLeft className="h-4 w-4" />}
          </button>
          {!collapsed && <div className="text-xs text-white/50 px-1">Menu</div>}
          <nav className="mt-1 flex flex-col gap-1">
            {nav.map((l) => {
              const isActive = l.exact ? location.pathname === "/admin" : location.pathname.startsWith(l.to);
              const I = l.icon;
              return (
                <NavLink key={l.to} to={l.to} end={!!l.exact} title={l.label}
                  className={cx("px-3 py-2 rounded-xl text-sm flex items-center gap-3 transition",
                                isActive ? "bg-white text-black shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10")}>
                  <I className={cx("h-4 w-4", isActive && "text-black")} />
                  {!collapsed && <span className="truncate">{l.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar mobile */}
        <MobileSidebar open={mobileOpen} onClose={()=>setMobileOpen(false)} nav={nav} pathname={location.pathname} />

        {/* Conteúdo */}
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs text-white/60">
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="opacity-50">/</span>}
                <span className={cx(i === breadcrumb.length - 1 && "text-white")}>{b}</span>
              </span>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3 md:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Outlet />
          </div>

          <footer className="pt-4 text-[11px] text-white/40">© {new Date().getFullYear()} Admin. Feito com ❤️.</footer>
        </main>
      </div>

      {/* Overlays */}
      <OnlineDrawer open={onlineOpen} onClose={() => setOnlineOpen(false)} navigateToPlayer={(id) => navigate(`/admin/players/${encodeURIComponent(id)}`)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} />
    </div>
  );
}

/* Sidebar mobile isolada para reuso */
function MobileSidebar({ open, onClose, nav, pathname }:{
  open:boolean; onClose:()=>void; nav: Array<{to:string; label:string; icon:any; exact?:boolean}>; pathname:string;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#0b0b0c] border-r border-white/10 p-3 md:hidden">
        <div className="flex items-center justify-between h-12">
          <div className="font-semibold">Menu</div>
          <button className="p-2 rounded-lg bg-white/10 hover:bg-white/15" onClick={onClose}>
            <Icon.ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <nav className="mt-2 flex flex-col gap-1">
          {nav.map((l) => {
            const isActive = l.exact ? pathname === "/admin" : pathname.startsWith(l.to);
            const I = l.icon;
            return (
              <NavLink key={l.to} to={l.to} end={!!l.exact} onClick={onClose}
                className={cx("px-3 py-2 rounded-xl text-sm flex items-center gap-3 transition",
                              isActive ? "bg-white text-black shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10")}>
                <I className={cx("h-4 w-4", isActive && "text-black")} />
                <span className="truncate">{l.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

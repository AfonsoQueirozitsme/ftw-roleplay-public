// src/components/dashboard/Navbar.tsx
import React, { useEffect, useRef, useState } from "react";
import { ShoppingBag, LogIn, User, LayoutDashboard, LogOut, Shield, ChevronDown } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const LOGO_URL =
  "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/logo_roleplay_nobg.png";

const ring =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const linkBase = "text-sm transition relative";
const linkIdle = "text-[#6c6c6c] hover:text-[#fbfbfb]";
const linkActive = "text-[#fbfbfb] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-[#e53e30]";

// helper: decidir se há tag de staff
function computeIsStaff(perms?: string[] | null) {
  if (!perms || perms.length === 0) return false;
  return perms.some((p) => p.startsWith("ftw.") || p.startsWith("group.ftw_"));
}

const DashboardNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // dropdown state
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // sessão
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(!!data.user);
    });
    return () => { mounted = false; };
  }, []);

  // fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // verificar permissões quando abre o menu
  async function refreshPermsOnOpen() {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsStaff(false); return; }

      // tentar obter discord_id da sessão (se existir)
      const identities: any[] = (user as any)?.identities || [];
      const disc = identities.find((i) => i.provider === "discord");
      const meta: any = (user as any)?.user_metadata || {};
      const discord_id =
        disc?.identity_data?.sub || disc?.id || meta?.provider_id || meta?.sub || null;

      // opcional: sincroniza com Discord (se a function existir)
      try {
        if (discord_id) {
          await supabase.functions.invoke("discord-sync", {
            body: { user_id: user.id, discord_id },
          });
        }
      } catch {
        // se a função não existir/config não faz mal; seguimos
      }

      // ler staff_perms e decidir visibilidade do botão Admin
      const { data, error } = await supabase
        .from("staff_perms")
        .select("perms")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Falha a ler staff_perms:", error);
        setIsStaff(false);
      } else {
        setIsStaff(computeIsStaff((data?.perms as string[]) ?? []));
      }
    } finally {
      setChecking(false);
    }
  }

  function toggleMenu() {
    const next = !open;
    setOpen(next);
    if (next) void refreshPermsOnOpen();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <header
      className="h-16 w-full bg-[#151515] text-[#fbfbfb] border-b border-[#6c6c6c]"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      <div className="mx-auto h-full px-6 grid grid-cols-3 items-center">
        {/* Esquerda: Logo */}
        <div className="flex items-center gap-3">
          <NavLink to="/dashboard" className="inline-flex items-center">
            <img
              src={LOGO_URL}
              alt="FTW Roleplay"
              className="w-10 h-10 object-contain select-none"
              draggable={false}
            />
          </NavLink>
        </div>

        {/* Centro: Links do dashboard (mantidos) */}
        <nav className="flex justify-center">
          <ul className="flex items-center gap-7">
            <li>
              <NavLink
                to="/dashboard/reports"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                Reports
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/early-access"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                Early Access
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/characters"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                Personagens
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/rules"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                Regras & Info
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Direita: Loja + Auth */}
        <div className="flex items-center justify-end gap-4">
          <NavLink
            to="/shop"
            title="Loja"
            className={`text-[#6c6c6c] hover:text-[#fbfbfb] transition inline-flex ${ring}`}
          >
            <ShoppingBag className="w-5 h-5" />
          </NavLink>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleMenu}
                className={`inline-flex items-center gap-2 text-[#fbfbfb] hover:opacity-90 transition ${ring}`}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <User className="w-5 h-5" />
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 border border-[#6c6c6c] bg-[#151515] shadow-xl overflow-hidden z-50"
                >
                  <NavLink
                    role="menuitem"
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </NavLink>

                  {/* Linha de estado enquanto verifica */}
                  {checking && (
                    <div className="flex items-center gap-3 px-4 py-3 text-[#fbfbfb]/80">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
                      </svg>
                      <span>A verificar permissões…</span>
                    </div>
                  )}

                  {/* EXACTAMENTE aqui: por baixo do "Dashboard" */}
                  {!checking && isStaff && (
                    <NavLink
                      role="menuitem"
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    >
                      <Shield className="w-4 h-4 text-[#e53e30]" />
                      <span>Admin Menu</span>
                    </NavLink>
                  )}

                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/auth"
              className={`inline-flex items-center gap-2 font-semibold text-[#e53e30] hover:opacity-90 ${ring}`}
            >
              <LogIn className="w-5 h-5" />
              <span>Entrar</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;

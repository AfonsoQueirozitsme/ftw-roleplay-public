import React, { useEffect, useRef, useState } from "react";
import { ShoppingBag, LogIn, User, LayoutDashboard, LogOut, Shield, ChevronDown } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const LOGO_URL =
  "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/logo_roleplay_nobg.png";

const ring =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const linkBase =
  "text-sm transition relative";
const linkIdle = "text-[#6c6c6c] hover:text-[#fbfbfb]";
const linkActive = "text-[#fbfbfb] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-[#e53e30]";

const DashboardNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const user = data.user;
      setIsAuthenticated(!!user);
      // adapta à tua flag de admin no user_metadata
      setIsAdmin(Boolean(user?.user_metadata?.is_admin));
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {/* Centro: Links do dashboard */}
        <nav className="flex justify-center">
          <ul className="flex items-center gap-7">
            <li>
              <NavLink
                to="/dashboard/reports"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkIdle}`
                }
              >
                Reports
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/early-access"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkIdle}`
                }
              >
                Early Access
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/rules"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkIdle}`
                }
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
                onClick={() => setOpen((v) => !v)}
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
                  className="absolute right-0 mt-2 w-56 border border-[#6c6c6c] bg-[#151515]"
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

                  {isAdmin && (
                    <NavLink
                      role="menuitem"
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
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

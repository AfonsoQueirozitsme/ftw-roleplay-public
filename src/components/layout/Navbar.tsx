// src/components/Navbar.tsx (ou onde o tens)
import React, { useEffect, useRef, useState } from "react";
import { ShoppingBag, LogIn, User, LayoutDashboard, LogOut, Shield, ChevronDown } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

// Carrega Montserrat + Goldman
function useLoadFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Goldman:wght@400;700&family=Montserrat:wght@300;400;600;700;800;900&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
}

// Props para controlar auth e ações
type NavbarProps = {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onDashboardClick?: () => void;
  onAdminClick?: () => void;
};

const LOGO_URL =
  "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/logoftw-white.png";

const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated = false,
  isAdmin = false,
  onLoginClick,
  onLogoutClick,
  onDashboardClick,
  onAdminClick,
}) => {
  useLoadFonts();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // helper para navegar + callback opcional + fechar menu
  const go = (path: string, cb?: () => void) => {
    cb?.();
    navigate(path);
    setOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `hover:text-[#fbfbfb] transition ${isActive ? "text-[#fbfbfb]" : "text-[#6c6c6c]"}`;

  return (
    <header
      className="h-16 w-full bg-[#151515] text-[#fbfbfb] border-b border-[#6c6c6c]"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      <div className="mx-auto h-full px-6 grid grid-cols-3 items-center">
        {/* Esquerda: Logo (vai para Home) */}
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Ir para início">
            <img
              src={LOGO_URL}
              alt="FTW Roleplay"
              className="w-10 h-10 object-contain select-none"
              draggable={false}
            />
          </Link>
        </div>

        {/* Centro: Navegação */}
        <nav className="flex justify-center">
          <ul className="flex items-center gap-7 text-sm">
            <li>
              <NavLink to="/" className={navLinkClass} end>
                INÍCIO
              </NavLink>
            </li>
            <li>
              <NavLink to="/shop" className={navLinkClass}>
                SHOP
              </NavLink>
            </li>
            <li>
              <NavLink to="/rules" className={navLinkClass}>
                REGRAS
              </NavLink>
            </li>
            <li>
              <NavLink to="/events" className={navLinkClass}>
                EVENTOS
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={navLinkClass}>
                SOBRE
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Direita: Loja + Auth */}
        <div className="flex items-center justify-end gap-4">
          <button
            title="Loja"
            onClick={() => navigate("/shop")}
            className="text-[#6c6c6c] hover:text-[#fbfbfb] transition inline-flex"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-[#fbfbfb] hover:opacity-90 transition"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <User className="w-5 h-5" />
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
              </button>

              {/* Dropdown */}
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-[#6c6c6c] bg-[#151515] shadow-xl overflow-hidden"
                >
                  <button
                    role="menuitem"
                    onClick={() => go("/dashboard", onDashboardClick)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Aceder ao dashboard</span>
                  </button>

                  {isAdmin && (
                    <button
                      role="menuitem"
                      onClick={() => go("/admin", onAdminClick)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                  )}

                  <button
                    role="menuitem"
                    onClick={() => {
                      onLogoutClick?.();
                      setOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                onLoginClick?.();
                navigate("/auth");
              }}
              className="inline-flex items-center gap-2 font-semibold text-[#e53e30] hover:opacity-90"
            >
              <LogIn className="w-5 h-5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

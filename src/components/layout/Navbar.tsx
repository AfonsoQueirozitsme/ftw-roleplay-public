// Navbar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

type NavKey = "home";

const Navbar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "";

  const theme = {
    ring:
      "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black",
  };

  const [active, setActive] = useState<NavKey>("home");

  // Só o item "Home" usa ref (evita conflito com a logo)
  const linkRefs = useRef<Record<NavKey, HTMLAnchorElement | null>>({
    home: null,
  });

  const [pill, setPill] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const updatePill = () => {
    if (!isHome) return;
    const el = linkRefs.current[active];
    const host = document.getElementById("navbar-host");
    if (!el || !host) return;
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    setPill({
      top: r.top - h.top + 8,
      left: r.left - h.left + 6,
      width: r.width - 12,
      height: r.height - 16,
    });
  };

  useEffect(() => {
    if (!isHome) return;
    const raf = requestAnimationFrame(updatePill);
    window.addEventListener("resize", updatePill);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePill);
    };
  }, [active, isHome]);

  return (
    <div className="sticky top-5 z-50">
      <nav
        id="navbar-host"
        className="relative mx-auto max-w-7xl px-8 h-20 rounded-2xl flex items-center justify-between backdrop-blur-xl bg-black/30 border border-white/10 shadow-lg"
        aria-label="Principal"
      >
        {/* Pill highlight (apenas na home) */}
        {isHome && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-lg bg-white/5 border border-white/10 transition-all duration-300"
            style={{
              top: pill.top,
              left: pill.left,
              width: pill.width,
              height: pill.height,
            }}
          />
        )}

        {/* Logo */}
        <a
          href={isHome ? "#home" : "/"}
          className={`flex items-center gap-3 select-none relative ${theme.ring}`}
          onClick={() => setActive("home")}
        >
          <img
            src="https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/logoftw-white.png"
            alt="FTW Roleplay Logo"
            className="w-10 h-10 rounded-lg object-contain p-1"
          />
          <div className="font-extrabold tracking-tight text-xl">FTW Roleplay</div>
        </a>

        {/* Menu */}
        <div className="relative hidden md:flex items-center gap-10 font-medium text-[15px]">
          {/* Home */}
          <a
            href={isHome ? "#home" : "/#home"}
            ref={(el) => (linkRefs.current.home = el)}
            onClick={() => setActive("home")}
            className={`group relative px-5 py-3 rounded-lg transition-colors ${theme.ring} ${
              isHome && active === "home" ? "text-white" : "text-white/70"
            } hover:text-white`}
          >
            Home
            <span
              className={`absolute left-0 -bottom-1 h-[2px] w-0 bg-red-500 transition-all duration-300 ${
                isHome && active === "home" ? "w-full" : "group-hover:w-full"
              }`}
            />
          </a>

          {/* Regras */}
          <Link
            to="/regras"
            className={`group relative px-5 py-3 rounded-lg transition-colors ${theme.ring} ${
              location.pathname.startsWith("/regras") ? "text-white" : "text-white/70"
            } hover:text-white`}
          >
            Regras
            <span
              className={`absolute left-0 -bottom-1 h-[2px] bg-red-500 transition-all duration-300 ${
                location.pathname.startsWith("/regras") ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </Link>
        </div>

        {/* CTA */}
        <a
          href={isHome ? "#candidatura" : "/#candidatura"}
          className={`px-6 py-3 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition shadow-md ${theme.ring}`}
        >
          Early Access
        </a>
      </nav>
    </div>
  );
};

export default Navbar;

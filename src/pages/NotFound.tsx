import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";

const NotFound: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente ->", location.pathname);
    document.title = "404 — FTW Roleplay";
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* BG base */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-gradient-to-br from-black via-[#1a0000] to-black"
      />
      {/* Gradientes vermelhos */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 opacity-70"
        style={{
          background: `
            radial-gradient(900px 500px at 20% 25%, rgba(239,68,68,0.25), transparent),
            radial-gradient(700px 500px at 80% 10%, rgba(220,38,38,0.18), transparent),
            radial-gradient(1000px 600px at 50% 100%, rgba(239,68,68,0.15), transparent)
          `,
        }}
      />
      {/* Shapes animados */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-500/20 blur-3xl animate-pulse -z-10" />
      <div className="absolute top-1/2 -right-40 w-[32rem] h-[32rem] rounded-full bg-red-700/20 blur-3xl animate-ping -z-10" />

      {/* Scanlines + grão leve */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none mix-blend-overlay opacity-30
        [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_3px)] [background-size:100%_3px]"
      />

      {/* Cometas */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-px w-24 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60"
            style={{
              top: `${10 + i * 10}%`,
              left: `${-20 + i * 12}%`,
              transform: "rotate(12deg)",
              animation: `comet 4.5s ${i * 0.4}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Conteúdo */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto w-full max-w-3xl text-center">
          {/* Glitch 404 */}
          <div className="relative mb-6">
            <h1
              className="glitch relative text-[96px] md:text-[140px] font-extrabold leading-none tracking-tight"
              data-text="404"
            >
              404
            </h1>
            {/* brilho vermelho atrás */}
            <div className="absolute inset-0 blur-3xl -z-10 bg-red-500/20 rounded-full" />
          </div>

          {/* Cartão glass */}
          <div className="rounded-2xl p-8 md:p-10 backdrop-blur-xl bg-white/10 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Página não encontrada
            </h2>
            <p className="text-white/70 mb-8">
              A rota <span className="text-red-400 font-semibold">{location.pathname}</span> não existe.
              Volta à base ou segue para a candidatura de early access.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="px-6 py-3 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black"
              >
                Voltar à Home
              </Link>
              <Link
                to="/#candidatura"
                className="px-6 py-3 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black"
              >
                Candidatar ao Early Access
              </Link>
            </div>
          </div>

          {/* Dica/atalhos */}
          <p className="mt-6 text-xs text-white/50">
            Dica: carrega em <span className="text-white">H</span> para ir à Home.
          </p>
        </div>
      </main>

      {/* Keyframes e glitch CSS */}
      <style>{`
        @keyframes comet {
          0% { transform: translateX(-20vw) rotate(12deg); opacity: 0; }
          10% { opacity: .7; }
          100% { transform: translateX(120vw) rotate(12deg); opacity: 0; }
        }
        @keyframes glitch-clip {
          0% { clip-path: inset(0 0 85% 0); }
          10% { clip-path: inset(0 0 30% 0); }
          20% { clip-path: inset(40% 0 20% 0); }
          30% { clip-path: inset(80% 0 0 0); }
          40% { clip-path: inset(10% 0 60% 0); }
          50% { clip-path: inset(0 0 85% 0); }
          60% { clip-path: inset(50% 0 10% 0); }
          70% { clip-path: inset(10% 0 40% 0); }
          80% { clip-path: inset(20% 0 60% 0); }
          90% { clip-path: inset(80% 0 5% 0); }
          100% { clip-path: inset(0 0 85% 0); }
        }
        .glitch {
          position: relative;
          text-shadow: 0 0 12px rgba(239,68,68,.35);
        }
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0;
          width: 100%; height: 100%;
          overflow: hidden;
        }
        .glitch::before {
          color: rgba(239,68,68,0.9);
          transform: translate(2px,0);
          mix-blend-mode: screen;
          animation: glitch-clip 2s infinite linear alternate-reverse;
        }
        .glitch::after {
          color: rgba(255,255,255,0.85);
          transform: translate(-2px,0);
          mix-blend-mode: screen;
          animation: glitch-clip 2s infinite linear;
          animation-delay: .2s;
        }
      `}</style>

      {/* Atalhos de teclado */}
      <KeyboardShortcuts />
    </div>
  );
};

/* Componente separado só para atalhos (H = home) */
const KeyboardShortcuts: React.FC = () => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h") {
        window.location.assign("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
};

export default NotFound;

import React, { useEffect } from "react";
import { Instagram, Twitter, Youtube, MessageCircle, Cookie } from "lucide-react";

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

type FooterProps = {
  onOpenCookies?: () => void;
};

const Footer: React.FC<FooterProps> = ({ onOpenCookies }) => {
  useLoadFonts();

  const links = [
    { label: "Início", href: "#" },
    { label: "Shop", href: "/shop" },
    { label: "Regras", href: "/regras" },
    { label: "Eventos", href: "/eventos" },
    { label: "Sobre", href: "/sobre" },
    { label: "Suporte", href: "/dashboard" },
    { label: "Termos", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
    { label: "Cookies", href: "/cookies" },
  ];

  const socials = [
    { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
    { label: "Twitter / X", href: "https://twitter.com", Icon: Twitter },
    { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
    { label: "Discord", href: "https://discord.com", Icon: MessageCircle },
  ];

  return (
    <footer
      className="w-full bg-[#151515] text-[#fbfbfb] border-t border-[#6c6c6c]"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      <div className="mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-10 items-start">
        {/* Esquerda: Links importantes */}
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-widest text-[#6c6c6c]">Links importantes</h4>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-[#6c6c6c] hover:text-[#fbfbfb] transition"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Divisória (hr vertical) */}
        <div className="hidden md:block h-full w-px bg-[#fbfbfb] opacity-80" />

        {/* Direita: Redes sociais + Copyright + Cookies */}
        <div className="flex flex-col items-start md:items-end gap-6">
          {/* Redes sociais */}
          <div className="flex items-center gap-4">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="p-2 rounded-lg text-[#6c6c6c] hover:text-[#fbfbfb] hover:bg-white/5 transition"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          <p className="text-xs text-[#6c6c6c] md:text-right">
            © {new Date().getFullYear()} FTW Roleplay. Todos os direitos reservados.
          </p>

          <button
            onClick={() => onOpenCookies?.()}
            className="inline-flex items-center gap-2 text-sm underline decoration-2 underline-offset-4 hover:opacity-90"
            aria-label="Definições de cookies"
          >
            <Cookie className="w-4 h-4" />
            <span>Definições de cookies</span>
          </button>
        </div>

        {/* Divisória (hr horizontal no mobile) */}
        <div className="md:hidden col-span-1 h-px w-full bg-[#fbfbfb] opacity-80 mt-8" />
      </div>
    </footer>
  );
};

export default Footer;
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { LogIn, LayoutDashboard, Shield, Bell } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const ring =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const LOGO_URL =
  "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/logo_roleplay_nobg.png";

export default function AuthPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  async function signInDiscord() {
    setErr(null);
    setDiscordLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo, scopes: "identify email" },
      });
      if (error) setErr(error.message);
      // sucesso → redireciona automaticamente pelo OAuth
    } catch (e: any) {
      setErr(e?.message || "Falha no login com Discord.");
    } finally {
      setDiscordLoading(false);
    }
  }

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-6 bg-[#151515] text-[#fbfbfb]"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      <Helmet>
        <title>Entrar • FTW Roleplay</title>
        {/* esconder navbar e footer globais nesta página */}
        <style>{`header, footer { display: none !important; }`}</style>
      </Helmet>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        className="w-full max-w-xl bg-[#151515] border border-[#6c6c6c] rounded-none"
      >
        {/* Top / Branding */}
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3">
            <LogIn className="w-8 h-8 text-[#e53e30]" />
            <h1
              className="text-4xl font-bold"
              style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
            >
              Entrar
            </h1>
          </div>

          <p className="mt-2 text-sm text-[#fbfbfb]/75">
            Liga o teu Discord para aceder ao dashboard, gerir a tua conta e receber alertas.
          </p>
        </div>

        {/* Divider */}
        <div className="mt-6 h-px w-full bg-[#fbfbfb]/20" />

        {/* Benefícios / Highlights */}
        <div className="px-10 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <LayoutDashboard className="w-4 h-4 mt-1 text-[#fbfbfb]" />
            <div>
              <p className="text-sm font-semibold">Dashboard</p>
              <p className="text-xs text-[#fbfbfb]/70">Gestão de perfil e early access.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 mt-1 text-[#fbfbfb]" />
            <div>
              <p className="text-sm font-semibold">Seguro</p>
              <p className="text-xs text-[#fbfbfb]/70">OAuth oficial do Discord.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Bell className="w-4 h-4 mt-1 text-[#fbfbfb]" />
            <div>
              <p className="text-sm font-semibold">Alertas</p>
              <p className="text-xs text-[#fbfbfb]/70">Notificações e eventos.</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#fbfbfb]/20" />

        {/* Discord OAuth — único método */}
        <div className="px-10 py-8">
          {err && (
            <div
              role="alert"
              className="mb-4 border border-red-400/30 bg-red-600/10 text-red-300 px-4 py-3 rounded-none"
            >
              {err}
            </div>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            onClick={signInDiscord}
            disabled={discordLoading}
            className={`w-full px-5 py-4 font-semibold border border-[#6c6c6c] bg-transparent hover:bg-white/10 transition ${ring} disabled:opacity-60 flex items-center justify-center gap-3 rounded-none`}
          >
            {discordLoading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-[#fbfbfb] border-t-transparent animate-spin rounded-full" />
                <span>A ligar ao Discord…</span>
              </>
            ) : (
              <>
                <FaDiscord className="w-5 h-5" />
                <span>Entrar com Discord</span>
              </>
            )}
          </motion.button>

          {/* Nota legal / ajuda */}
          <p className="mt-4 text-xs text-[#fbfbfb]/60">
            Ao entrar, aceitas as regras do servidor. Problemas a entrar? Limpa os cookies e tenta de novo.
          </p>
        </div>
      </motion.section>
    </main>
  );
}

import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { LogIn } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const ring =
  "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black";

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    // Se já estiver autenticado, segue para o dashboard
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
        options: {
          redirectTo,
          scopes: "identify email", // acrescenta 'guilds' se precisares
        },
      });
      if (error) setErr(error.message);
      // Nota: em sucesso, o browser redireciona; não há 'await' pós-login aqui
    } catch (e: any) {
      setErr(e?.message || "Falha no login com Discord.");
    } finally {
      setDiscordLoading(false);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) setErr(error.message);
      else setInfo("Enviámos um link de acesso para o teu e-mail. Verifica a caixa de entrada.");
    } catch (e: any) {
      setErr(e?.message || "Não foi possível enviar o link de acesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Helmet>
        <title>Entrar • FTW Roleplay</title>
      </Helmet>

      <div className="w-full max-w-lg rounded-2xl p-10 backdrop-blur-xl bg-white/10 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Entrar</h1>
        </div>

        {err && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3"
          >
            {err}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 px-4 py-3">
            {info}
          </div>
        )}

        {/* Discord OAuth */}
        <button
          onClick={signInDiscord}
          disabled={discordLoading}
          className={`w-full px-5 py-4 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition flex items-center justify-center gap-3 disabled:opacity-60 ${ring}`}
        >
          <FaDiscord className="w-5 h-5" />
          {discordLoading ? "A ligar ao Discord…" : "Entrar com Discord"}
        </button>

        {/* Divisor */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-white/15 flex-1" />
          <span className="text-white/50 text-xs uppercase tracking-widest">ou</span>
          <div className="h-px bg-white/15 flex-1" />
        </div>

        {/* Magic Link por e-mail */}
        <form onSubmit={signInEmail} className="space-y-3" noValidate>
          <label htmlFor="email" className="block text-sm">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="o.teu@email.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${ring}`}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className={`w-full px-5 py-4 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition disabled:opacity-60 ${ring}`}
          >
            {loading ? "A enviar link…" : "Receber link por e-mail"}
          </button>
        </form>

        <p className="text-white/60 text-sm mt-6">
          Precisas de ajuda? Lê as{" "}
          <Link to="/dashboard" className="underline">
            regras e informação da Early Access
          </Link>{" "}
          no teu dashboard.
        </p>
      </div>
    </main>
  );
}

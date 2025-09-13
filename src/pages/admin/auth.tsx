// src/pages/admin/auth.tsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Ícones
import { Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);

  const [code2FA, setCode2FA] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/admin";

  // === ACTIONS ===
  const nextFromEmail = () => {
    setErro(null);
    if (!email.trim()) {
      setErro("Introduz o teu email.");
      return;
    }
    setStep(1);
  };

  const back = () => {
    setErro(null);
    if (step === 2 && mfaRequired) {
      // voltar para password se estiver em 2FA
      setStep(1);
      return;
    }
    if (step > 0) setStep((s) => (s - 1) as 0 | 1 | 2);
  };

  async function handlePasswordLogin() {
    setErro(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (data?.session && !error) {
        navigate(from, { replace: true });
        return;
      }

      // Se o projecto tiver MFA TOTP
      if (error && (error as any)?.status === 403) {
        const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (factorsErr) {
          setErro("MFA exigida mas não foi possível listar fatores.");
          return;
        }
        const totp = (factorsData?.totp ?? []).find((f: any) => f.status === "verified");
        if (!totp) {
          setErro("MFA exigida mas não existe TOTP verificado nesta conta.");
          return;
        }

        const { data: chall, error: challErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (challErr || !chall) {
          setErro("Não foi possível iniciar o desafio de MFA.");
          return;
        }

        setFactorId(totp.id);
        setChallengeId(chall.id);
        setMfaRequired(true);
        setStep(2); // mostra passo 3 (2FA)
        return;
      }

      if (error) {
        setErro(error.message || "Credenciais inválidas.");
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMfa() {
    setErro(null);
    if (!/^\d{6}$/.test(code2FA.trim())) {
      setErro("O código 2FA tem de ter 6 dígitos.");
      return;
    }
    if (!factorId || !challengeId) {
      setErro("MFA mal inicializada. Tenta voltar a iniciar sessão.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code2FA.trim(),
      });

      if (error) {
        setErro(error.message || "Código 2FA incorreto.");
        return;
      }

      if (data?.session) {
        navigate(from, { replace: true });
      } else {
        setErro("Não foi possível criar sessão após MFA.");
      }
    } finally {
      setLoading(false);
    }
  }

  // === SUBMITS POR PASSO ===
  const submitStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) {
      nextFromEmail();
    } else if (step === 1) {
      if (!password.trim()) {
        setErro("Introduz a tua palavra-passe.");
        return;
      }
      await handlePasswordLogin();
    } else if (step === 2) {
      await handleVerifyMfa();
    }
  };

  // === UI ===
  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo + título */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="inline-flex items-center gap-2">
            {/* Se tiveres /public/logo.svg ele aparece aqui */}
            <img
              src="/logo.svg"
              onError={({ currentTarget }) => {
                currentTarget.style.display = "none";
              }}
              alt="Logo"
              className="h-9 w-9"
            />
            <span className="text-xl font-semibold tracking-tight">FTW Admin</span>
          </Link>
        </div>

        <Card className="border-white/10 bg-white text-black overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Entrar na área de administração</CardTitle>
            <div className="text-sm text-black/60">
              {step === 0 && "Passo 1 de 3 — Email"}
              {step === 1 && (mfaRequired ? "Passo 3 de 3 — Palavra-passe" : "Passo 2 de 3 — Palavra-passe")}
              {step === 2 && "Passo 3 de 3 — Código 2FA"}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            {/* Barra de progresso minimalista */}
            <div className="h-1 w-full bg-black/5">
              <div
                className="h-1 bg-black transition-all"
                style={{ width: `${((step + 1) / (mfaRequired ? 3 : 2)) * 100}%` }}
              />
            </div>

            {/* Content slider */}
            <div className="relative overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${step * 100}%)` }}
              >
                {/* STEP 0 — EMAIL */}
                <form onSubmit={submitStep} className="w-full shrink-0 p-6 space-y-5">
                  {erro && step === 0 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {erro}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@dominio.pt"
                        autoComplete="email"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" className="text-black/60" onClick={() => navigate("/")}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="inline-flex items-center gap-2">
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>

                {/* STEP 1 — PASSWORD */}
                <form onSubmit={submitStep} className="w-full shrink-0 p-6 space-y-5">
                  {erro && step === 1 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {erro}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Palavra-passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
                      <Input
                        id="password"
                        type={mostrarPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pl-9 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPass((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60"
                        aria-label={mostrarPass ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                      >
                        {mostrarPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={back} className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </Button>

                    <Button type="submit" disabled={loading} className="inline-flex items-center gap-2">
                      {loading ? "A entrar..." : "Entrar"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>

                {/* STEP 2 — 2FA */}
                <form onSubmit={submitStep} className="w-full shrink-0 p-6 space-y-5">
                  {erro && step === 2 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {erro}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="code2fa">Código 2FA (6 dígitos)</Label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
                      <Input
                        id="code2fa"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        value={code2FA}
                        onChange={(e) => setCode2FA(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="pl-9 tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={back} className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </Button>

                    <Button type="submit" disabled={loading} className="inline-flex items-center gap-2">
                      {loading ? "A verificar..." : "Verificar 2FA"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dicas/rodapé */}
        <div className="text-center text-xs text-white/60 mt-4">
          Precisas de ajuda? <a className="underline" href="mailto:support@example.com">Contacta o suporte</a>.
        </div>
      </div>
    </div>
  );
}

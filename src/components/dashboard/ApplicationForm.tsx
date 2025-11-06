import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, ShieldCheck, AlertTriangle, ChevronUp } from "lucide-react";

/*
 * ApplicationForm — versão melhorada
 *
 * Objetivos desta revisão:
 * 1) Layout mais largo (container max-w-5xl) e respiro (gap/padding maiores)
 * 2) UX mais amigável: mensagens inline por campo, estados de loading claros
 * 3) A11y: aria-live para erros/sucesso, labels/descrições consistentes
 * 4) Micro-anim.
 * 5) Mantém compat. com presetDiscord + lockDiscord
 */

type ApplicationFormProps = {
  className?: string;
  /** Preenche automaticamente o Discord se vier de OAuth (id + metadados) */
  presetDiscord?: {
    id: string;
    username?: string | null;
    global_name?: string | null;
    avatar_url?: string | null;
  };
  /** Se true, esconde o campo de Discord e bloqueia a validação manual (usa o preset) */
  lockDiscord?: boolean;
  /** Callback após submissão com sucesso (útil para fechar modal) */
  onSubmitted?: () => void;
};

type DiscordInfo = {
  id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
  created_at_from_snowflake?: string;
};

const fieldBase =
  "w-full px-5 py-4 rounded-xl bg-black/30 border border-white/15 placeholder-white/40 text-white/90 focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black transition";

const helpText = "mt-1 text-xs text-white/60";
const errorText = "mt-1 text-sm text-red-300";

const SectionCard: React.FC<React.PropsWithChildren<{ title?: string; description?: string }>> = ({
  title,
  description,
  children,
}) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
    {title && (
      <div className="mb-5">
        <h3 className="text-lg md:text-xl font-semibold leading-tight">{title}</h3>
        {description && <p className="text-white/60 text-sm mt-1.5">{description}</p>}
      </div>
    )}
    {children}
  </div>
);

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  className = "",
  presetDiscord,
  lockDiscord = false,
  onSubmitted,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [discordId, setDiscordId] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordInfo, setDiscordInfo] = useState<DiscordInfo | null>(null);
  const [discordVerified, setDiscordVerified] = useState(false);

  // Errors por campo
  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});

  // Prefill via OAuth
  useEffect(() => {
    if (presetDiscord?.id) {
      const username = presetDiscord.username ?? "discord-user";
      setDiscordId(presetDiscord.id);
      setDiscordInfo({
        id: presetDiscord.id,
        username,
        global_name: presetDiscord.global_name ?? null,
        avatar_url: presetDiscord.avatar_url ?? null,
      });
      setDiscordVerified(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetDiscord?.id]);

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isSnowflake(v: string) {
    return /^[0-9]{17,19}$/.test(v);
  }

  const discordCreatedDate = useMemo(() => {
    if (!discordInfo?.id) return null;
    try {
      const ms = (BigInt(discordInfo.id) >> 22n) + 1420070400000n;
      return new Date(Number(ms)).toISOString().slice(0, 10);
    } catch {
      return discordInfo?.created_at_from_snowflake?.slice(0, 10) ?? null;
    }
  }, [discordInfo?.id, discordInfo?.created_at_from_snowflake]);

  async function validateDiscord() {
    if (lockDiscord && presetDiscord?.id) {
      setDiscordVerified(true);
      return;
    }
    setGlobalError(null);
    setDiscordInfo(null);
    setDiscordVerified(false);

    const id = discordId.trim();
    if (!isSnowflake(id)) {
      setErrors((e) => ({ ...e, discordId: "Discord ID inválido. Deve ter 17 a 19 dígitos." }));
      return;
    } else {
      setErrors((e) => ({ ...e, discordId: null }));
    }

    setDiscordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("discord-lookup", {
        body: { discordId: id },
      });

      if (error) {
        setErrors((e) => ({ ...e, discordId: error.message || "Falha a validar o Discord ID." }));
        return;
      }
      if (!data?.ok || !data?.user) {
        setErrors((e) => ({ ...e, discordId: "Não foi possível validar o Discord ID." }));
        return;
      }

      setDiscordInfo(data.user as DiscordInfo);
      setDiscordVerified(true);
    } catch (e) {
      console.error(e);
      setErrors((ex) => ({ ...ex, discordId: "Erro ao contactar o verificador de Discord." }));
    } finally {
      setDiscordLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setSubmitted(false);
    if (loading) return;

    const fd = new FormData(e.currentTarget);
    const website = (fd.get("website") as string)?.trim();
    if (website) return; // honeypot

    const email = (fd.get("email") as string)?.trim();
    const nome = (fd.get("nome") as string)?.trim();
    const personagem = (fd.get("personagem") as string)?.trim();
    const motivacao = (fd.get("motivacao") as string)?.trim();
    const privacyConsent = fd.get("privacy_consent") === "on";
    const termsConsent = fd.get("terms_consent") === "on";

    const fieldErrs: { [k: string]: string | null } = {};
    if (!nome) fieldErrs.nome = "Preenche o teu nome.";
    if (!email) fieldErrs.email = "Indica um e‑mail válido.";
    if (email && !isValidEmail(email)) fieldErrs.email = "Formato de e‑mail inválido.";
    if (!personagem) fieldErrs.personagem = "Indica o nome da tua personagem.";
    if (!motivacao) fieldErrs.motivacao = "Escreve a tua motivação.";

    if (!discordVerified || !(discordInfo || (lockDiscord && presetDiscord?.id))) {
      fieldErrs.discordId = "Valida primeiro o teu Discord.";
    }

    if (!privacyConsent) {
      setGlobalError("É necessário aceitar o consentimento para tratamento de dados pessoais.");
      return;
    }

    if (!termsConsent) {
      setGlobalError("É necessário aceitar os Termos de Utilização.");
      return;
    }

    setErrors(fieldErrs);
    const hasErr = Object.values(fieldErrs).some(Boolean);
    if (hasErr) return;

    const d =
      discordInfo ||
      (presetDiscord?.id
        ? {
            id: presetDiscord.id,
            username: presetDiscord.username ?? "discord-user",
            global_name: presetDiscord.global_name ?? null,
            avatar_url: presetDiscord.avatar_url ?? null,
          }
        : null);

    if (!d) {
      setGlobalError("Faltam dados de Discord.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("applications")
        .insert([
          {
            nome,
            email,
            personagem,
            motivacao,
            website: website || null,
            status: "pending",
            discord_id: d.id,
            discord_username: d.username,
            discord_global_name: d.global_name,
            discord_avatar_url: d.avatar_url,
            discord_verified: true,
            discord_checked_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error(error);
        setGlobalError("Não foi possível enviar a candidatura. Tenta novamente em breve.");
        return;
      }

      setSubmitted(true);
      (e.currentTarget as HTMLFormElement).reset();
      if (!lockDiscord) {
        setDiscordId("");
        setDiscordInfo(null);
        setDiscordVerified(false);
      }
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      setGlobalError("Ocorreu um erro inesperado. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="candidatura" className={`scroll-mt-24 ${className}`}>
      <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
        {/* Banner topo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 md:mb-10"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-400" />
            <h2 className="text-xl md:text-2xl font-bold">Candidatura</h2>
          </div>
          <p className="text-white/60 text-sm md:text-base mt-1">
            Preenche os dados com atenção. Validamos a tua conta de Discord para evitar perfis falsos.
          </p>
        </motion.div>

        {/* Sucesso modal */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70"
              aria-live="assertive"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ y: 24, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 24, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-md w-full shadow-xl backdrop-blur-xl"
              >
                <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Candidatura enviada 🎉</h3>
                <p className="text-white/70">
                  Vais receber uma mensagem no Discord em breve com mais detalhes.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 px-6 py-3 rounded-xl font-semibold bg-green-500 text-black hover:brightness-95 transition"
                >
                  Fechar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erro global */}
        {globalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3 flex items-start gap-3"
          >
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>{globalError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="grid gap-6 md:gap-8" noValidate>
          {/* Honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <SectionCard title="Dados pessoais">
            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm mb-2">Nome</label>
                <input id="nome" name="nome" required placeholder="O teu nome" autoComplete="name" className={fieldBase} />
                <p className={helpText}>Como aparece no teu documento de identificação.</p>
                {errors.nome && <p className={errorText}>{errors.nome}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm mb-2">E‑mail</label>
                <input id="email" name="email" type="email" required placeholder="o.teu@email.pt" autoComplete="email" className={fieldBase} />
                <p className={helpText}>Usa um e‑mail que consultes com frequência.</p>
                {errors.email && <p className={errorText}>{errors.email}</p>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Conta Discord" description={lockDiscord ? "Vinculada via OAuth." : "Valida o teu ID para confirmar a tua conta."}>
            {lockDiscord && presetDiscord?.id ? (
              <div className="mt-1 flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-white/15">
                {presetDiscord.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={presetDiscord.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                )}
                <div className="flex flex-col">
                  <span className="font-semibold">{presetDiscord.global_name || presetDiscord.username || "Discord user"}</span>
                  <span className="text-white/70 text-sm">@{presetDiscord.username ?? "—"}</span>
                  <span className="text-white/40 text-xs">ID: {presetDiscord.id}{discordCreatedDate ? ` • criado em ${discordCreatedDate}` : ""}</span>
                </div>
                <span className="ml-auto px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-400/30">Autenticado</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div className="flex-1">
                    <label htmlFor="discordId" className="block text-sm mb-2">Discord ID</label>
                    <input
                      id="discordId"
                      name="discordId"
                      placeholder="Ex.: 123456789012345678"
                      autoComplete="off"
                      value={discordId}
                      onChange={(e) => setDiscordId(e.target.value)}
                      className={fieldBase}
                      aria-invalid={!!errors.discordId}
                      aria-describedby={errors.discordId ? "discordId-error" : undefined}
                    />
                    <p className={helpText}>Clica no teu Discord → Definições avançadas → ativa modo programador → botão direito no perfil → Copiar ID.</p>
                    {errors.discordId && (
                      <p id="discordId-error" className={errorText}>{errors.discordId}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={validateDiscord}
                    disabled={discordLoading || !/^[0-9]{17,19}$/.test(discordId)}
                    className="px-5 py-4 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition disabled:opacity-60"
                  >
                    {discordLoading ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> A validar…</span>
                    ) : (
                      "Validar Discord"
                    )}
                  </button>
                </div>

                {discordInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-white/15"
                  >
                    {discordInfo.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={discordInfo.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold">{discordInfo.global_name || discordInfo.username}</span>
                      <span className="text-white/70 text-sm">@{discordInfo.username}</span>
                      <span className="text-white/40 text-xs">ID: {discordInfo.id}{discordCreatedDate ? ` • criado em ${discordCreatedDate}` : ""}</span>
                    </div>
                    <div className="ml-auto">
                      {discordVerified ? (
                        <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-400/30">Autenticado</span>
                      ) : (
                        <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">Por validar</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard title="Personagem & Motivação">
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {/* Personagem */}
              <div>
                <label htmlFor="personagem" className="block text-sm mb-2">Nome da personagem</label>
                <input id="personagem" name="personagem" placeholder="Ex.: Miguel “Rafa” Santos" required autoComplete="off" className={fieldBase} />
                {errors.personagem && <p className={errorText}>{errors.personagem}</p>}
              </div>

              {/* Motivação */}
              <div className="md:col-span-2">
                <label htmlFor="motivacao" className="block text-sm mb-2">Por que deves entrar?</label>
                <textarea id="motivacao" name="motivacao" required rows={6} placeholder="Explica em poucas linhas a tua motivação." className={`${fieldBase} resize-y`} />
                <p className={helpText}>Dá exemplos de experiências anteriores, regras que valorizas e o que procuras no servidor.</p>
                {errors.motivacao && <p className={errorText}>{errors.motivacao}</p>}
              </div>
            </div>
          </SectionCard>

          {/* Ações */}
          <div className="sticky bottom-4 z-10">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur supports-[backdrop-filter]:bg-white/5 p-4 md:p-5 flex flex-wrap items-center gap-3 md:gap-4">
              <button
                type="submit"
                disabled={loading || !discordVerified}
                className="px-6 py-4 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title={!discordVerified ? "Valida primeiro o Discord" : "Enviar candidatura"}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> A enviar…</span>
                ) : (
                  "Enviar candidatura"
                )}
              </button>
              <a href="#topo" className="px-6 py-4 rounded-xl font-semibold bg-white/10 hover:bg-white/20 border border-white/15 transition inline-flex items-center gap-2">
                <ChevronUp className="size-4" /> Voltar ao topo
              </a>
            </div>
          </div>

          {/* Aviso de privacidade e consentimento RGPD */}
          <SectionCard title="Consentimento e Privacidade">
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="privacy_consent"
                    required
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-[#e53e30] focus:ring-2 focus:ring-[#e53e30]/70"
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-semibold">Consentimento para tratamento de dados pessoais</span>
                    <p className="text-white/70 mt-1">
                      Aceito que os meus dados pessoais (nome, e-mail, Discord ID, personagem e motivação) sejam tratados pela FTW Roleplay para fins de gestão de candidaturas, comunicação e moderação, conforme descrito na{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                        Política de Privacidade
                      </a>
                      . Posso retirar este consentimento a qualquer momento.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="terms_consent"
                    required
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-[#e53e30] focus:ring-2 focus:ring-[#e53e30]/70"
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-semibold">Aceitação dos Termos de Utilização</span>
                    <p className="text-white/70 mt-1">
                      Li e aceito os{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                        Termos de Utilização
                      </a>
                      {" "}e as regras do servidor.
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                <strong>Nota:</strong> Os dados são conservados durante o período necessário para gestão da candidatura e histórico de acesso (máximo 24 meses). Tens direito de acesso, retificação, eliminação e oposição ao tratamento dos teus dados. Para exercer estes direitos, contacta-nos através dos canais oficiais ou acede à{" "}
                <a href="/dashboard/data-management" className="underline underline-offset-2 hover:text-white">
                  página de gestão de dados
                </a>
                .
              </p>
            </div>
          </SectionCard>
        </form>
      </div>
    </section>
  );
};

export default ApplicationForm;

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationFormProps = { className?: string };

type DiscordInfo = {
  id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
  created_at_from_snowflake?: string;
};

const ApplicationForm: React.FC<ApplicationFormProps> = ({ className = "" }) => {
  const theme = {
    ring:
      "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black",
  };

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [discordId, setDiscordId] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordInfo, setDiscordInfo] = useState<DiscordInfo | null>(null);
  const [discordVerified, setDiscordVerified] = useState(false);

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isSnowflake(v: string) {
    return /^[0-9]{17,19}$/.test(v);
  }
  // fallback local: inferir data do snowflake caso a function não devolva
  const discordCreatedDate = useMemo(() => {
    if (!discordInfo?.id) return null;
    try {
      const ms = (BigInt(discordInfo.id) >> 22n) + 1420070400000n; // epoch Discord
      return new Date(Number(ms)).toISOString().slice(0, 10);
    } catch {
      return discordInfo?.created_at_from_snowflake?.slice(0, 10) ?? null;
    }
  }, [discordInfo?.id, discordInfo?.created_at_from_snowflake]);

  async function validateDiscord() {
    setErrors(null);
    setDiscordInfo(null);
    setDiscordVerified(false);

    const id = discordId.trim();
    if (!isSnowflake(id)) {
      setErrors("Discord ID inválido. Deve ter 17 a 19 dígitos numéricos.");
      return;
    }

    setDiscordLoading(true);
    try {
      // CHAMA A EDGE FUNCTION DO SUPABASE (sem URLs marados)
      const { data, error } = await supabase.functions.invoke("discord-lookup", {
        body: { discordId: id },
      });

      if (error) {
        setErrors(error.message || "Falha a validar o Discord ID.");
        return;
      }
      if (!data?.ok || !data?.user) {
        setErrors("Não foi possível validar o Discord ID.");
        return;
      }

      setDiscordInfo(data.user as DiscordInfo);
      setDiscordVerified(true);
    } catch (e) {
      console.error(e);
      setErrors("Erro ao contactar o verificador de Discord.");
    } finally {
      setDiscordLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setSubmitted(false);
    if (loading) return;

    const fd = new FormData(e.currentTarget);

    // Honeypot anti-bot
    const website = (fd.get("website") as string)?.trim();
    if (website) return;

    const email = (fd.get("email") as string)?.trim();
    const nome = (fd.get("nome") as string)?.trim();
    const personagem = (fd.get("personagem") as string)?.trim();
    const motivacao = (fd.get("motivacao") as string)?.trim();

    if (!nome || !email || !personagem || !motivacao) {
      setErrors("Preenche todos os campos obrigatórios.");
      return;
    }
    if (!isValidEmail(email || "")) {
      setErrors("Insere um e-mail válido.");
      return;
    }
    if (!discordVerified || !discordInfo) {
      setErrors("Valida primeiro o teu Discord ID.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("applications").insert([
        {
          nome,
          email,
          personagem,
          motivacao,
          website: website || null,
          status: "pending",

          // Discord
          discord_id: discordInfo.id,
          discord_username: discordInfo.username,
          discord_global_name: discordInfo.global_name,
          discord_avatar_url: discordInfo.avatar_url,
          discord_verified: true,
          discord_checked_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error(error);
        setErrors("Não foi possível enviar a candidatura. Tenta novamente em breve.");
        return;
      }

      setSubmitted(true);
      (e.currentTarget as HTMLFormElement).reset();
      setDiscordId("");
      setDiscordInfo(null);
      setDiscordVerified(false);
    } catch (err) {
      console.error(err);
      setErrors("Ocorreu um erro inesperado. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="candidatura" className={`scroll-mt-24 py-32 md:py-40 ${className}`}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Sucesso / Erro */}
        {submitted && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-xl border border-green-400/30 bg-green-500/10 text-green-300 px-4 py-3"
          >
            Candidatura enviada com sucesso. Vais receber novidades por e-mail.
          </div>
        )}

        {errors && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3"
          >
            {errors}
          </div>
        )}

        <div className="rounded-2xl p-10 md:p-14 backdrop-blur-xl bg-white/10 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <h2 className="text-3xl md:text-4xl font-extrabold">Candidatura — Early Access</h2>
          <p className="mt-4 text-white/70">
            Diz quem és e por que razão deves entrar no programa.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid md:grid-cols-2 gap-8" noValidate>
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm mb-2">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                required
                placeholder="O teu nome"
                autoComplete="name"
                className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${theme.ring}`}
              />
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm mb-2">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="o.teu@email.pt"
                autoComplete="email"
                className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${theme.ring}`}
              />
            </div>

            {/* Discord ID + Validar */}
            <div className="md:col-span-2">
              <label htmlFor="discordId" className="block text-sm mb-2">
                Discord ID
              </label>
              <div className="flex gap-3">
                <input
                  id="discordId"
                  name="discordId"
                  placeholder="Ex.: 123456789012345678"
                  autoComplete="off"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${theme.ring}`}
                />
                <button
                  type="button"
                  onClick={validateDiscord}
                  disabled={discordLoading || !isSnowflake(discordId)}
                  className={`px-5 py-4 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition ${theme.ring} disabled:opacity-60`}
                >
                  {discordLoading ? "A validar..." : "Validar Discord"}
                </button>
              </div>

              {/* Card com info do Discord */}
              {discordInfo && (
                <div className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-white/15">
                  {discordInfo.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={discordInfo.avatar_url}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {discordInfo.global_name || discordInfo.username}
                    </span>
                    <span className="text-white/70 text-sm">@{discordInfo.username}</span>
                    <span className="text-white/40 text-xs">
                      ID: {discordInfo.id}
                      {discordCreatedDate ? ` • criado em ${discordCreatedDate}` : ""}
                    </span>
                  </div>
                  <div className="ml-auto">
                    {discordVerified ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-400/30">
                        Autenticado
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                        Por validar
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nome da personagem */}
            <div>
              <label htmlFor="personagem" className="block text-sm mb-2">
                Nome da personagem
              </label>
              <input
                id="personagem"
                name="personagem"
                placeholder="Ex.: Miguel “Rafa” Santos"
                required
                autoComplete="off"
                className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${theme.ring}`}
              />
            </div>

            {/* Motivação */}
            <div className="md:col-span-2">
              <label htmlFor="motivacao" className="block text-sm mb-2">
                Por que deves entrar?
              </label>
              <textarea
                id="motivacao"
                name="motivacao"
                required
                rows={6}
                placeholder="Explica em poucas linhas a tua motivação."
                className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 resize-y ${theme.ring}`}
              />
            </div>

            {/* Botões */}
            <div className="md:col-span-2 flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={loading || !discordVerified}
                className={`px-6 py-4 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition ${theme.ring} disabled:opacity-60 disabled:cursor-not-allowed`}
                title={!discordVerified ? "Valida primeiro o Discord" : "Enviar candidatura"}
              >
                {loading ? "A enviar..." : "Enviar candidatura"}
              </button>
              <a
                href="#home"
                className={`px-6 py-4 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition ${theme.ring}`}
              >
                Voltar ao topo
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ApplicationForm;

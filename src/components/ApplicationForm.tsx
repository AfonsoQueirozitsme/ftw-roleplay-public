import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationFormProps = {
  className?: string;
};

const ApplicationForm: React.FC<ApplicationFormProps> = ({ className = "" }) => {
  const theme = {
    ring:
      "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black",
  };

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const discord = (fd.get("discord") as string)?.trim();

    if (!nome || !email || !personagem || !motivacao) {
      setErrors("Preenche todos os campos obrigatórios.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
      setErrors("Insere um e-mail válido.");
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
          discord: discord || null,
          website: website || null, // guardado só para auditoria
          status: "pending",
        },
      ]);

      if (error) {
        console.error(error);
        setErrors("Não foi possível enviar a candidatura. Tenta novamente em breve.");
        return;
      }

      setSubmitted(true);
      (e.currentTarget as HTMLFormElement).reset();
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

            {/* Discord */}
            <div>
              <label htmlFor="discord" className="block text-sm mb-2">
                Discord
              </label>
              <input
                id="discord"
                name="discord"
                placeholder="@teuUser ou teuUser#0001"
                autoComplete="off"
                className={`w-full px-5 py-4 rounded-lg bg-black/30 border border-white/15 ${theme.ring}`}
              />
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
                disabled={loading}
                className={`px-6 py-4 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition ${theme.ring} disabled:opacity-60 disabled:cursor-not-allowed`}
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

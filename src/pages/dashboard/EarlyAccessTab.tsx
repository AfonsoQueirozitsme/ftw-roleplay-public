// /src/components/ApplicationForm.tsx
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

export type ApplicationFormProps = {
  className?: string;
  onSubmitted?: () => void; // ✅ nova prop
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ className = "", onSubmitted }) => {
  const ring =
    "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setErrors(null);
    setSubmitted(false);

    const fd = new FormData(e.currentTarget);
    const website = (fd.get("website") as string)?.trim(); // honeypot
    if (website) return;

    const email = (fd.get("email") as string)?.trim();
    const nome = (fd.get("nome") as string)?.trim();
    const personagem = (fd.get("personagem") as string)?.trim();
    const motivacao = (fd.get("motivacao") as string)?.trim();

    if (!nome || !email || !personagem || !motivacao) {
      setErrors("Preenche todos os campos obrigatórios.");
      return;
    }
    if (!isValidEmail(email)) {
      setErrors("Insere um e-mail válido.");
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
            website: null,
            status: "pending",
            discord_id: null,
            discord_username: null,
            discord_global_name: null,
            discord_avatar_url: null,
            discord_verified: false,
            discord_checked_at: null,
          },
        ])
        .select();

      if (error) {
        console.error(error);
        setErrors("Não foi possível enviar a candidatura. Tenta novamente em breve.");
        return;
      }

      setSubmitted(true);
      (e.currentTarget as HTMLFormElement).reset();

      // ✅ avisa o pai (EarlyAccessTab) para fechar modal e refazer fetch
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      setErrors("Ocorreu um erro inesperado. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="candidatura"
      className={`scroll-mt-24 py-24 md:py-28 ${className}`}
      style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "#fbfbfb" }}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* MODAL de sucesso */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/80"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-[90vw] max-w-md bg-[#151515] border border-[#6c6c6c] p-8 text-center rounded-none"
              >
                <CheckCircle className="w-12 h-12 text-[#e53e30] mx-auto mb-4" />
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
                >
                  Inscrição concluída
                </h3>
                <p className="text-[#fbfbfb]/80">
                  A tua candidatura foi enviada com sucesso. Recebes novidades em breve.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className={`mt-6 px-6 py-3 font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 transition rounded-none ${ring}`}
                >
                  Fechar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {errors && (
          <div
            role="alert"
            className="mb-6 border border-[#6c6c6c] text-[#e53e30] px-4 py-3 rounded-none"
          >
            {errors}
          </div>
        )}

        {/* FORM */}
        <div className="p-8 md:p-12 bg-[#151515] border border-[#6c6c6c] rounded-none">
          <h2
            className="text-3xl md:text-4xl font-extrabold"
            style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
          >
            Candidatura — Early Access
          </h2>
          <p className="mt-3 text-[#fbfbfb]/75">
            Diz quem és e por que razão deves entrar no programa.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid md:grid-cols-2 gap-8" noValidate>
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px" }}
            />

            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm mb-2">Nome</label>
              <input
                id="nome"
                name="nome"
                required
                placeholder="O teu nome"
                autoComplete="name"
                className={`w-full px-5 py-4 bg-[#151515] border border-[#6c6c6c] placeholder-white/40 text-[#fbfbfb] rounded-none ${ring}`}
              />
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm mb-2">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="o.teu@email.pt"
                autoComplete="email"
                inputMode="email"
                className={`w-full px-5 py-4 bg-[#151515] border border-[#6c6c6c] placeholder-white/40 text-[#fbfbfb] rounded-none ${ring}`}
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
                className={`w-full px-5 py-4 bg-[#151515] border border-[#6c6c6c] placeholder-white/40 text-[#fbfbfb] rounded-none ${ring}`}
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
                className={`w-full px-5 py-4 bg-[#151515] border border-[#6c6c6c] text-[#fbfbfb] placeholder-white/40 resize-y rounded-none ${ring}`}
              />
            </div>

            {/* Ações */}
            <div className="md:col-span-2 flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-4 font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 transition rounded-none ${ring} disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <img src="/spinner.svg" alt="" className="w-4 h-4" />
                    A enviar…
                  </span>
                ) : (
                  "Enviar candidatura"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ApplicationForm;

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

type NewsRow = Database["public"]["Tables"]["news"]["Row"];

type FormState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  published_at: string;
};

const emptyForm = (): FormState => ({
  id: undefined,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_url: "",
  published_at: "",
});

const Spinner = ({ className = "" }: { className?: string }) => (
  <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
);

export default function AdminNewsPage() {
  const [records, setRecords] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false });
      if (!alive) return;
      if (err) {
        setError(err.message);
        setRecords([]);
      } else {
        setRecords(data ?? []);
      }
      setLoading(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return records;
    const q = query.toLowerCase();
    return records.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        (row.slug?.toLowerCase().includes(q) ?? false) ||
        (row.excerpt?.toLowerCase().includes(q) ?? false)
    );
  }, [records, query]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: NewsRow) => {
    setForm({
      id: row.id,
      title: row.title ?? "",
      slug: row.slug ?? "",
      excerpt: row.excerpt ?? "",
      content: row.content ?? "",
      cover_url: row.cover_url ?? "",
      published_at: row.published_at ? row.published_at.slice(0, 16) : "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setForm(emptyForm());
  };

  const upsert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim() || null,
      cover_url: form.cover_url.trim() || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    };

    if (!payload.title) {
      setFormError("TÃ­tulo Ã© obrigatÃ³rio.");
      return;
    }
    if (!payload.slug) {
      setFormError("Slug Ã© obrigatÃ³rio.");
      return;
    }

    setSaving(true);
    const request = form.id
      ? supabase.from("news").update(payload).eq("id", form.id)
      : supabase.from("news").insert(payload).select().single();

    const { error: err } = await request;
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }

    setShowForm(false);
    setForm(emptyForm());
    const { data } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
    setRecords(data ?? []);
  };

  const remove = async (row: NewsRow) => {
    if (!window.confirm(`Eliminar "${row.title}"?`)) return;
    await supabase.from("news").delete().eq("id", row.id);
    setRecords((prev) => prev.filter((item) => item.id !== row.id));
  };

  const autoSlug = () => {
    if (form.id || !form.title) return;
    const slug = form.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({ ...prev, slug }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">NotÃ­cias</h2>
          <p className="text-sm text-white/60">Gerir publicaÃ§Ãµes apresentadas na pÃ¡gina pÃºblica.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Procurar por tÃ­tulo ou slug"
          />
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-400/20"
          >
            Nova notÃ­cia
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Spinner /> A carregar notÃ­cias...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Falha a carregar notÃ­cias: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              Sem notÃ­cias para apresentar.
            </div>
          )}
          {filtered.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white shadow-[0_10px_30px_rgba(6,5,20,0.38)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{row.title}</h3>
                  <p className="text-xs uppercase tracking-wide text-white/40">{row.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/20"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(row)}
                    className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-500/30"
                  >
                    Remover
                  </button>
                </div>
              </div>
              {row.excerpt && <p className="mt-3 text-sm text-white/70">{row.excerpt}</p>}
              <dl className="mt-4 grid gap-2 text-xs text-white/50 sm:grid-cols-3">
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Publicado em</dt>
                  <dd>{row.published_at ? new Date(row.published_at).toLocaleString("pt-PT") : "Rascunho"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Criada</dt>
                  <dd>{row.created_at ? new Date(row.created_at).toLocaleString("pt-PT") : "â€”"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Capa</dt>
                  <dd>{row.cover_url ?? "â€”"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={upsert}
            className="w-full max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-[#070716] p-6 text-white shadow-[0_40px_80px_rgba(4,3,20,0.7)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {form.id ? "Editar notÃ­cia" : "Nova notÃ­cia"}
                </h3>
                <p className="text-sm text-white/60">Preenche os campos e guarda para publicar.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-white/70">
                TÃ­tulo
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  onBlur={autoSlug}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Slug
                <input
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Capa (URL)
                <input
                  value={form.cover_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, cover_url: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="https://..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Publicado em
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, published_at: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              Excerto
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                className="h-24 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>

                        <MarkdownEditor
              label="Conteudo"
              value={form.content}
              onChange={(content) => setForm((prev) => ({ ...prev, content }))}
              placeholder="Suporta markdown leve: **negrito**, *italico*, listas e links."
              minRows={18}
            />

            {formError && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm text-rose-100">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-400/30 disabled:opacity-60"
              >
                {saving && <Spinner />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



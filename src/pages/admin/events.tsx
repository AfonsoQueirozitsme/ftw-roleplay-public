import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

type FormState = {
  id?: string;
  title: string;
  description: string;
  location: string;
  tags: string;
  starts_at: string;
  ends_at: string;
};

const emptyForm = (): FormState => ({
  id: undefined,
  title: "",
  description: "",
  location: "",
  tags: "",
  starts_at: "",
  ends_at: "",
});

const Spinner = ({ className = "" }: { className?: string }) => (
  <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
);

function normaliseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-PT");
  } catch {
    return iso;
  }
}

export default function AdminEventsPage() {
  const [records, setRecords] = useState<EventRow[]>([]);
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
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });
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
    return records.filter((row) => {
      const tagMatch = Array.isArray(row.tags)
        ? row.tags.some((tag) => (tag ?? "").toLowerCase().includes(q))
        : false;
      return (
        (row.title ?? "").toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.location ?? "").toLowerCase().includes(q) ||
        tagMatch
      );
    });
  }, [records, query]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: EventRow) => {
    setForm({
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? "",
      location: row.location ?? "",
      tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).join(", ") : "",
      starts_at: row.starts_at ? row.starts_at.slice(0, 16) : "",
      ends_at: row.ends_at ? row.ends_at.slice(0, 16) : "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setForm(emptyForm());
    setFormError(null);
  };

  const upsert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("TÃ­tulo Ã© obrigatÃ³rio.");
      return;
    }
    if (!form.starts_at) {
      setFormError("Data de inÃ­cio Ã© obrigatÃ³ria.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      tags: normaliseTags(form.tags),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    setSaving(true);

    const request = form.id
      ? supabase.from("events").update(payload).eq("id", form.id)
      : supabase.from("events").insert(payload).select().single();

    const { data, error: err } = await request;
    setSaving(false);

    if (err) {
      setFormError(err.message);
      return;
    }

    if (form.id) {
      setRecords((prev) =>
        prev.map((row) => (row.id === form.id ? { ...row, ...payload, tags: payload.tags } : row))
      );
    } else if (data) {
      setRecords((prev) => [data as EventRow, ...prev]);
    }

    closeForm();
  };

  const remove = async (row: EventRow) => {
    if (!confirm("Remover este evento?")) return;
    const { error: err } = await supabase.from("events").delete().eq("id", row.id);
    if (err) {
      alert(`Erro ao remover: ${err.message}`);
      return;
    }
    setRecords((prev) => prev.filter((record) => record.id !== row.id));
    if (form.id === row.id) closeForm();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">CalendÃ¡rio de eventos</h2>
          <p className="text-sm text-white/60">
            Adiciona e gere eventos que aparecem na pÃ¡gina pÃºblica de calendÃ¡rio.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar eventos..."
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-64"
          />
          <button
            onClick={openCreate}
            className="rounded-xl border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-400/30"
          >
            Novo evento
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Spinner /> A carregar eventos...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
          Erro: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-white/60">
          Sem eventos agendados. Cria o primeiro clicando em â€œNovo eventoâ€.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((row) => (
            <article
              key={row.id}
              className="rounded-3xl border border-white/10 bg-[#070716] p-5 text-white shadow-[0_32px_70px_rgba(3,4,20,0.55)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">{row.title}</h3>
                    <p className="text-xs text-white/60">
                      InÃ­cio: {formatDay(row.starts_at)}{" "}
                      {row.ends_at ? `â€¢ Fim: ${formatDay(row.ends_at)}` : ""}
                    </p>
                    {row.location && (
                      <p className="text-xs text-white/50">Local: {row.location}</p>
                    )}
                  </div>
                  {row.description && (
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{row.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(row.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(row)}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100 transition hover:border-rose-500/60 hover:bg-rose-500/30"
                  >
                    Remover
                  </button>
                </div>
              </div>
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
                  {form.id ? "Editar evento" : "Novo evento"}
                </h3>
                <p className="text-sm text-white/60">
                  Define tÃ­tulo, datas e descriÃ§Ã£o para o calendÃ¡rio pÃºblico.
                </p>
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
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Local
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Cidade, interior, etc."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                InÃ­cio
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, starts_at: event.target.value }))
                  }
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Fim
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              Tags (separadas por vÃ­rgula)
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="pvp, roleplay, economia"
              />
            </label>

                        <MarkdownEditor
              label="Descricao"
              value={form.description}
              onChange={(description) => setForm((prev) => ({ ...prev, description }))}
              placeholder="Markdown leve: **negrito**, *italico*, listas, links."
              minRows={14}
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


import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type PunishmentRow = Database["public"]["Tables"]["punishments"]["Row"];

type FormState = {
  id?: string;
  code: string;
  title: string;
  description: string;
  action_type: string;
  duration: string;
  notes: string;
  category: string;
  position: string;
};

const emptyForm = (): FormState => ({
  id: undefined,
  code: "",
  title: "",
  description: "",
  action_type: "",
  duration: "",
  notes: "",
  category: "",
  position: "",
});

const Spinner = ({ className = "" }: { className?: string }) => (
  <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
);

const categories = ["admin", "roleplay", "discord", "outros"];

export default function AdminPunishmentsPage() {
  const [rows, setRows] = useState<PunishmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("punishments")
      .select("*")
      .order("category", { ascending: true })
      .order("position", { ascending: true, nullsFirst: true })
      .order("title", { ascending: true });
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    let data = rows;
    if (filterCategory !== "all") data = data.filter((row) => (row.category ?? "").toLowerCase() === filterCategory);
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q)
    );
  }, [rows, query, filterCategory]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: PunishmentRow) => {
    setForm({
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      action_type: row.action_type,
      duration: row.duration,
      notes: row.notes ?? "",
      category: row.category,
      position: row.position != null ? String(row.position) : "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setForm(emptyForm());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    if (!form.code.trim() || !form.title.trim()) {
      setFormError("Código e título são obrigatórios.");
      return;
    }
    if (!form.category.trim()) {
      setFormError("Categoria é obrigatória.");
      return;
    }

    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      action_type: form.action_type.trim(),
      duration: form.duration.trim(),
      notes: form.notes.trim() || null,
      category: form.category.trim(),
      position: form.position ? Number(form.position) : null,
    };

    setSaving(true);
    const request = form.id
      ? supabase.from("punishments").update(payload).eq("id", form.id)
      : supabase.from("punishments").insert(payload);
    const { error: err } = await request;
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    closeForm();
    fetchRows();
  };

  const remove = async (row: PunishmentRow) => {
    if (!window.confirm(`Eliminar punição "${row.title}"?`)) return;
    await supabase.from("punishments").delete().eq("id", row.id);
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  const move = async (row: PunishmentRow, dir: -1 | 1) => {
    const position = (row.position ?? 0) + dir;
    await supabase.from("punishments").update({ position }).eq("id", row.id);
    fetchRows();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Punicoes</h2>
          <p className="text-sm text-white/60">Tabela oficial de penalizacoes aplicadas pela equipa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Filtrar por titulo ou codigo"
          />
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-400/30"
          >
            Nova punição
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Spinner /> A carregar punições...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          Falha a carregar punições: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              Nenhuma punição encontrada.
            </div>
          )}
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white shadow-[0_12px_32px_rgba(6,5,20,0.4)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40">{row.category}</p>
                  <h3 className="text-xl font-semibold">{row.title}</h3>
                  <p className="text-xs text-white/45">Código: {row.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => move(row, -1)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(row, 1)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
                  >
                    ↓
                  </button>
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
              <p className="mt-3 text-sm text-white/70">{row.description}</p>
              <dl className="mt-4 grid gap-3 text-xs text-white/55 sm:grid-cols-4">
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Ação</dt>
                  <dd>{row.action_type}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Duração</dt>
                  <dd>{row.duration}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Notas</dt>
                  <dd>{row.notes ?? "—"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-white/35">Posição</dt>
                  <dd>{row.position ?? "—"}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={submit}
            className="w-full max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-[#070716] p-6 text-white shadow-[0_40px_80px_rgba(4,3,20,0.7)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {form.id ? "Editar punição" : "Nova punição"}
                </h3>
                <p className="text-sm text-white/60">Define o código, descrição e ação correspondente.</p>
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
                Código
                <input
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Categoria
                <input
                  list="punishment-categories"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
                <datalist id="punishment-categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              Título
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              Descrição
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="h-32 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Ação
                <input
                  value={form.action_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, action_type: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Ban, Aviso..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Duração
                <input
                  value={form.duration}
                  onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="24h, Permanente..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Posição
                <input
                  value={form.position}
                  onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              Notas adicionais
              <textarea
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="h-24 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>

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

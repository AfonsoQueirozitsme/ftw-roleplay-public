import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type EditableRule = {
  id: number | string;
  title: string;
  description: string;
  order: number;
  active: boolean;
  isNew?: boolean;
};

type EditableCategory = {
  id: number | string;
  name: string;
  description: string;
  rules: EditableRule[];
  isNew?: boolean;
};

const AdminRulesPage: React.FC = () => {
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<number | string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: categoriesData, error: categoriesErr } = await supabase
          .from('rule_categories')
          .select('id,name,description')
          .order('id', { ascending: true });

        if (categoriesErr) throw categoriesErr;

        const { data: rulesData, error: rulesErr } = await supabase
          .from('rules')
          .select('id,category_id,title,description,order,active')
          .order('order', { ascending: true })
          .order('id', { ascending: true });

        if (rulesErr) throw rulesErr;

        if (!alive) return;

        const mapped: EditableCategory[] = (categoriesData ?? []).map((category) => {
          const categoryRules: EditableRule[] = (rulesData ?? [])
            .filter((rule) => rule.category_id === category.id)
            .map((rule) => ({
              id: rule.id,
              title: rule.title,
              description: rule.description ?? '',
              order: rule.order ?? 0,
              active: rule.active ?? true,
            }));

          return {
            id: category.id,
            name: category.name,
            description: category.description ?? '',
            rules: categoryRules,
          };
        });

        setCategories(mapped);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? 'Não foi possível carregar as regras.');
        setCategories([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const addCategory = () => {
    setError(null);
    const tempId = `new-${Date.now()}`;
    setCategories((prev) => [
      ...prev,
      { id: tempId, name: '', description: '', rules: [], isNew: true },
    ]);
  };

  const updateCategoryField = (
    categoryId: number | string,
    field: 'name' | 'description',
    value: string,
  ) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId ? { ...category, [field]: value } : category,
      ),
    );
  };

  const addRule = (categoryId: number | string) => {
    setError(null);
    const tempId = `rule-${Date.now()}`;
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              rules: [
                ...category.rules,
                {
                  id: tempId,
                  title: '',
                  description: '',
                  order: category.rules.length + 1,
                  active: true,
                  isNew: true,
                },
              ],
            }
          : category,
      ),
    );
  };

  const updateRuleField = (
    categoryId: number | string,
    ruleId: number | string,
    field: 'title' | 'description' | 'order' | 'active',
    value: string | number | boolean,
  ) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              rules: category.rules.map((rule) => {
                if (rule.id !== ruleId) return rule;
                if (field === 'order') {
                  const parsed = Number(value);
                  return { ...rule, order: Number.isFinite(parsed) ? parsed : 0 };
                }
                if (field === 'active') {
                  return { ...rule, active: Boolean(value) };
                }
                return { ...rule, [field]: String(value) };
              }),
            }
          : category,
      ),
    );
  };

  const saveCategory = async (category: EditableCategory) => {
    if (!category.name.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }

    setSavingCategoryId(category.id);
    setError(null);
    try {
      const payload: { id?: number; name: string; description: string | null } = {
        name: category.name.trim(),
        description: category.description.trim() ? category.description.trim() : null,
      };
      if (typeof category.id === 'number') {
        payload.id = category.id;
      }

      const { data, error: saveErr } = await supabase
        .from('rule_categories')
        .upsert(payload)
        .select()
        .single();

      if (saveErr) throw saveErr;
      if (!data) return;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === category.id
            ? {
                ...cat,
                id: data.id,
                name: data.name,
                description: data.description ?? '',
                isNew: false,
              }
            : cat,
        ),
      );
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao guardar a categoria.');
    } finally {
      setSavingCategoryId(null);
    }
  };

  const saveRule = async (categoryId: number | string, rule: EditableRule) => {
    if (typeof categoryId !== 'number') {
      setError('Guarda a categoria antes de adicionar regras.');
      return;
    }
    if (!rule.title.trim()) {
      setError('O título da regra é obrigatório.');
      return;
    }

    setSavingRuleId(rule.id);
    setError(null);
    try {
      const payload: {
        id?: number;
        category_id: number;
        title: string;
        description: string | null;
        order: number;
        active: boolean;
      } = {
        category_id: categoryId,
        title: rule.title.trim(),
        description: rule.description.trim() ? rule.description.trim() : null,
        order: Number.isFinite(rule.order) ? rule.order : 0,
        active: rule.active,
      };

      if (typeof rule.id === 'number') {
        payload.id = rule.id;
      }

      const { data, error: saveErr } = await supabase
        .from('rules')
        .upsert(payload)
        .select()
        .single();

      if (saveErr) throw saveErr;
      if (!data) return;

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                rules: category.rules.map((existing) =>
                  existing.id === rule.id
                    ? {
                        ...existing,
                        id: data.id,
                        title: data.title,
                        description: data.description ?? '',
                        order: data.order ?? 0,
                        active: data.active ?? true,
                        isNew: false,
                      }
                    : existing,
                ),
              }
            : category,
        ),
      );
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao guardar a regra.');
    } finally {
      setSavingRuleId(null);
    }
  };

  const removeCategory = async (categoryId: number | string) => {
    setError(null);
    if (typeof categoryId !== 'number') {
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
      return;
    }

    setDeletingId(categoryId);
    try {
      const { error: deleteErr } = await supabase.from('rule_categories').delete().eq('id', categoryId);
      if (deleteErr) throw deleteErr;
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao remover a categoria.');
    } finally {
      setDeletingId(null);
    }
  };

  const removeRule = async (categoryId: number | string, ruleId: number | string) => {
    setError(null);
    if (typeof ruleId !== 'number') {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? { ...category, rules: category.rules.filter((rule) => rule.id !== ruleId) }
            : category,
        ),
      );
      return;
    }

    setDeletingId(ruleId);
    try {
      const { error: deleteErr } = await supabase.from('rules').delete().eq('id', ruleId);
      if (deleteErr) throw deleteErr;
      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? { ...category, rules: category.rules.filter((rule) => rule.id !== ruleId) }
            : category,
        ),
      );
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao remover a regra.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Regras</h2>
          <p className="text-sm text-white/60">Gerir categorias e regras apresentadas no site.</p>
        </div>
        <button
          onClick={addCategory}
          className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
        >
          Adicionar categoria
        </button>
      </header>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

      {loading ? (
        <div className="text-white/60">A carregar...</div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
          Ainda não existem categorias de regras. Adiciona uma nova para começar.
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const pendingCategory = savingCategoryId === category.id;
            const categoryDeletion = deletingId === category.id;
            const disableRules = typeof category.id !== 'number';

            return (
              <section
                key={category.id}
                className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-white/50">Nome</label>
                      <input
                        value={category.name}
                        onChange={(event) => updateCategoryField(category.id, 'name', event.target.value)}
                        onFocus={() => setError(null)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-red-400/70 focus:outline-none"
                        placeholder="Nome da categoria"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-white/50">Descrição</label>
                      <textarea
                        value={category.description}
                        onChange={(event) => updateCategoryField(category.id, 'description', event.target.value)}
                        onFocus={() => setError(null)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-red-400/70 focus:outline-none"
                        placeholder="Descrição curta (opcional)"
                        rows={3}
                      />
                    </div>
                    {category.isNew && (
                      <p className="text-xs text-amber-300/80">Categoria nova — guarda para ativar a gestão de regras.</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 md:w-48">
                    <button
                      onClick={() => saveCategory(category)}
                      disabled={pendingCategory}
                      className="rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-60"
                    >
                      {pendingCategory ? 'A guardar...' : 'Guardar categoria'}
                    </button>
                    <button
                      onClick={() => removeCategory(category.id)}
                      disabled={categoryDeletion}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/20 disabled:opacity-60"
                    >
                      {categoryDeletion ? 'A remover...' : 'Eliminar categoria'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Regras</h3>
                    <button
                      onClick={() => addRule(category.id)}
                      disabled={disableRules}
                      className="self-start rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/20 disabled:opacity-50"
                    >
                      Adicionar regra
                    </button>
                  </div>
                  {disableRules && (
                    <p className="text-xs text-white/50">Guarda a categoria antes de adicionar regras.</p>
                  )}
                  {category.rules.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-4 text-sm text-white/60">
                      Sem regras nesta categoria.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {category.rules.map((rule) => {
                        const pendingRule = savingRuleId === rule.id;
                        const ruleDeletion = deletingId === rule.id;
                        return (
                          <div key={rule.id} className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs uppercase tracking-wide text-white/50">Título</label>
                                <input
                                  value={rule.title}
                                  onChange={(event) => updateRuleField(category.id, rule.id, 'title', event.target.value)}
                                  onFocus={() => setError(null)}
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-red-400/70 focus:outline-none"
                                  placeholder="Título da regra"
                                  disabled={disableRules}
                                />
                              </div>
                              <div>
                                <label className="text-xs uppercase tracking-wide text-white/50">Ordem</label>
                                <input
                                  type="number"
                                  value={rule.order}
                                  onChange={(event) => updateRuleField(category.id, rule.id, 'order', Number(event.target.value))}
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-red-400/70 focus:outline-none"
                                  disabled={disableRules}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs uppercase tracking-wide text-white/50">Descrição</label>
                              <textarea
                                value={rule.description}
                                onChange={(event) => updateRuleField(category.id, rule.id, 'description', event.target.value)}
                                onFocus={() => setError(null)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-red-400/70 focus:outline-none"
                                rows={3}
                                placeholder="Detalhes opcionais"
                                disabled={disableRules}
                              />
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <label className="flex items-center gap-2 text-sm text-white/70">
                                <input
                                  type="checkbox"
                                  checked={rule.active}
                                  onChange={(event) => updateRuleField(category.id, rule.id, 'active', event.target.checked)}
                                  disabled={disableRules}
                                />
                                <span>Regra ativa</span>
                              </label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveRule(category.id, rule)}
                                  disabled={disableRules || pendingRule}
                                  className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60"
                                >
                                  {pendingRule ? 'A guardar...' : 'Guardar regra'}
                                </button>
                                <button
                                  onClick={() => removeRule(category.id, rule.id)}
                                  disabled={disableRules || ruleDeletion}
                                  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/20 disabled:opacity-60"
                                >
                                  {ruleDeletion ? 'A remover...' : 'Eliminar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRulesPage;
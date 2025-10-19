import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminRulesPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to load from a `static` table (key: rules_html) or fallback to local fetch
        const { data, error } = await supabase.from('static').select('value').eq('key', 'rules_html').single();
        if (!alive) return;
        if (error) {
          // table might not exist or no value set - fallback to empty
          setText('');
        } else {
          setText((data as any)?.value ?? '');
        }
      } catch (e) {
        console.error('Failed to load rules', e);
        setText('');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Upsert into static table
      const payload = { key: 'rules_html', value: text };
      const { error } = await supabase.from('static').upsert(payload);
      if (error) throw error;
      alert('Regras guardadas.');
    } catch (e: any) {
      console.error('Failed to save rules', e);
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Regras</h2>
        <p className="text-sm text-white/60">Editar as regras apresentadas no site.</p>
      </header>

      <div>
        {loading ? (
          <div className="text-white/60">A carregar...</div>
        ) : (
          <textarea
            className="w-full min-h-[40vh] rounded-xl border border-white/10 bg-white/3 p-4 text-white"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </div>

      {error && <div className="text-rose-300">Erro: {error}</div>}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-emerald-500/20 px-4 py-2 text-emerald-100"
        >
          {saving ? 'A gravar...' : 'Guardar regras'}
        </button>
      </div>
    </div>
  );
}

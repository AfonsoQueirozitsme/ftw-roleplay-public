import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type UserRow = {
  id: string;
  email: string | null;
  created_at?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  blocked?: boolean | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      // Try to read from a `profiles` or `users` table; adjust as needed for your schema
      let { data, error } = await supabase
        .from('profiles')
        .select('id, email, created_at, discord_id, discord_username, discord_avatar, blocked')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to `users` table if `profiles` does not exist
        const { data: d2, error: e2 } = await supabase
          .from('users')
          .select('id, email, created_at, discord_id, discord_username, discord_avatar, blocked')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        data = d2 as any;
      }

      setUsers((data as UserRow[]) ?? []);
    } catch (e) {
      console.error('Failed to fetch users', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock(u: UserRow) {
    const confirmMsg = u.blocked ? 'Desbloquear conta?' : 'Bloquear conta?';
    if (!confirm(confirmMsg)) return;
    try {
      // Upsert to whichever table holds the blocked flag
      const payload = { blocked: !u.blocked };
      const { error } = await supabase.from('profiles').update(payload).eq('id', u.id);
      if (error) {
        // fallback to users
        const { error: e2 } = await supabase.from('users').update(payload).eq('id', u.id);
        if (e2) throw e2;
      }
      // If you use Supabase Auth and want to disable sign-in, you'd need to use the Admin API.
      fetchUsers();
      if (selected && selected.id === u.id) setSelected({ ...selected, blocked: !u.blocked });
    } catch (err) {
      console.error('Failed to toggle block', err);
      toast({ title: 'Erro', description: 'Erro ao alterar o estado da conta' });
      return;
    }
    toast({ title: 'Sucesso', description: u.blocked ? 'Conta desbloqueada' : 'Conta bloqueada' });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Utilizadores</h2>
          <p className="text-sm text-white/60">Lista de utilizadores registados e detalhe de perfil.</p>
        </div>
      </header>

      {loading && <div className="text-white/60">A carregar utilizadores...</div>}

      {!loading && users.length === 0 && <div className="text-white/60">Sem utilizadores.</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="col-span-2 space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-white/10 bg-white/3 p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{u.discord_username ?? u.email ?? u.id}</div>
                <div className="text-xs text-white/60">{u.email ?? '—'}</div>
                <div className="text-xs text-white/50">Criado: {u.created_at ? new Date(u.created_at).toLocaleString('pt-PT') : '—'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(u)} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-white/80">Ver</button>
                <button onClick={() => toggleBlock(u)} className={`rounded-xl px-3 py-1 text-sm ${u.blocked ? 'border border-emerald-400/30 text-emerald-100' : 'border border-rose-500/30 text-rose-100'}`}>
                  {u.blocked ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-xl border border-white/10 bg-white/3 p-4">
          {selected ? (
            <div>
              <h3 className="font-semibold">Perfil: {selected.discord_username ?? selected.email}</h3>
              <div className="mt-2 space-y-2 text-sm text-white/70">
                <div>Discord ID: {selected.discord_id ?? '—'}</div>
                <div>Email: {selected.email ?? '—'}</div>
                <div>Blocked: {selected.blocked ? 'Sim' : 'Não'}</div>
                <div>Created: {selected.created_at ? new Date(selected.created_at).toLocaleString('pt-PT') : '—'}</div>
              </div>

              {selected.discord_id && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium">Discord profile</h4>
                  <div className="mt-2 text-sm text-white/60">Username: {selected.discord_username}</div>
                  <div className="mt-2">
                    {selected.discord_avatar ? (
                      <img src={selected.discord_avatar} alt="avatar" className="h-16 w-16 rounded-full" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">—</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-3 py-1 text-sm">Fechar</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/60">Selecione um utilizador para ver o perfil.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

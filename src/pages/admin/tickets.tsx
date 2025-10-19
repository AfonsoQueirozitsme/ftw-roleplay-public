import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type TicketRow = {
  id: string;
  title: string;
  content: string | null;
  user_id: string | null;
  status: 'open' | 'closed' | 'pending' | string;
  created_at?: string | null;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [reply, setReply] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data as TicketRow[]) ?? []);
    } catch (e) {
      console.error('Failed to load tickets', e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  async function closeTicket(t: TicketRow) {
    if (!confirm('Fechar este ticket?')) return;
    try {
      const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', t.id);
      if (error) throw error;
      toast({ title: 'Ticket fechado' });
      fetchTickets();
    } catch (e) {
      console.error('Failed to close ticket', e);
      toast({ title: 'Erro', description: 'Não foi possível fechar o ticket' });
    }
  }

  async function postReply() {
    if (!selected) return;
    try {
      const payload = { ticket_id: selected.id, content: reply, author: 'admin', created_at: new Date().toISOString() };
      const { error } = await supabase.from('ticket_messages').insert(payload);
      if (error) throw error;
      setReply('');
      // Optionally update ticket status
      await supabase.from('tickets').update({ status: 'pending' }).eq('id', selected.id);
      toast({ title: 'Resposta enviada' });
      fetchTickets();
    } catch (e) {
      console.error('Failed to post reply', e);
      toast({ title: 'Erro', description: 'Não foi possível enviar a resposta' });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Tickets</h2>
        <p className="text-sm text-white/60">Sistema de suporte - ver tickets e responder.</p>
      </header>

      {loading && <div className="text-white/60">A carregar tickets...</div>}

      {!loading && tickets.length === 0 && <div className="text-white/60">Sem tickets.</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="col-span-2 space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/3 p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-white/60">{t.user_id ?? '—'}</div>
                <div className="text-xs text-white/50">{t.created_at ? new Date(t.created_at).toLocaleString('pt-PT') : '—'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(t)} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-white/80">Abrir</button>
                <button onClick={() => closeTicket(t)} className="rounded-xl border border-rose-500/30 px-3 py-1 text-sm text-rose-100">Fechar</button>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-xl border border-white/10 bg-white/3 p-4">
          {selected ? (
            <div>
              <h3 className="font-semibold">{selected.title}</h3>
              <div className="mt-2 text-sm text-white/70">{selected.content}</div>

              <div className="mt-4">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} className="w-full min-h-[120px] rounded-xl bg-transparent p-3 text-white" />
                <div className="mt-2 flex gap-2 justify-end">
                  <button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-3 py-1 text-sm">Fechar</button>
                  <button onClick={postReply} className="rounded-xl bg-emerald-500/20 px-4 py-2 text-emerald-100">Enviar resposta</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/60">Selecione um ticket para ver detalhes.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

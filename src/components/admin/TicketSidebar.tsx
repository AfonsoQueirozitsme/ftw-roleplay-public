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

export default function TicketSidebar() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchTickets();
  }, [open]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      setTickets((data as TicketRow[]) ?? []);
    } catch (e) {
      console.error('Failed to load tickets', e);
      toast({ title: 'Erro', description: 'Falha a carregar tickets' });
    } finally {
      setLoading(false);
    }
  }

  async function postReply() {
    if (!selected) return;
    try {
      const payload = { ticket_id: selected.id, content: reply, author: 'admin', created_at: new Date().toISOString() };
      const { error } = await supabase.from('ticket_messages').insert(payload);
      if (error) throw error;
      await supabase.from('tickets').update({ status: 'pending' }).eq('id', selected.id);
      setReply('');
      toast({ title: 'Resposta enviada' });
      fetchTickets();
    } catch (e) {
      console.error('Failed to post reply', e);
      toast({ title: 'Erro', description: 'Não foi possível enviar a resposta.' });
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-50 rounded-full bg-emerald-500/80 p-3 text-white shadow-lg"
        title="Tickets"
      >
        🛎
      </button>

      {open && (
        <div className="fixed right-6 bottom-20 z-50 w-96 max-h-[70vh] overflow-auto rounded-xl border border-white/10 bg-[#070716] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Tickets recentes</h4>
            <button onClick={() => setOpen(false)} className="text-sm text-white/60">Fechar</button>
          </div>

          {loading && <div className="mt-3 text-white/60">A carregar...</div>}

          <div className="mt-3 grid gap-2">
            {tickets.map((t) => (
              <div key={t.id} onClick={() => setSelected(t)} className="cursor-pointer rounded-md border border-white/6 p-2">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-white/60">{t.user_id ?? '—'}</div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="mt-3 border-t border-white/6 pt-3">
              <div className="text-sm text-white/80">{selected.title}</div>
              <div className="mt-2 text-sm text-white/60">{selected.content}</div>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Escrever resposta..."
                className="mt-2 w-full min-h-[80px] rounded-md bg-white/3 p-2 text-white"
              />

              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setSelected(null)} className="rounded-md border border-white/10 px-3 py-1 text-sm">Voltar</button>
                <button onClick={postReply} className="rounded-md bg-emerald-500/20 px-3 py-1 text-emerald-100">Responder</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

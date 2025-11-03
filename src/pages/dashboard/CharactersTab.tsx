import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CharacterRecord,
  listCharactersByDiscordId,
  performCharacterAction,
} from "@/lib/api/characters";
import UltraSpinner from "@/components/layout/Spinner";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  RefreshCcw,
  ShieldCheck,
  Swords,
  UserCircle2,
  Crown,
  Lock,
  ReceiptText,
  Check,
  X,
} from "lucide-react";

/* =========================
   Constantes de estilo
========================= */
const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";
const CARD_BASE =
  "relative transition border border-white/10 bg-[#111215]/90 backdrop-blur-sm hover:border-[#e53e30]/70 hover:-translate-y-0.5";

/* =========================
   Ações
========================= */
type ActionItem = {
  id: string;
  label: string;
  description: string;
  confirm?: string;
  cost?: number; // custo base (quando aplicável)
};

const ACTIONS: ActionItem[] = [
  {
    id: "ck",
    label: "Dar CK",
    description: "Marca a personagem como CK e executa rotinas de limpeza.",
    confirm: "Tens a certeza que queres dar CK a esta personagem? Esta ação é irreversível.",
    cost: 1000,
  },
  {
    id: "wipe_fines",
    label: "Perdoar multas",
    description: "Abre a lista de multas para escolher quais perdoar.",
    // confirmação é feita no modal de multas (com custo por multa)
  },
  {
    id: "reset_inventory",
    label: "Limpar inventário",
    description: "Remove todo o conteúdo do inventário (inclui cofres pessoais).",
    confirm: "Esta ação limpa completamente o inventário. Continuar?",
    cost: 500,
  },
  {
    id: "refresh_stats",
    label: "Recalcular stats",
    description: "Atualiza estatísticas e caches desta personagem.",
    // sem custo
  },
];

const FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

/* =========================
   Helpers de formatação "tipo banco"
========================= */

// 1234.5 -> 1 234,50 €
function formatMoney(value?: number | null, currency: string = "EUR", minimumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value as any)) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(Number(value));
}

// datas em pt-PT, 24h
function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// “license2:abcd...caa3” -> “license2:…caa3”
function maskLicense(x?: string | null) {
  if (!x) return "—";
  const s = String(x);
  if (s.length <= 12) return s;
  const colon = s.indexOf(":");
  const head = colon > -1 ? s.slice(0, colon + 1) : "";
  return head + "…" + s.slice(-6);
}

// “1259871278614184028” -> “1259…84028”
function maskDiscordId(x?: string | null) {
  if (!x) return "—";
  const s = String(x);
  if (s.length <= 6) return s;
  return s.slice(0, 4) + "…" + s.slice(-5);
}

function extractDiscordId(user: any): string | null {
  if (!user) return null;
  const identities: any[] = user.identities || [];
  const disc = identities.find((i) => i.provider === "discord");
  const meta: any = user.user_metadata || {};
  return (
    disc?.identity_data?.sub ||
    disc?.id ||
    meta?.provider_id ||
    meta?.sub ||
    meta?.discord_user_id ||
    null
  );
}

/* =========================
   Tipos de multas (UI)
========================= */
type FineRow = {
  id: string;
  code?: string | null;
  reason: string;
  amount: number; // custo por multa
  issued_at?: string | null;
  status?: "unpaid" | "paid" | "void" | string;
};

/* =========================
   Pequenos componentes de UI
========================= */
function ModalShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-white/12 bg-[#0f1013] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center justify-center rounded-md p-2 text-white/70 hover:text-white ${RING}`}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ConfirmBar({
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  disabled,
  onConfirm,
  onCancel,
  loading,
}: {
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className={`inline-flex items-center gap-2 border border-white/12 px-4 py-2 text-sm text-white/90 hover:border-white/30 rounded-md ${RING}`}
      >
        <X className="w-4 h-4" />
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || loading}
        className={`inline-flex items-center gap-2 bg-[#e53e30] text-[#151515] px-4 py-2 text-sm font-semibold rounded-md ${RING} disabled:opacity-50`}
      >
        {loading ? <UltraSpinner size={16} /> : <Check className="w-4 h-4" />}
        {confirmLabel}
      </button>
    </div>
  );
}

/* =========================
   Card de personagem
========================= */
function CharacterCardCompact({
  item,
  active,
  onSelect,
  onAction,
  onOpenFines,
  busyAction,
}: {
  item: CharacterRecord;
  active: boolean;
  onSelect: (c: CharacterRecord) => void;
  onAction: (action: ActionItem, c: CharacterRecord) => void;
  onOpenFines: (c: CharacterRecord) => void;
  busyAction: string | null;
}) {
  return (
    <div
      className={`${CARD_BASE} ${active ? "border-[#e53e30]" : ""} rounded-xl p-4 grid gap-4`}
      role="group"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={(item.avatar_url as string | undefined) ?? FALLBACK_AVATAR}
          alt={item.name}
          className="w-12 h-12 rounded-full border border-white/10 object-cover"
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_AVATAR)}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">{item.name}</h3>
          </div>
          <p className="text-xs text-white/60 truncate">
            {item.job ? `${item.job}${item.job_grade ? ` — ${item.job_grade}` : ""}` : "Sem emprego"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Cash</span>
          <span
            className="text-sm font-semibold text-white tabular-nums tracking-tight text-right block"
            title={String(item.cash ?? "")}
          >
            {formatMoney(item.cash as number, "EUR", 2)}
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Banco</span>
          <span
            className="text-sm font-semibold text-white tabular-nums tracking-tight text-right block"
            title={String(item.bank ?? "")}
          >
            {formatMoney(item.bank as number, "EUR", 2)}
          </span>
        </div>
      </div>

      {/* Meta curta */}
      <div className="grid gap-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Gang</span>
          <span className="text-white/90 truncate">{item.gang ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Última atividade</span>
          <span className="text-white/90 truncate">{formatDate(item.last_played as string)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Criada em</span>
          <span className="text-white/90 truncate">{formatDate(item.created_at as string)}</span>
        </div>
        {/* IDs úteis (mascarados) se existirem no objeto */}
        {(item as any)?.license && (
          <div className="flex justify-between gap-3">
            <span className="text-white/50">License</span>
            <span className="text-white/90 truncate">{maskLicense((item as any).license as string)}</span>
          </div>
        )}
        {(item as any)?.discordid && (
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Discord</span>
            <span className="text-white/90 truncate">{maskDiscordId((item as any).discordid as string)}</span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className={`w-full inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 ${RING}`}
          aria-pressed={active}
        >
          <UserCircle2 className="w-4 h-4" />
          Selecionar
        </button>

        <button
          type="button"
          onClick={() => onAction({ id: "refresh_stats", label: "Recalcular stats", description: "" }, item)}
          className={`w-full inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 ${RING}`}
          disabled={busyAction === "refresh_stats"}
        >
          {busyAction === "refresh_stats" ? <UltraSpinner size={16} /> : <RefreshCcw className="w-4 h-4" />}
          Refrescar
        </button>

        <button
          type="button"
          onClick={() => onOpenFines(item)}
          className={`col-span-1 inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 ${RING}`}
        >
          <ReceiptText className="w-4 h-4" />
          Multas
        </button>

        <button
          type="button"
          onClick={() => onAction(ACTIONS.find((a) => a.id === "ck")!, item)}
          className={`col-span-1 inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${RING}`}
          disabled={busyAction === "ck"}
        >
          {busyAction === "ck" ? <UltraSpinner size={16} /> : <Swords className="w-4 h-4" />}
          CK
        </button>

        <button
          type="button"
          onClick={() => onAction(ACTIONS.find((a) => a.id === "reset_inventory")!, item)}
          className={`col-span-2 inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 ${RING}`}
          disabled={busyAction === "reset_inventory"}
        >
          {busyAction === "reset_inventory" ? <UltraSpinner size={16} /> : <Lock className="w-4 h-4" />}
          Limpar inventário
        </button>
      </div>
    </div>
  );
}

function VipSlotCard({ index, onBuy }: { index: number; onBuy: () => void }) {
  return (
    <div className={`${CARD_BASE} rounded-xl p-4 grid gap-3 place-content-between`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border border-white/10 grid place-items-center bg-white/5">
          <Lock className="w-5 h-5 text-[#e53e30]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Slot {index + 1} bloqueado</h3>
          <p className="text-xs text-white/60">Desbloqueia este slot com VIP.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onBuy}
        className={`mt-1 inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] rounded-lg ${RING}`}
      >
        <Crown className="w-4 h-4" />
        Comprar VIP
      </button>
    </div>
  );
}

/* =========================
   Modais de ações
========================= */
function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  action,
  target,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: ActionItem;
  target?: CharacterRecord | null;
}) {
  return (
    <ModalShell open={open} onClose={onClose} title={`Confirmar: ${action.label}`}>
      <div className="space-y-3 text-sm text-white/80">
        <p className="text-white/70">{action.description}</p>
        {target && (
          <p>
            Personagem: <span className="font-semibold text-white">{target.name}</span>
          </p>
        )}
        {typeof action.cost === "number" && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-white/80">
              <span>Custo da operação</span>
              <span className="font-semibold tabular-nums">{formatMoney(action.cost)}</span>
            </div>
          </div>
        )}
      </div>
      <ConfirmBar onCancel={onClose} onConfirm={onConfirm} />
    </ModalShell>
  );
}

function FinesModal({
  open,
  onClose,
  onConfirmWipe,
  loading,
  fines,
  selectedIds,
  toggleSelect,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmWipe: (selected: FineRow[]) => void;
  loading: boolean;
  fines: FineRow[];
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
}) {
  const selected = fines.filter((f) => selectedIds.has(f.id));
  const total = selected.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  return (
    <ModalShell open={open} onClose={onClose} title="Multas da personagem">
      {loading ? (
        <div className="py-10 grid place-items-center">
          <UltraSpinner size={48} label="A carregar multas..." />
        </div>
      ) : fines.length === 0 ? (
        <div className="p-3 text-sm text-white/70">Sem multas por agora.</div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-white/70">
                  <th className="px-3 py-2 w-10"></th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleSelect(f.id)}
                        className="accent-[#e53e30]"
                      />
                    </td>
                    <td className="px-3 py-2 text-white/90">{f.reason}</td>
                    <td className="px-3 py-2 text-white/70">{f.code ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(f.amount)}</td>
                    <td className="px-3 py-2 text-white/70">{formatDate(f.issued_at)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                          f.status === "unpaid"
                            ? "bg-[#3a1a1a] text-[#fca5a5] border border-[#7f1d1d]"
                            : "bg-white/10 text-white/80 border border-white/10"
                        }`}
                      >
                        {f.status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Selecionadas</span>
              <span className="text-white/90 font-semibold">{selected.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white/80">Total a perdoar</span>
              <span className="text-white font-semibold tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>
        </div>
      )}

      <ConfirmBar
        onCancel={onClose}
        onConfirm={() => onConfirmWipe(selected)}
        confirmLabel="Perdoar selecionadas"
        disabled={loading || selected.length === 0}
      />
    </ModalShell>
  );
}

/* =========================
   Página
========================= */
export default function CharactersTab() {
  const [activeDiscordId, setActiveDiscordId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [selected, setSelected] = useState<CharacterRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // multas
  const [finesOpen, setFinesOpen] = useState(false);
  const [finesLoading, setFinesLoading] = useState(false);
  const [fines, setFines] = useState<FineRow[]>([]);
  const [selectedFineIds, setSelectedFineIds] = useState<Set<string>>(new Set());

  // modal genérico de confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionItem | null>(null);

  const visibleCharacters = useMemo(() => characters.slice(0, 4), [characters]);

  const signInDiscord = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.href },
    });
  }, []);

  const openVip = useCallback(() => {
    window.location.hash = "/vip";
  }, []);

  const bootstrapDiscordId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const autoId = extractDiscordId(data.user as any);
    if (autoId) setActiveDiscordId(autoId);
    setAutoFilled(true);
  }, []);

  const fetchCharacters = useCallback(
    async (discordId: string) => {
      setLoading(true);
      setError(null);
      setActionMessage(null);
      try {
        const data = await listCharactersByDiscordId(discordId);
        setCharacters(data);
        setSelected((prev) => {
          if (!prev) return data[0] ?? null;
          const updated = data.find((item) => item.id === prev.id);
          return updated ?? data[0] ?? null;
        });
      } catch (err) {
        setCharacters([]);
        setSelected(null);
        setError(err instanceof Error ? err.message : "Falha ao carregar personagens.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void bootstrapDiscordId();
  }, [bootstrapDiscordId]);

  useEffect(() => {
    if (activeDiscordId) void fetchCharacters(activeDiscordId);
  }, [activeDiscordId, fetchCharacters]);

  /* ========= Multas ========= */

  const toggleFine = useCallback((id: string) => {
    setSelectedFineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function authHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    return {
      Authorization: `Bearer ${session?.access_token ?? anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    };
  }

  const loadFines = useCallback(
    async (characterId: string) => {
      setFinesLoading(true);
      setSelectedFineIds(new Set());
      setFines([]);
      setError(null);
      try {
        // 👉 Ajusta esta rota se a tua Edge Function usar outro caminho/parâmetros
        const base = import.meta.env.VITE_SUPABASE_URL as string;
        const url = `${base}/functions/v1/players/${encodeURIComponent(characterId)}/fines`;
        const headers = await authHeaders();
        const res = await fetch(url, { headers, method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as { data?: FineRow[] } | FineRow[];
        const list = Array.isArray(payload) ? payload : payload.data ?? [];
        setFines(
          list.map((f) => ({
            id: String(f.id),
            code: f.code ?? null,
            reason: f.reason,
            amount: Number(f.amount) || 0,
            issued_at: f.issued_at ?? null,
            status: f.status ?? "unpaid",
          }))
        );
      } catch (e) {
        // se a função ainda não existir, mantém sem multas
        console.warn("Falha a obter multas:", e);
      } finally {
        setFinesLoading(false);
      }
    },
    []
  );

  const openFinesModal = useCallback(
    async (c: CharacterRecord) => {
      setSelected(c);
      setFinesOpen(true);
      await loadFines(c.id);
    },
    [loadFines]
  );

  const confirmWipeSelectedFines = useCallback(
    async (selectedFines: FineRow[]) => {
      if (!selected) return;
      const total = selectedFines.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
      // Confirmação final (extra segurança)
      const ok = window.confirm(
        `Vais perdoar ${selectedFines.length} multa(s) no total de ${formatMoney(total)}. Confirmas?`
      );
      if (!ok) return;

      setActionLoading("wipe_fines");
      setActionMessage(null);
      try {
        const res = await performCharacterAction(selected.id, "wipe_fines", {
          fineIds: selectedFines.map((f) => f.id),
          totalAmount: total,
        });
        setActionMessage(res.message ?? "Multas perdoadas com sucesso.");
        setFinesOpen(false);
        // refresca personagem (se precisares de refletir saldo/estado, podes voltar a carregar)
        if (activeDiscordId) await fetchCharacters(activeDiscordId);
      } catch (err) {
        setActionMessage(err instanceof Error ? err.message : "Não foi possível perdoar as multas.");
      } finally {
        setActionLoading(null);
      }
    },
    [selected, activeDiscordId, fetchCharacters]
  );

  /* ========= Ações genéricas ========= */

  const handleAction = useCallback(
    async (action: ActionItem, c: CharacterRecord) => {
      if (action.id === "wipe_fines") {
        // abre o modal das multas (confirmação personalizada acontece lá)
        await openFinesModal(c);
        return;
      }

      // para ações com custo/confirmação, usa modal próprio; senão, dispara logo
      if (action.confirm || typeof action.cost === "number") {
        setSelected(c);
        setConfirmAction(action);
        setConfirmOpen(true);
        return;
      }

      setActionLoading(action.id);
      setActionMessage(null);
      try {
        const response = await performCharacterAction(c.id, action.id);
        setActionMessage(response.message ?? "Ação enviada para o backend.");
      } catch (err) {
        setActionMessage(err instanceof Error ? err.message : "Não foi possível executar a ação.");
      } finally {
        setActionLoading(null);
      }
    },
    [openFinesModal]
  );

  const confirmGenericActionNow = useCallback(async () => {
    if (!confirmAction || !selected) return;
    setConfirmOpen(false);

    setActionLoading(confirmAction.id);
    setActionMessage(null);
    try {
      const response = await performCharacterAction(selected.id, confirmAction.id, {
        cost: confirmAction.cost,
      });
      setActionMessage(response.message ?? "Ação executada com sucesso.");
      if (activeDiscordId) await fetchCharacters(activeDiscordId);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Não foi possível executar a ação.");
    } finally {
      setActionLoading(null);
    }
  }, [confirmAction, selected, activeDiscordId, fetchCharacters]);

  /* ========= Render ========= */

  const slots = useMemo<(CharacterRecord | null)[]>(
    () => Array.from({ length: 4 }, (_, i) => visibleCharacters[i] ?? null),
    [visibleCharacters]
  );

  const showEmptyState = !loading && characters.length === 0;

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <UserCircle2 className="w-4 h-4" />
          <span>Dashboard do jogador</span>
        </div>
        <h1 className="text-3xl font-semibold">Personagens</h1>
        <p className="max-w-2xl text-sm text-white/70 leading-relaxed">
          Estas são as personagens que estão disponíveis. Liga a tua conta do Discord para veres as tuas
          personagens automaticamente associadas.
        </p>
      </header>

      {/* Barra de utilidade */}
      <section className="border border-white/10 bg-[#0f1013] p-5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {!activeDiscordId && autoFilled && (
            <button
              type="button"
              onClick={signInDiscord}
              className={`inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] rounded-lg ${RING}`}
            >
              <UserCircle2 className="w-4 h-4" />
              Associar jogador (Discord)
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 border border-[#3a1a1a] bg-[#1f1212] rounded-lg px-4 py-3 text-sm text-[#fca5a5]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
          <UltraSpinner size={84} label="A carregar personagens..." />
        </div>
      ) : showEmptyState ? (
        <div className="border border-white/10 bg-[#0f1013] rounded-xl p-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-white/12 rounded-full">
            <UserCircle2 className="w-7 h-7 text-white/60" />
          </div>
          <h3 className="text-lg font-medium">Nenhuma personagem encontrada</h3>
          <p className="text-sm text-white/70 max-w-lg mx-auto">
            Liga a tua conta do Discord para associarmos o teu jogador.
          </p>
          <button
            type="button"
            onClick={signInDiscord}
            className={`inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] rounded-lg ${RING}`}
          >
            <UserCircle2 className="w-4 h-4" />
            Associar jogador (Discord)
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot, idx) =>
            slot ? (
              <CharacterCardCompact
                key={slot.id}
                item={slot}
                active={slot.id === selected?.id}
                onSelect={setSelected}
                onAction={handleAction}
                onOpenFines={openFinesModal}
                busyAction={actionLoading}
              />
            ) : (
              <VipSlotCard key={`vip-${idx}`} index={idx} onBuy={openVip} />
            )
          )}
        </div>
      )}

      {/* Mensagens de ação */}
      {actionMessage && (
        <div className="border border-white/10 bg-[#0f1013] rounded-xl px-4 py-3 text-xs text-white/70">
          {actionMessage}
        </div>
      )}

      {/* Modal de Multas */}
      <FinesModal
        open={finesOpen}
        onClose={() => setFinesOpen(false)}
        onConfirmWipe={confirmWipeSelectedFines}
        loading={finesLoading}
        fines={fines}
        selectedIds={selectedFineIds}
        toggleSelect={toggleFine}
      />

      {/* Modal genérico de confirmação */}
      {confirmAction && (
        <ConfirmActionModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmGenericActionNow}
          action={confirmAction}
          target={selected}
        />
      )}
    </div>
  );
}

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
};

const ACTIONS: ActionItem[] = [
  {
    id: "ck",
    label: "Dar CK",
    description: "Marca a personagem como CK e executa rotinas de limpeza.",
    confirm: "Tens a certeza que queres dar CK a esta personagem? Esta ação é irreversível.",
  },
  {
    id: "wipe_fines",
    label: "Perdoar multas",
    description: "Limpa multas pendentes associadas à personagem.",
    confirm: "Confirmas que pretendes perdoar todas as multas desta personagem?",
  },
  {
    id: "reset_inventory",
    label: "Limpar inventário",
    description: "Remove todo o conteúdo do inventário (inclui cofres pessoais).",
    confirm: "Esta ação limpa completamente o inventário. Continuar?",
  },
  {
    id: "refresh_stats",
    label: "Recalcular stats",
    description: "Atualiza estatísticas e caches desta personagem.",
  },
];

const FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

/* =========================
   Helpers
========================= */
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

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  });
}

function prettifyDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT");
}

/* =========================
   Cards
========================= */
function CharacterCardCompact({
  item,
  active,
  onSelect,
  onAction,
  busyAction,
}: {
  item: CharacterRecord;
  active: boolean;
  onSelect: (c: CharacterRecord) => void;
  onAction: (action: ActionItem, c: CharacterRecord) => void;
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
          <span className="text-sm font-semibold text-white">{formatCurrency(item.cash as number)}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Banco</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(item.bank as number)}</span>
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
          <span className="text-white/90 truncate">{prettifyDate(item.last_played as string)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Criada em</span>
          <span className="text-white/90 truncate">{prettifyDate(item.created_at as string)}</span>
        </div>
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
          onClick={() => onAction(ACTIONS.find(a => a.id==="wipe_fines")!, item)}
          className={`col-span-1 inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 ${RING}`}
          disabled={busyAction === "wipe_fines"}
        >
          {busyAction === "wipe_fines" ? <UltraSpinner size={16} /> : <ShieldCheck className="w-4 h-4" />}
          Multas
        </button>

        <button
          type="button"
          onClick={() => onAction(ACTIONS.find(a => a.id==="ck")!, item)}
          className={`col-span-1 inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${RING}`}
          disabled={busyAction === "ck"}
        >
          {busyAction === "ck" ? <UltraSpinner size={16} /> : <Swords className="w-4 h-4" />}
          CK
        </button>

        <button
          type="button"
          onClick={() => onAction(ACTIONS.find(a => a.id==="reset_inventory")!, item)}
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

  const handleAction = useCallback(
    async (action: ActionItem, c: CharacterRecord) => {
      if (action.confirm && !window.confirm(action.confirm)) return;
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
    []
  );

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
          Mostramos até 4 slots. Em desktop, os quatro aparecem lado a lado.
        </p>
      </header>

      {/* Barra de utilidade */}
      <section className="border border-white/10 bg-[#0f1013] p-5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={() => activeDiscordId && fetchCharacters(activeDiscordId)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 border border-white/12 text-sm uppercase tracking-[0.2em] hover:border-white/30 rounded-lg ${RING}`}
            disabled={!activeDiscordId || loading}
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>

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
    </div>
  );
}

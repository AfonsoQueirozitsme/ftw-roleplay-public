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
  UserCircle2,
  Crown,
  Lock,
  Check,
  X,
  Swords,
  Wrench,
  Gauge,
  ReceiptText,
  Info,
  Package,
  FolderOpenDot,
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
  id: "ck" | "reset_inventory" | "refresh_stats" | "wipe_fines";
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
  },
  {
    id: "wipe_fines",
    label: "Perdoar multas",
    description: "Seleciona na aba “Multas” quais queres perdoar e confirma.",
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
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className={`w-full ${wide ? "max-w-6xl" : "max-w-xl"} rounded-2xl border border-white/12 bg-[#0f1013] shadow-2xl`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="text-base font-semibold text-white">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center justify-center rounded-md p-2 text-white/70 hover:text-white ${RING}`}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-0">{children}</div>
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
   Cartão de personagem (apenas Selecionar)
========================= */
function CharacterCardCompact({
  item,
  active,
  onSelect,
}: {
  item: CharacterRecord;
  active: boolean;
  onSelect: (c: CharacterRecord) => void;
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

      {/* Único botão */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`w-full inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs text-white/90 hover:border-white/30 rounded-lg ${RING}`}
        aria-pressed={active}
      >
        <UserCircle2 className="w-4 h-4" />
        Selecionar
      </button>
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
   Modal grande com tabs + barra lateral de ações
========================= */
type TabKey = "geral" | "faturas" | "inventario" | "multas";

function DetailsModal({
  open,
  onClose,
  character,
  onRunAction,
  loadFines,
  fines,
  finesLoading,
  selectedFineIds,
  toggleFine,
}: {
  open: boolean;
  onClose: () => void;
  character: CharacterRecord;
  onRunAction: (action: ActionItem) => void;
  loadFines: (characterId: string) => Promise<void>;
  fines: FineRow[];
  finesLoading: boolean;
  selectedFineIds: Set<string>;
  toggleFine: (id: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("geral");

  useEffect(() => {
    if (!open) return;
    if (tab === "multas") {
      void loadFines(character.id);
    }
  }, [open, tab, character.id, loadFines]);

  const selectedFines = fines.filter((f) => selectedFineIds.has(f.id));
  const totalSelected = selectedFines.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      wide
      title={
        <div className="flex items-center gap-3">
          <img
            src={(character.avatar_url as string | undefined) ?? FALLBACK_AVATAR}
            className="w-8 h-8 rounded-full border border-white/10 object-cover"
            onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_AVATAR)}
          />
          <div className="flex flex-col">
            <span className="font-semibold">{character.name}</span>
            <span className="text-xs text-white/60">
              {character.job ? `${character.job}${character.job_grade ? ` — ${character.job_grade}` : ""}` : "Sem emprego"}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex">
        {/* Sidebar de ações */}
        <aside className="w-[240px] border-r border-white/10 p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2">Ações</div>
          {ACTIONS.map((a) => {
            const Icon =
              a.id === "ck" ? Swords : a.id === "reset_inventory" ? Wrench : a.id === "refresh_stats" ? Gauge : ReceiptText;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => (a.id === "wipe_fines" ? setTab("multas") : onRunAction(a))}
                className={`w-full inline-flex items-center justify-start gap-2 border border-white/12 px-3 py-2 text-sm text-white/90 hover:border-white/30 rounded-lg ${RING}`}
              >
                <Icon className="w-4 h-4" />
                <span>{a.label}</span>
              </button>
            );
          })}

          {/* Resumo compacto */}
          <div className="mt-4 text-xs space-y-1 border-t border-white/10 pt-3">
            <div className="flex justify-between">
              <span className="text-white/60">Cash</span>
              <span className="text-white tabular-nums">{formatMoney(character.cash as number)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Banco</span>
              <span className="text-white tabular-nums">{formatMoney(character.bank as number)}</span>
            </div>
            {(character as any)?.license && (
              <div className="flex justify-between">
                <span className="text-white/60">License</span>
                <span className="text-white/90">{maskLicense((character as any).license as string)}</span>
              </div>
            )}
            {(character as any)?.discordid && (
              <div className="flex justify-between">
                <span className="text-white/60">Discord</span>
                <span className="text-white/90">{maskDiscordId((character as any).discordid as string)}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Content */}
        <section className="flex-1">
          {/* Tabs header */}
          <div className="border-b border-white/10 px-4">
            <nav className="flex gap-1">
              {([
                { key: "geral", label: "Geral", Icon: Info },
                { key: "faturas", label: "Faturas", Icon: FolderOpenDot },
                { key: "inventario", label: "Inventário", Icon: Package },
                { key: "multas", label: "Multas", Icon: ReceiptText },
              ] as { key: TabKey; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative px-4 py-3 text-sm ${tab === key ? "text-white" : "text-white/60 hover:text-white/90"}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                  {tab === key && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#e53e30] rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {tab === "geral" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60 mb-2">Identificação</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Nome</span>
                      <span className="text-white/90">{character.name}</span>
                    </div>
                    {(character as any)?.citizenid && (
                      <div className="flex justify-between">
                        <span className="text-white/60">CitizenID</span>
                        <span className="text-white/90">{(character as any).citizenid}</span>
                      </div>
                    )}
                    {(character as any)?.license && (
                      <div className="flex justify-between">
                        <span className="text-white/60">License</span>
                        <span className="text-white/90">{maskLicense((character as any).license as string)}</span>
                      </div>
                    )}
                    {(character as any)?.discordid && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Discord</span>
                        <span className="text-white/90">{maskDiscordId((character as any).discordid as string)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60 mb-2">Estado</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Job</span>
                      <span className="text-white/90">
                        {character.job ? `${character.job}${character.job_grade ? ` — ${character.job_grade}` : ""}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Gang</span>
                      <span className="text-white/90">{character.gang ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Última atividade</span>
                      <span className="text-white/90">{formatDate(character.last_played as string)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Criada em</span>
                      <span className="text-white/90">{formatDate(character.created_at as string)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-4 bg-white/5 md:col-span-2">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60 mb-2">Financeiro</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-[#0f1013] p-3">
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Cash</span>
                      <span className="text-base font-semibold text-white tabular-nums">{formatMoney(character.cash as number)}</span>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0f1013] p-3">
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Banco</span>
                      <span className="text-base font-semibold text-white tabular-nums">{formatMoney(character.bank as number)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "faturas" && (
              <div className="rounded-xl border border-white/10 p-6 bg-white/5 text-white/80">
                <p className="text-sm">
                  Aqui podes listar as faturas/recibos desta personagem (integrar com a tua função quando estiver pronta).
                </p>
              </div>
            )}

            {tab === "inventario" && (
              <div className="rounded-xl border border-white/10 p-6 bg-white/5 text-white/80">
                <p className="text-sm">
                  Mostra o inventário e cofres. Assim que houver endpoint, mapeia aqui (podes também paginar/filtrar).
                </p>
              </div>
            )}

            {tab === "multas" && (
              <div className="space-y-4">
                {finesLoading ? (
                  <div className="py-10 grid place-items-center">
                    <UltraSpinner size={48} label="A carregar multas..." />
                  </div>
                ) : fines.length === 0 ? (
                  <div className="p-3 text-sm text-white/70 rounded-xl border border-white/10 bg-white/5">
                    Sem multas por agora.
                  </div>
                ) : (
                  <>
                    <div className="max-h-[50vh] overflow-auto rounded-xl border border-white/10 bg-[#0f1013]">
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
                                  checked={selectedFineIds.has(f.id)}
                                  onChange={() => toggleFine(f.id)}
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

                    {/* Resumo e ação */}
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Selecionadas</span>
                        <span className="text-white/90 font-semibold">{selectedFines.length}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-white/80">Total a perdoar</span>
                        <span className="text-white font-semibold tabular-nums">{formatMoney(totalSelected)}</span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={selectedFines.length === 0}
                          onClick={() => onRunAction({ id: "wipe_fines", label: "Perdoar multas", description: "" })}
                          className={`inline-flex items-center gap-2 bg-[#e53e30] text-[#151515] px-4 py-2 text-sm font-semibold rounded-md ${RING} disabled:opacity-50`}
                        >
                          <Check className="w-4 h-4" />
                          Perdoar selecionadas
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
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
  const [fines, setFines] = useState<FineRow[]>([]);
  const [finesLoading, setFinesLoading] = useState(false);
  const [selectedFineIds, setSelectedFineIds] = useState<Set<string>>(new Set());

  // modal genérico de confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionItem | null>(null);

  // modal detalhes
  const [detailsOpen, setDetailsOpen] = useState(false);

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
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("Erro ao obter usuário:", error);
        setAutoFilled(true);
        return;
      }
      const autoId = extractDiscordId(data.user as any);
      if (autoId) {
        setActiveDiscordId(autoId);
      } else {
        console.debug("Nenhum Discord ID encontrado no usuário autenticado");
      }
      setAutoFilled(true);
    } catch (err) {
      console.error("Erro ao inicializar Discord ID:", err);
      setAutoFilled(true);
    }
  }, []);

  const fetchCharacters = useCallback(
    async (discordId: string) => {
      if (!discordId || !discordId.trim()) {
        setError("Discord ID inválido");
        setCharacters([]);
        setSelected(null);
        return;
      }

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
        if (data.length === 0) {
          setError("Nenhuma personagem encontrada para este Discord ID.");
        }
      } catch (err) {
        console.error("Erro ao buscar personagens:", err);
        setCharacters([]);
        setSelected(null);
        setError(err instanceof Error ? err.message : "Falha ao carregar personagens. Verifica a tua ligação ao servidor.");
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
      if (!characterId) {
        setFines([]);
        return;
      }

      setFinesLoading(true);
      setSelectedFineIds(new Set());
      setFines([]);
      try {
        const base = import.meta.env.VITE_SUPABASE_URL as string;
        if (!base) {
          throw new Error("VITE_SUPABASE_URL não configurado");
        }
        const url = `${base}/functions/v1/players/${encodeURIComponent(characterId)}/fines`;
        const headers = await authHeaders();
        const res = await fetch(url, { headers, method: "GET" });
        
        if (!res.ok) {
          if (res.status === 404) {
            // Endpoint não existe ou personagem não tem multas
            setFines([]);
            return;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const payload = (await res.json()) as { data?: FineRow[] } | FineRow[];
        const list = Array.isArray(payload) ? payload : payload.data ?? [];
        setFines(
          list.map((f) => ({
            id: String(f.id),
            code: f.code ?? null,
            reason: f.reason || "Sem motivo especificado",
            amount: Number(f.amount) || 0,
            issued_at: f.issued_at ?? null,
            status: f.status ?? "unpaid",
          }))
        );
      } catch (e) {
        console.warn("Falha a obter multas:", e);
        // Não mostra erro ao usuário, apenas deixa a lista vazia
        setFines([]);
      } finally {
        setFinesLoading(false);
      }
    },
    []
  );

  /* ========= Execução de ações ========= */

  // Ação chamada via barra lateral OU botão de perdoar na aba Multas
  const runAction = useCallback(
    async (action: ActionItem) => {
      if (!selected) return;

      // Se for wipe_fines vindo da aba Multas, reunimos a seleção e confirmamos aqui
      if (action.id === "wipe_fines") {
        const chosen = fines.filter((f) => selectedFineIds.has(f.id));
        if (chosen.length === 0) return;

        const total = chosen.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
        const ok = window.confirm(
          `Vais perdoar ${chosen.length} multa(s) no total de ${formatMoney(total)}. Confirmas?`
        );
        if (!ok) return;

        setActionLoading("wipe_fines");
        setActionMessage(null);
        try {
          const res = await performCharacterAction(selected.id, "wipe_fines", {
            fineIds: chosen.map((f) => f.id),
            totalAmount: total,
          });
          setActionMessage(res.message ?? "Multas perdoadas com sucesso.");
          // refrescar dados se necessário
          if (activeDiscordId) await fetchCharacters(activeDiscordId);
          // limpar seleção
          setSelectedFineIds(new Set());
          await loadFines(selected.id);
        } catch (err) {
          setActionMessage(err instanceof Error ? err.message : "Não foi possível perdoar as multas.");
        } finally {
          setActionLoading(null);
        }
        return;
      }

      // Para ações com confirmação/custo, abrimos modal de confirmação
      if (action.confirm || typeof action.cost === "number") {
        setConfirmAction(action);
        setConfirmOpen(true);
        return;
      }

      // Ações simples (ex.: refresh_stats sem custo/confirm)
      setActionLoading(action.id);
      setActionMessage(null);
      try {
        const response = await performCharacterAction(selected.id, action.id);
        setActionMessage(response.message ?? "Ação enviada para o backend.");
        if (activeDiscordId) await fetchCharacters(activeDiscordId);
      } catch (err) {
        setActionMessage(err instanceof Error ? err.message : "Não foi possível executar a ação.");
      } finally {
        setActionLoading(null);
      }
    },
    [selected, selectedFineIds, fines, activeDiscordId, fetchCharacters, loadFines]
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

      {/* Barra de utilidade mínima */}
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
                onSelect={(c) => {
                  setSelected(c);
                  setDetailsOpen(true);
                }}
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

      {/* Modal Detalhes (abas + ações) */}
      {selected && (
        <DetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          character={selected}
          onRunAction={runAction}
          loadFines={loadFines}
          fines={fines}
          finesLoading={finesLoading}
          selectedFineIds={selectedFineIds}
          toggleFine={toggleFine}
        />
      )}

      {/* Modal genérico de confirmação (CK / Limpar inventário / Recalcular stats se quiseres confirmar) */}
      {confirmAction && selected && (
        <ModalShell
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={`Confirmar: ${confirmAction.label}`}
        >
          <div className="p-4">
            <div className="space-y-3 text-sm text-white/80">
              <p className="text-white/70">{confirmAction.description}</p>
              <p>
                Personagem: <span className="font-semibold text-white">{selected.name}</span>
              </p>
              {typeof confirmAction.cost === "number" && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-white/80">
                    <span>Custo da operação</span>
                    <span className="font-semibold tabular-nums">{formatMoney(confirmAction.cost)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4">
              <ConfirmBar
                onCancel={() => setConfirmOpen(false)}
                onConfirm={confirmGenericActionNow}
                disabled={actionLoading === confirmAction.id}
                loading={actionLoading === confirmAction.id}
              />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

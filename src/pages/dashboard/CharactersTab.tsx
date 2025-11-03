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
  ArrowLeft,
  Database,
  RefreshCcw,
  ShieldCheck,
  Swords,
  UserCircle2,
} from "lucide-react";

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
    description: "Marca a personagem como CK e executa as rotinas de limpeza.",
    confirm: "Tens a certeza que queres dar CK a esta personagem? Esta acao e irreversivel.",
  },
  {
    id: "wipe_fines",
    label: "Perdoar multas",
    description: "Limpa multas pendentes associadas a personagem.",
    confirm: "Confirmas que pretendes perdoar todas as multas desta personagem?",
  },
  {
    id: "reset_inventory",
    label: "Limpar inventario",
    description: "Remove todo o conteudo do inventario (inclui cofres pessoais).",
    confirm: "Esta acao limpa completamente o inventario. Continuar?",
  },
  {
    id: "refresh_stats",
    label: "Recalcular stats",
    description: "Solicita ao backend um refresh de estatisticas e caches desta personagem.",
  },
];

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const CARD_BASE =
  "relative transition border border-[#2a2a2a] bg-[#1b1b1b] hover:border-[#e53e30]/60 hover:-translate-y-0.5";

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

const FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

function CharacterCard({
  item,
  active,
  onSelect,
}: {
  item: CharacterRecord;
  active: boolean;
  onSelect: (c: CharacterRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`${CARD_BASE} ${RING} ${
        active ? "border-[#e53e30] bg-[#202020]" : ""
      } rounded-none p-5 text-left w-full`}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={(item.avatar_url as string | undefined) ?? FALLBACK_AVATAR}
            alt={item.name}
            className="w-12 h-12 rounded-full border border-[#2f2f2f] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
            }}
          />
          <div>
            <h3 className="text-lg font-semibold text-[#fbfbfb]">{item.name}</h3>
            <p className="text-sm text-[#a0a0a0]">
              {item.job ? `${item.job}${item.job_grade ? ` - ${item.job_grade}` : ""}` : "Sem emprego"}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-[#a0a0a0]">
          <span className="block uppercase text-xs tracking-wider text-[#6c6c6c]">Banco</span>
          <span className="text-[#fbfbfb] font-medium">{formatCurrency(item.bank as number | undefined)}</span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[#6c6c6c] uppercase text-xs tracking-wide">Gang</dt>
          <dd className="text-[#fbfbfb]">{item.gang ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-[#6c6c6c] uppercase text-xs tracking-wide">Ultima atividade</dt>
          <dd className="text-[#fbfbfb]">
            {item.last_played ? prettifyDate(item.last_played as string) : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6c6c6c] uppercase text-xs tracking-wide">Cash</dt>
          <dd className="text-[#fbfbfb]">{formatCurrency(item.cash as number | undefined)}</dd>
        </div>
        <div>
          <dt className="text-[#6c6c6c] uppercase text-xs tracking-wide">Criada em</dt>
          <dd className="text-[#fbfbfb]">
            {item.created_at ? prettifyDate(item.created_at as string) : "-"}
          </dd>
        </div>
      </dl>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#2a2a2a] py-3 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.15em] text-[#6c6c6c]">{label}</span>
      <span className="text-sm text-[#fbfbfb] text-right break-words max-w-xs">{value ?? "-"}</span>
    </div>
  );
}

function renderMetadata(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return null;
  const entries = Object.entries(meta).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!entries.length) return null;
  return (
    <div className="mt-6">
      <h4 className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c] mb-2">Campos adicionais</h4>
      <div className="grid gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-[#a0a0a0]">{key}</span>
            <span className="text-[#fbfbfb] text-right break-words max-w-xs">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CharactersTab() {
  const [input, setInput] = useState("");
  const [activeDiscordId, setActiveDiscordId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [selected, setSelected] = useState<CharacterRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const visibleCharacters = useMemo(() => characters.slice(0, 4), [characters]);

  const bootstrapDiscordId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const autoId = extractDiscordId(data.user as any);
    if (autoId && !autoFilled) {
      setInput(autoId);
      setActiveDiscordId(autoId);
      setAutoFilled(true);
    } else if (!autoId) {
      setAutoFilled(true);
    }
  }, [autoFilled]);

  useEffect(() => {
    void bootstrapDiscordId();
  }, [bootstrapDiscordId]);

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
    if (activeDiscordId) {
      void fetchCharacters(activeDiscordId);
    }
  }, [activeDiscordId, fetchCharacters]);

  const handleManualSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) {
        setError("Insere um Discord ID valido para procurarmos as personagens.");
        return;
      }
      setActiveDiscordId(trimmed);
    },
    [input]
  );

  const handleAction = useCallback(
    async (action: ActionItem) => {
      if (!selected) return;
      if (action.confirm && !window.confirm(action.confirm)) return;
      setActionLoading(action.id);
      setActionMessage(null);
      try {
        const response = await performCharacterAction(selected.id, action.id);
        setActionMessage(response.message ?? "Acao enviada para o backend.");
      } catch (err) {
        setActionMessage(err instanceof Error ? err.message : "Nao foi possivel executar a acao.");
      } finally {
        setActionLoading(null);
      }
    },
    [selected]
  );

  const showEmptyState = !loading && !visibleCharacters.length;

  return (
    <div className="space-y-8 text-[#fbfbfb]" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-[#6c6c6c]">
          <UserCircle2 className="w-4 h-4" />
          <span>Dashboard do jogador</span>
        </div>
        <h1 className="text-3xl font-semibold">Personagens</h1>
        <p className="max-w-2xl text-sm text-[#a0a0a0] leading-relaxed">
          Consulta e gere todas as tuas personagens diretamente a partir da base de dados do servidor. Esta lista e
          filtrada pelo teu Discord ID. Caso nao seja detetado automaticamente, insere-o manualmente para carregarmos os
          dados corretos.
        </p>
      </header>

  <section className="border border-[#2a2a2a] bg-[#161616] p-6 space-y-4">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label htmlFor="discordId" className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c] block">
            Discord ID
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="discordId"
              name="discordId"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: 123456789012345678"
              className="w-full bg-[#101010] border border-[#2a2a2a] px-4 py-3 text-sm text-[#fbfbfb] placeholder:text-[#4f4f4f] focus:border-[#e53e30] transition"
            />
            <div className="flex gap-2 sm:w-auto w-full">
              <button
                type="submit"
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#e53e30] text-[#151515] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-[#f25d51] ${RING}`}
              >
                <Database className="w-4 h-4" />
                <span>Pesquisar</span>
              </button>
              <button
                type="button"
                onClick={() => activeDiscordId && fetchCharacters(activeDiscordId)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 border border-[#2a2a2a] text-sm uppercase tracking-[0.2em] transition hover:border-[#e53e30] ${RING}`}
                disabled={!activeDiscordId || loading}
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </form>
        {!activeDiscordId && autoFilled && (
          <div className="rounded-none border border-dashed border-[#2a2a2a] bg-[#141414] p-4 text-sm text-[#a0a0a0] leading-relaxed">
            Nao foi possivel encontrar o teu Discord ID na sessao atual. Confirma se fizeste login com a conta correta
            ou introduz manualmente o ID acima.
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 border border-[#3a1a1a] bg-[#1f1212] px-4 py-3 text-sm text-[#fca5a5]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {loading ? (
        <div className="py-20 grid place-items-center border border-[#2a2a2a] bg-[#161616]">
          <UltraSpinner size={84} label="A carregar personagens..." />
        </div>
      ) : showEmptyState ? (
        <div className="border border-[#2a2a2a] bg-[#161616] p-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-[#2a2a2a] rounded-full">
            <ArrowLeft className="w-7 h-7 text-[#6c6c6c]" />
          </div>
          <h3 className="text-lg font-medium">Nenhuma personagem encontrada</h3>
          <p className="text-sm text-[#a0a0a0] max-w-lg mx-auto">
            Nao localizamos personagens associadas a este Discord ID. Confirma o valor inserido ou tenta novamente mais
            tarde.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(340px,360px)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                item={character}
                active={selected?.id === character.id}
                onSelect={setSelected}
              />
            ))}
          </div>

          <aside className="border border-[#2a2a2a] bg-[#161616] p-6 flex flex-col gap-6">
            {selected ? (
              <>
                <div className="flex items-center gap-4">
                  <img
                    src={(selected.avatar_url as string | undefined) ?? FALLBACK_AVATAR}
                    alt={selected.name}
                    className="w-16 h-16 rounded-full border border-[#2f2f2f] object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-semibold">{selected.name}</h2>
                    <p className="text-sm text-[#a0a0a0]">
                      {selected.job ? `${selected.job}${selected.job_grade ? ` - ${selected.job_grade}` : ""}` : "Sem emprego"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c]">Resumo financeiro</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-[#2a2a2a] bg-[#1b1b1b] p-4">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c]">Cash</span>
                      <p className="mt-2 text-lg font-semibold">
                        {formatCurrency(selected.cash as number | undefined)}
                      </p>
                    </div>
                    <div className="border border-[#2a2a2a] bg-[#1b1b1b] p-4">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c]">Banco</span>
                      <p className="mt-2 text-lg font-semibold">
                        {formatCurrency(selected.bank as number | undefined)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-[#6c6c6c] mb-2">Detalhes</h3>
                  <div className="border border-[#2a2a2a] bg-[#1b1b1b]">
                    <DetailRow label="Discord ID" value={activeDiscordId} />
                    <DetailRow label="Gang" value={selected.gang ?? "Sem gang"} />
                    <DetailRow label="Criada em" value={prettifyDate(selected.created_at as string | undefined)} />
                    <DetailRow label="Ultima sessao" value={prettifyDate(selected.updated_at as string | undefined)} />
                    <DetailRow label="Ultimo login" value={prettifyDate(selected.last_played as string | undefined)} />
                  </div>
                  {renderMetadata((selected.metadata as Record<string, unknown>) ?? null)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6c6c6c]">
                    <Swords className="w-4 h-4" />
                    <span>Acoes rapidas</span>
                  </div>
                  <div className="grid gap-3">
                    {ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => void handleAction(action)}
                        disabled={!!actionLoading}
                        className={`w-full text-left border border-[#2a2a2a] bg-[#1b1b1b] hover:border-[#e53e30]/70 transition px-4 py-3 ${RING} ${
                          actionLoading === action.id ? "opacity-60 cursor-wait" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[#fbfbfb] uppercase tracking-[0.15em]">
                            {action.label}
                          </span>
                          {actionLoading === action.id ? (
                            <UltraSpinner size={20} />
                          ) : action.id === "ck" ? (
                            <Swords className="w-4 h-4 text-[#e53e30]" />
                          ) : action.id === "refresh_stats" ? (
                            <RefreshCcw className="w-4 h-4 text-[#fbfbfb]" />
                          ) : action.id === "wipe_fines" ? (
                            <ShieldCheck className="w-4 h-4 text-[#fbfbfb]" />
                          ) : (
                            <UserCircle2 className="w-4 h-4 text-[#fbfbfb]" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#a0a0a0] leading-relaxed">{action.description}</p>
                      </button>
                    ))}
                  </div>
                  {actionMessage && (
                    <div className="border border-[#2a2a2a] bg-[#1b1b1b] px-4 py-3 text-xs text-[#a0a0a0]">
                      {actionMessage}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-center py-20 text-[#a0a0a0]">
                <UserCircle2 className="w-10 h-10" />
                <p className="text-sm">Seleciona uma personagem para veres os detalhes.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

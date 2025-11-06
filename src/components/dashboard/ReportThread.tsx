// /src/pages/dashboard/components/ReportThread.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import UltraSpinner from "@/components/layout/Spinner";

type Msg = {
  id: string;
  report_id: string;
  user_id: string | null;
  body: string;
  is_staff: boolean;
  created_at: string;
  attachments?: { id: string; file_path: string; mime_type: string | null }[];
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";
const HIDE_SCROLL =
  "overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/* ───────────────────────────────
   Data relativa em PT (sem gerúndio)
   ─────────────────────────────── */
function relTimePT(dateIso: string) {
  const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
  const now = Date.now();
  const t = new Date(dateIso).getTime();
  const diffMs = t - now;

  const abs = Math.abs(diffMs);
  const table: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  for (const [unit, ms] of table) {
    if (abs >= ms || unit === "second") {
      const value = Math.round(diffMs / ms);
      // rtf devolve “há X ...” automaticamente para negativos
      return rtf.format(value, unit)
        .replace(/^em /, "daqui a "); // coerência para futuro
    }
  }
  return "agora";
}

/* ───────────────────────────────
   Mensagem / Anexo UI
   ─────────────────────────────── */
function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  const cls =
    tone === "accent"
      ? "px-2 py-0.5 text-[11px] rounded-full bg-[#e53e30]/20 text-[#e53e30] border border-[#e53e30]/40"
      : "px-2 py-0.5 text-[11px] rounded-full bg-white/10 text-white/80 border border-white/20";
  return <span className={cls}>{children}</span>;
}

function AttachmentLink({
  path,
  getUrl,
}: {
  path: string;
  getUrl: (p: string) => Promise<string>;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const url = await getUrl(path);
      if (alive) setHref(url);
    })();
    return () => {
      alive = false;
    };
  }, [path]);

  const name = useMemo(() => path.split("/").pop() || "ficheiro", [path]);

  return href ? (
    <a
      className="text-xs px-3 py-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 transition underline-offset-2"
      href={href}
      target="_blank"
      rel="noreferrer"
      title={name}
    >
      {name}
    </a>
  ) : (
    <div className="px-3 py-1 rounded-full border border-white/20 bg-white/10">
      <UltraSpinner size={18} />
    </div>
  );
}

/* ───────────────────────────────
   Componente principal
   ─────────────────────────────── */
export default function ReportThread({
  reportId,
  onReload,
}: {
  reportId: string;
  onReload?: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("report_messages")
      .select("*, attachments:report_attachments(id,file_path,mime_type)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (!error) {
      setMsgs((data as any) || []);
      // scroll para o fim
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
    setLoading(false);
  }

  /* carregar e subscrever em tempo real */
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`report_thread_${reportId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_messages", filter: `report_id=eq.${reportId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_attachments" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function send() {
    if (sending) return;
    if (!text.trim() && (!files || files.length === 0)) return;

    setSending(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id ?? null;

      const { data: msg, error } = await supabase
        .from("report_messages")
        .insert([{ report_id: reportId, user_id: uid, body: text.trim() }])
        .select()
        .single();

      if (error || !msg) throw error || new Error("Falha ao criar mensagem");

      // upload anexos
      if (files && files.length > 0) {
        for (const f of Array.from(files)) {
          const key = `report-attachments/${msg.id}/${crypto.randomUUID()}-${f.name}`;
          const up = await supabase.storage.from("report-attachments").upload(key, f, {
            contentType: f.type,
            upsert: false,
          });
          if (!up.error) {
            await supabase.from("report_attachments").insert([
              {
                message_id: msg.id,
                file_path: key,
                mime_type: f.type,
                size_bytes: f.size,
              },
            ]);
          }
        }
      }

      setText("");
      setFiles(null);
      await load();
      onReload?.();
    } catch (e) {
      console.error(e);
      alert("Não foi possível enviar a mensagem. Tenta de novo.");
    } finally {
      setSending(false);
    }
  }

  async function getSignedUrl(path: string) {
    const { data } = await supabase.storage.from("report-attachments").createSignedUrl(path, 60 * 5);
    return data?.signedUrl ?? "#";
  }

  return (
    <div className="rounded-2xl p-6 bg-white/10 border border-white/15">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Conversa</h3>
        {/* pill de contagem */}
        <Pill tone="neutral">{msgs.length} mensagens</Pill>
      </div>

      {/* Lista de mensagens */}
      <div
        ref={listRef}
        className={`space-y-4 max-h-[46vh] md:max-h-[52vh] ${HIDE_SCROLL} pr-1`}
      >
        {loading ? (
          <div className="w-full py-12 grid place-items-center">
            <UltraSpinner size={64} label="A carregar…" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="opacity-80 text-sm py-8 text-center">
            Ainda não há mensagens neste ticket.
          </div>
        ) : (
          msgs.map((m) => (
            <div
              key={m.id}
              className={
                "p-3 rounded-xl border " +
                (m.is_staff
                  ? "bg-[#151515] border-[#6c6c6c]"
                  : "bg-[#e53e30] text-[#151515] border-[#e53e30]")
              }
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Pill tone={m.is_staff ? "accent" : "neutral"}>{m.is_staff ? "Staff" : "Tu"}</Pill>
                  <span className={"text-xs " + (m.is_staff ? "text-white/70" : "text-black/70")}>
                    {relTimePT(m.created_at)}
                  </span>
                </div>
              </div>

              <div className={"whitespace-pre-wrap text-sm " + (m.is_staff ? "text-white/95" : "text-black/90")}>
                {m.body || <span className="inline-flex items-center gap-2"><UltraSpinner size={16} /> </span>}
              </div>

              {m.attachments && m.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <AttachmentLink key={a.id} path={a.file_path} getUrl={getSignedUrl} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input + Anexos */}
      <div className="mt-4 flex flex-col gap-3">
        <textarea
          className={`w-full px-4 py-3 rounded-lg bg-black/30 border border-white/15 ${RING}`}
          rows={3}
          placeholder="Escreve a tua resposta…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="text-xs file:mr-3 file:px-3 file:py-1.5 file:border file:border-white/20 file:bg-white/10 file:text-white/80 file:rounded-full file:hover:bg-white/15 file:transition"
          />
          <button
            onClick={send}
            disabled={sending || (!text.trim() && (!files || files.length === 0))}
            className={`px-5 py-3 rounded-xl font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 disabled:opacity-60 ${RING}`}
          >
            {sending ? "A enviar…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

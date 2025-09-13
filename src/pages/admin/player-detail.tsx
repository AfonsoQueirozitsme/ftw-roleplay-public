// src/pages/admin/players/[ref].tsx (ou onde tiveres o PlayerDetailPage)
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayer, patchPlayer, listOnlinePlayers, PlayerMini } from "@/lib/api/players";
import TabNav from "@/components/admin/player/TabNav";
import PlayersTab from "@/components/admin/player/PlayersTab";
import PropertiesTab from "@/components/admin/player/PropertiesTab";
import GarageTab from "@/components/admin/player/GarageTab";
import BankTab from "@/components/admin/player/BankTab";
import { Spinner } from "@/components/admin/player/player-common";

/* Helpers UI */
function Badge({ children, color = "white/10", text = "white/80" }: { children: React.ReactNode; color?: string; text?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-${color} text-${text} text-xs`}>
      {children}
    </span>
  );
}
const pingClass = (p?: number | null) => {
  if (p == null) return "bg-white/30";
  if (p <= 80) return "bg-emerald-400";
  if (p <= 140) return "bg-amber-300";
  return "bg-rose-400";
};
function ActionBtn({
  children,
  onClick,
  tone = "neutral",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "warn" | "danger" | "ok";
  disabled?: boolean;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/10 hover:bg-white/15 text-white",
    warn: "bg-amber-300/90 hover:opacity-90 text-black",
    danger: "bg-rose-500/90 hover:opacity-90 text-white",
    ok: "bg-emerald-400/90 hover:opacity-90 text-black",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/* Online polling */
function useOnlineMatch(data: any | null) {
  const [list, setList] = useState<PlayerMini[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNow = async () => {
    try {
      setLoading(true);
      const rows = await listOnlinePlayers();
      setList(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: any;
    fetchNow();
    timer = setInterval(fetchNow, 6000);
    return () => clearInterval(timer);
  }, []);

  const match = useMemo(() => {
    if (!data) return null;
    const idStr = String(data.id ?? "");
    const license = data.license ?? null;
    const citizenid = data.citizenid ?? null;
    const name = (data.name ?? "").toString();

    return (
      list.find((p) => license && p.license && p.license === license) ||
      list.find((p) => citizenid && p.citizenid && p.citizenid === citizenid) ||
      list.find((p) => p.id && String(p.id) === idStr) ||
      list.find((p) => p.name && p.name === name) ||
      null
    );
  }, [list, data]);

  return { online: match, loading };
}

export default function PlayerDetailPage() {
  const { ref = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any | null>(null);
  const [orig, setOrig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [tab, setTab] = useState<"Players" | "Properties" | "Garage" | "Bank">("Players");

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    getPlayer(ref)
      .then((res) => { if (!alive) return; setData(res.data); setOrig(structuredClone(res.data)); })
      .catch((e) => setErro(e?.message ?? "Erro a carregar"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [ref]);

  const onPatch = async (patch: Record<string, any>) => {
    if (!data) return;
    const res = await patchPlayer(String(data.id), patch);
    setData(res.data);
    setOrig(structuredClone(res.data));
  };

  const { online, loading: onlineLoading } = useOnlineMatch(data);
  const isOnline = !!online;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <Spinner /> A carregar…
      </div>
    );
  }
  if (erro) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>
        <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/15" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Identidade */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center text-sm text-white/80">
              {String(data.name ?? "P").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xl md:text-2xl font-semibold">{data.name || "(sem nome)"}</h2>
                <Badge color={isOnline ? "emerald-400/20" : "white/10"} text={isOnline ? "emerald-200" : "white/70"}>
                  <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-white/50"}`} />
                  {isOnline ? "Online" : "Offline"}
                </Badge>
                <span className={`inline-block h-1.5 w-8 rounded-full ${pingClass(online?.ping)}`} title={isOnline && online?.ping != null ? `${online?.ping} ms` : "sem ping"} />
              </div>
              <div className="text-white/60 text-sm">
                ID #{data.id}
                {data.citizenid ? <> · CID {data.citizenid}</> : null}
                {data.license ? <> · LIC {data.license}</> : null}
                {" · Última atualização: "}
                {data.last_updated ? new Date(data.last_updated).toLocaleString("pt-PT") : "—"}
              </div>
            </div>
          </div>

          {/* Ações ao vivo */}
          <div className="flex flex-wrap items-center gap-2">
            {onlineLoading && <span className="inline-flex items-center gap-2 text-xs text-white/60"><Spinner /> a verificar estado…</span>}
            <ActionBtn tone="danger" disabled={!isOnline} onClick={() => alert("Banir (placeholder)")}>Banir</ActionBtn>
            <ActionBtn tone="warn" disabled={!isOnline} onClick={() => alert("Expulsar (placeholder)")}>Expulsar</ActionBtn>
            <ActionBtn tone="neutral" disabled={!isOnline} onClick={() => alert("Avisar (placeholder)")}>Avisar</ActionBtn>
            <ActionBtn tone="neutral" disabled={!isOnline} onClick={() => alert("Congelar (placeholder)")}>Congelar</ActionBtn>
          </div>
        </div>

        {/* Submeta (chips) */}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.phone_number && <Badge>📱 {data.phone_number}</Badge>}
          {data.job && <Badge>💼 {data.job?.label || data.job?.name || "job"}</Badge>}
          {data.gang && <Badge>🛡️ {data.gang?.label || data.gang?.name || "gang"}</Badge>}
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <TabNav tabs={["Players", "Properties", "Garage", "Bank"]} active={tab} onChange={(t) => setTab(t as any)} />
        </div>
      </div>

      {/* Conteúdo das tabs */}
      {tab === "Players"    && <PlayersTab data={data} orig={orig!} onPatch={onPatch} />}
      {tab === "Properties" && <PropertiesTab playerId={String(data.id)} />}
      {tab === "Garage"     && <GarageTab playerId={String(data.id)} />}
      {tab === "Bank"       && <BankTab playerId={String(data.id)} />}
    </div>
  );
}

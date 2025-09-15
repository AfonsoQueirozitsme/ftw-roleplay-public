// /src/pages/dashboard/components/ReportThread.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Msg = {
  id:string; report_id:string; user_id:string; body:string; is_staff:boolean; created_at:string;
  attachments?: { id:string; file_path:string; mime_type:string|null }[];
};

export default function ReportThread({ reportId, onReload }:{
  reportId:string; onReload?:()=>void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  async function load() {
    const { data } = await supabase.from("report_messages")
      .select("*, attachments:report_attachments(id,file_path,mime_type)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    setMsgs(data as any || []);
  }
  useEffect(()=>{ load(); }, [reportId]);

  async function send() {
    if (!text.trim() && (!files || files.length===0)) return;
    const { data: user } = await supabase.auth.getUser();
    const uid = user?.user?.id;
    const { data: msg, error } = await supabase.from("report_messages").insert([{
      report_id: reportId, user_id: uid, body: text.trim()
    }]).select().single();
    if (error) return;

    // upload anexos (cada ficheiro dentro de pasta do message_id)
    if (files && files.length > 0) {
      for (const f of Array.from(files)) {
        const key = `report-attachments/${msg.id}/${crypto.randomUUID()}-${f.name}`;
        const up = await supabase.storage.from("report-attachments").upload(key, f, {
          contentType: f.type, upsert: false
        });
        if (!up.error) {
          await supabase.from("report_attachments").insert([{
            message_id: msg.id, file_path: key, mime_type: f.type, size_bytes: f.size
          }]);
        }
      }
    }

    setText(""); setFiles(null);
    await load(); onReload?.();
  }

  async function getSignedUrl(path: string) {
    const { data } = await supabase.storage.from("report-attachments").createSignedUrl(path, 60*5);
    return data?.signedUrl ?? "#";
  }

  return (
    <div className="rounded-2xl p-6 bg-white/10 border border-white/15">
      <h3 className="text-lg font-semibold mb-4">Conversa</h3>
      <div className="space-y-4 max-h-[40vh] overflow-auto pr-2">
        {msgs.map(m => (
          <div key={m.id} className={"p-3 rounded-xl " + (m.is_staff ? "bg-blue-500/10 border border-blue-400/30" : "bg-black/30 border border-white/15")}>
            <div className="text-xs opacity-70 mb-1">
              {m.is_staff ? "Staff" : "Tu"} • {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap">{m.body}</div>
            {m.attachments && m.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.attachments.map(a => (
                  <AttachmentLink key={a.id} path={a.file_path} getUrl={getSignedUrl} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <textarea className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/15"
                  rows={3} placeholder="Escreve a tua resposta…" value={text} onChange={e=>setText(e.target.value)} />
        <input type="file" multiple onChange={e=>setFiles(e.target.files)} />
        <div>
          <button onClick={send} className="px-5 py-3 rounded-xl font-semibold bg-red-500 text-black">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentLink({ path, getUrl }:{ path:string; getUrl:(p:string)=>Promise<string>; }) {
  const [href, setHref] = useState("#");
  useEffect(()=>{ getUrl(path).then(setHref); }, [path]);
  const name = path.split("/").pop();
  return <a className="text-sm underline" href={href} target="_blank" rel="noreferrer">{name}</a>;
}

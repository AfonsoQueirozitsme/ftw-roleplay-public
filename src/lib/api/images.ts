import { supabase } from "@/lib/supabase";

export type ImageRow = {
  id: string;
  bucket: string;
  path: string;
  mime: string | null;
  size_bytes: number | null;
  checksum_sha256: string | null;
  visibility: "private" | "public";
  meta: any | null;
  uploaded_at: string;           // timestamptz
  uploaded_by: string | null;    // uuid
  deleted_at: string | null;
  // opcional na view:
  user_email?: string | null;
};

export type ListImagesParams = {
  q?: string;                   // path / checksum / meta
  bucket?: string;
  visibility?: "all" | "public" | "private";
  mime?: string;                // prefixo (ex: image/ ou image/png)
  user?: string;                // id ou email (se view)
  from?: string;
  to?: string;
  minSize?: number;
  maxSize?: number;
  page?: number;
  limit?: number;
  dir?: "asc" | "desc";         // por uploaded_at
};

const FILES_TABLE = (import.meta as any).env.VITE_FILES_TABLE || "api_files";

export async function listImages(p: ListImagesParams) {
  const page = Math.max(1, p.page ?? 1);
  const limit = Math.min(200, Math.max(1, p.limit ?? 24));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase.from(FILES_TABLE).select("*", { count: "exact" }).order("uploaded_at", {
    ascending: (p.dir ?? "desc") === "asc",
  });

  if (p.bucket)     q = q.eq("bucket", p.bucket);
  if (p.visibility && p.visibility !== "all") q = q.eq("visibility", p.visibility);
  if (p.mime && p.mime.trim()) q = q.ilike("mime", `${p.mime.trim()}%`);
  if (p.from) q = q.gte("uploaded_at", p.from);
  if (p.to)   q = q.lte("uploaded_at", p.to);
  if (p.minSize != null) q = q.gte("size_bytes", p.minSize);
  if (p.maxSize != null) q = q.lte("size_bytes", p.maxSize);

  if (p.q && p.q.trim()) {
    const s = p.q.trim();
    q = q.or([
      `path.ilike.%${s}%`,
      `checksum_sha256.ilike.%${s}%`,
    ].join(","));
  }

  if (p.user && p.user.trim()) {
    const u = p.user.trim();
    if (FILES_TABLE !== "api_files") {
      q = q.or(`user_email.ilike.%${u}%,uploaded_by.eq.${u}`);
    } else {
      q = q.eq("uploaded_by", u);
    }
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  return {
    data: (data ?? []) as ImageRow[],
    total: count ?? 0,
    page,
    limit,
  };
}

/** Devolve URL para preview (pública ou assinada) */
export async function getImageUrl(row: ImageRow) {
  const s = supabase.storage.from(row.bucket);
  if (row.visibility === "public") {
    const { data } = s.getPublicUrl(row.path);
    return data.publicUrl;
  }
  // privado → URL assinada curta
  const { data, error } = await s.createSignedUrl(row.path, 60);
  if (error) throw error;
  return data.signedUrl;
}

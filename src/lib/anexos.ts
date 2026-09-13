import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AnexoEntidade = Database["public"]["Enums"]["anexo_entidade"];
export type AnexoStatus = Database["public"]["Enums"]["anexo_status"];

export const TAMANHO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Extensão → MIME canônico. Precisa bater com `allowed_mime_types` do bucket
 * `anexos` (migration 20260913120000): o Storage recusa content-type fora da
 * lista. O MIME vem da extensão porque o `file.type` do navegador varia (CSV no
 * Windows chega como application/vnd.ms-excel ou vazio).
 */
const MIME_POR_EXTENSAO: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const EXTENSOES_PERMITIDAS = Object.keys(MIME_POR_EXTENSAO);

export const TIPOS_PERMITIDOS = Array.from(new Set(Object.values(MIME_POR_EXTENSAO)));

/** MIME canônico do arquivo pela extensão; `null` se o formato não é aceito. */
export function mimeDoArquivo(nome: string): string | null {
  const partes = nome.split(".");
  if (partes.length < 2) return null;
  const ext = "." + (partes.pop() ?? "").toLowerCase();
  return MIME_POR_EXTENSAO[ext] ?? null;
}

export interface Anexo {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  tipo_mime: string;
  tamanho_bytes: number;
  entidade_tipo: AnexoEntidade;
  entidade_id: string; // text — aceita UUID ou ID textual
  observacoes: string;
  status: AnexoStatus;
  enviado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidacaoArquivo {
  ok: boolean;
  erro?: string;
}

export function validarArquivo(file: File): ValidacaoArquivo {
  if (!mimeDoArquivo(file.name)) {
    return {
      ok: false,
      erro: "Tipo não permitido. Use PDF, PNG, JPG, XLSX, XLS, CSV ou DOCX.",
    };
  }
  if (file.size > TAMANHO_MAX_BYTES) {
    return { ok: false, erro: "Arquivo excede o limite de 25 MB." };
  }
  if (file.size === 0) {
    return { ok: false, erro: "Arquivo está vazio." };
  }
  return { ok: true };
}

function sanitizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export async function uploadAnexo(params: {
  file: File;
  entidadeTipo: AnexoEntidade;
  entidadeId: string;
  observacoes?: string;
}): Promise<{ data: Anexo | null; error: string | null }> {
  const { file, entidadeTipo, entidadeId, observacoes = "" } = params;

  const validacao = validarArquivo(file);
  if (!validacao.ok) return { data: null, error: validacao.erro ?? "Inválido" };

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { data: null, error: "Usuário não autenticado." };
  }

  const userId = userData.user.id;
  const nomeSan = sanitizarNome(file.name);
  const path = `${entidadeTipo}/${entidadeId}/${userId}/${Date.now()}_${nomeSan}`;
  const mime = mimeDoArquivo(file.name) ?? "application/octet-stream";

  const { error: upErr } = await supabase.storage
    .from("anexos")
    .upload(path, file, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) return { data: null, error: upErr.message };

  const { data: row, error: insErr } = await supabase
    .from("anexos")
    .insert({
      nome_arquivo: file.name,
      storage_path: path,
      tipo_mime: mime,
      tamanho_bytes: file.size,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      observacoes,
      enviado_por: userId,
    })
    .select()
    .single();

  if (insErr) {
    // tenta limpar arquivo órfão
    await supabase.storage.from("anexos").remove([path]);
    return { data: null, error: insErr.message };
  }

  return { data: row as Anexo, error: null };
}

export async function listarAnexos(
  entidadeTipo: AnexoEntidade,
  entidadeId: string,
): Promise<{ data: Anexo[]; error: string | null }> {
  const { data, error } = await supabase
    .from("anexos")
    .select("*")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .neq("status", "Removido")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Anexo[], error: null };
}

export async function gerarUrlDownload(
  storagePath: string,
  expiraEmSegundos = 60,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from("anexos")
    .createSignedUrl(storagePath, expiraEmSegundos);
  if (error) return { url: null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
}

export async function arquivarAnexo(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("anexos")
    .update({ status: "Arquivado" })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
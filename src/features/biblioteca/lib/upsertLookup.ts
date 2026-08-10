import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Busca-ou-cria robusta contra corrida: insere com ON CONFLICT DO NOTHING
 * (não lança se já existir) e então sempre busca a linha por normalized_*,
 * cobrindo tanto o caso recém-criado quanto o já existente. Preserva a
 * grafia original de quem criou primeiro (nunca sobrescreve o label).
 */
export async function upsertKeyword(ownerId: string, label: string): Promise<Tables<"keywords">> {
  const trimmedLabel = label.trim();
  const normalizedValue = normalize(trimmedLabel);

  const { error: upsertError } = await supabase
    .from("keywords")
    .upsert(
      { label: trimmedLabel, owner_id: ownerId },
      { onConflict: "owner_id,normalized_label", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;

  const { data, error: selectError } = await supabase
    .from("keywords")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("normalized_label", normalizedValue)
    .single();
  if (selectError) throw selectError;
  return data;
}

export async function upsertPerson(ownerId: string, fullName: string): Promise<Tables<"people">> {
  const trimmedName = fullName.trim();
  const normalizedValue = normalize(trimmedName);

  const { error: upsertError } = await supabase
    .from("people")
    .upsert(
      { full_name: trimmedName, owner_id: ownerId },
      { onConflict: "owner_id,normalized_name", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;

  const { data, error: selectError } = await supabase
    .from("people")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("normalized_name", normalizedValue)
    .single();
  if (selectError) throw selectError;
  return data;
}

/** Remove duplicatas por normalized (lowercase+trim), mantendo a grafia da primeira ocorrência. */
export function dedupeByNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

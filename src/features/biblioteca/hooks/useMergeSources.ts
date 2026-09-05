import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { MERGE_FIELD_LABELS, mergeFieldColumn, type MergeFieldKey } from "../lib/merge";
import { sourcesQueryKey } from "./useSources";

const MERGE_FIELDS = Object.keys(MERGE_FIELD_LABELS) as MergeFieldKey[];

function norm(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Reatribui para `survivorId` as linhas de `loserId` numa tabela de junção com PK composta, sem violar a PK: quando o sobrevivente já tem a mesma combinação, a linha do perdedor é descartada (removida pelo cascade ao apagar a fonte perdedora) em vez de reatribuída. */
async function reassignSourceKeywords(loserId: string, survivorId: string) {
  const { data: survivorRows } = await supabase
    .from("source_keywords")
    .select("keyword_id")
    .eq("source_id", survivorId);
  const survivorKeys = new Set((survivorRows ?? []).map((r) => r.keyword_id));

  const { data: loserRows } = await supabase
    .from("source_keywords")
    .select("keyword_id")
    .eq("source_id", loserId);
  for (const row of loserRows ?? []) {
    if (survivorKeys.has(row.keyword_id)) continue;
    await supabase
      .from("source_keywords")
      .update({ source_id: survivorId })
      .eq("source_id", loserId)
      .eq("keyword_id", row.keyword_id);
  }
}

async function reassignSourceTags(loserId: string, survivorId: string) {
  const { data: survivorRows } = await supabase
    .from("source_tags")
    .select("tag_id")
    .eq("source_id", survivorId);
  const survivorKeys = new Set((survivorRows ?? []).map((r) => r.tag_id));

  const { data: loserRows } = await supabase
    .from("source_tags")
    .select("tag_id")
    .eq("source_id", loserId);
  for (const row of loserRows ?? []) {
    if (survivorKeys.has(row.tag_id)) continue;
    await supabase
      .from("source_tags")
      .update({ source_id: survivorId })
      .eq("source_id", loserId)
      .eq("tag_id", row.tag_id);
  }
}

async function reassignSourcePeople(loserId: string, survivorId: string) {
  const { data: survivorRows } = await supabase
    .from("source_people")
    .select("person_id, role, position")
    .eq("source_id", survivorId);
  const survivorKeys = new Set((survivorRows ?? []).map((r) => `${r.person_id}|${r.role}`));
  const nextPositionByRole = new Map<string, number>();
  for (const r of survivorRows ?? []) {
    const current = nextPositionByRole.get(r.role) ?? 0;
    if (r.position > current) nextPositionByRole.set(r.role, r.position);
  }

  const { data: loserRows } = await supabase
    .from("source_people")
    .select("person_id, role, position")
    .eq("source_id", loserId);
  for (const row of loserRows ?? []) {
    const key = `${row.person_id}|${row.role}`;
    if (survivorKeys.has(key)) continue;
    const nextPosition = (nextPositionByRole.get(row.role) ?? 0) + 1;
    nextPositionByRole.set(row.role, nextPosition);
    await supabase
      .from("source_people")
      .update({ source_id: survivorId, position: nextPosition })
      .eq("source_id", loserId)
      .eq("person_id", row.person_id)
      .eq("role", row.role);
  }
}

async function reassignProjectSources(loserId: string, survivorId: string) {
  const { data: survivorRows } = await supabase
    .from("project_sources")
    .select("project_id")
    .eq("source_id", survivorId);
  const survivorKeys = new Set((survivorRows ?? []).map((r) => r.project_id));

  const { data: loserRows } = await supabase
    .from("project_sources")
    .select("project_id")
    .eq("source_id", loserId);
  for (const row of loserRows ?? []) {
    if (survivorKeys.has(row.project_id)) continue;
    await supabase
      .from("project_sources")
      .update({ source_id: survivorId })
      .eq("source_id", loserId)
      .eq("project_id", row.project_id);
  }
}

/**
 * Mesclagem manual por enriquecimento (RF7) de duas fontes que compartilham
 * chave_doc, disponível na tela de revisão de duplicatas. Campos escalares
 * só preenchidos no perdedor entram automaticamente na sobrevivente; em caso
 * de conflito (os dois preenchidos com valores diferentes), o valor da
 * sobrevivente prevalece — decisão padrão segura, sem o seletor por campo
 * que existe no fluxo de importação (aquele já resolve o conflito quando a
 * mesclagem acontece no momento da importação; aqui a ação é de um clique só
 * sobre fontes que já existem). source_titles/abstracts/links são sempre
 * multi-valor: nada se perde, o texto do perdedor que não estiver na
 * sobrevivente é somado. source_import_events, source_titles, source_abstracts
 * e source_links do perdedor são reatribuídos (nunca apagados) para a
 * sobrevivente antes de a fonte perdedora ser removida.
 */
export function useMergeSources(ownerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ survivorId, loserId }: { survivorId: string; loserId: string }) => {
      if (survivorId === loserId) return;

      const [{ data: survivor, error: survivorError }, { data: loser, error: loserError }] =
        await Promise.all([
          supabase.from("sources").select("*").eq("id", survivorId).single(),
          supabase.from("sources").select("*").eq("id", loserId).single(),
        ]);
      if (survivorError) throw survivorError;
      if (loserError) throw loserError;
      if (!survivor || !loser) throw new Error("Fonte não encontrada.");

      const patch: TablesUpdate<"sources"> = {};
      for (const field of MERGE_FIELDS) {
        const column = mergeFieldColumn(field) as keyof Tables<"sources">;
        const survivorValue = survivor[column] as string | number | null;
        const loserValue = loser[column] as string | number | null;
        if (norm(survivorValue) === "" && norm(loserValue) !== "") {
          Object.assign(patch, { [column]: loserValue });
        }
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("sources").update(patch).eq("id", survivorId);
        if (error) throw error;
      }

      // Multi-valor: sempre soma o que o perdedor tem e a sobrevivente ainda não tem.
      await supabase
        .from("source_titles")
        .update({ source_id: survivorId })
        .eq("source_id", loserId);
      await supabase
        .from("source_abstracts")
        .update({ source_id: survivorId })
        .eq("source_id", loserId);
      await supabase
        .from("source_links")
        .update({ source_id: survivorId })
        .eq("source_id", loserId);
      await supabase
        .from("source_import_events")
        .update({ source_id: survivorId })
        .eq("source_id", loserId);

      await reassignSourceKeywords(loserId, survivorId);
      await reassignSourceTags(loserId, survivorId);
      await reassignSourcePeople(loserId, survivorId);
      await reassignProjectSources(loserId, survivorId);

      // O que sobrou vinculado ao perdedor (source_keywords/tags/people/
      // project_sources que já existiam idênticos na sobrevivente) é limpo
      // em cascata por este delete — nunca era dado exclusivo do perdedor.
      const { error: deleteError } = await supabase.from("sources").delete().eq("id", loserId);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

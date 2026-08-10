import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  candidateChaveDoc,
  isTitleMissing,
  parseKeywordList,
  parseSemicolonList,
  type ImportCandidate,
} from "../lib/import";
import { dedupeByNormalized, upsertKeyword, upsertPerson } from "../lib/upsertLookup";
import { sourcesQueryKey } from "./useSources";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export interface ImportResult {
  inserted: number;
  duplicates: number;
  errors: { candidate: ImportCandidate; message: string }[];
}

/** Remove o registro de sources (e, em cascata, source_people/source_keywords/source_tags) já inseridos para esta fonte. */
async function rollbackSource(sourceId: string) {
  await supabase.from("sources").delete().eq("id", sourceId);
}

export function useConfirmImport(ownerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidates: ImportCandidate[]): Promise<ImportResult> => {
      if (!ownerId) throw new Error("Usuário não autenticado.");

      const { data: existingSources, error: existingError } = await supabase
        .from("sources")
        .select("id, title, chave_doc")
        .eq("owner_id", ownerId);
      if (existingError) throw existingError;
      const existingMap = new Map<string, { id: string; title: string }>();
      for (const s of existingSources ?? []) {
        if (s.chave_doc) existingMap.set(s.chave_doc, { id: s.id, title: s.title });
      }

      const result: ImportResult = { inserted: 0, duplicates: 0, errors: [] };
      const seenInBatch = new Set<string>();

      for (const candidate of candidates) {
        if (isTitleMissing(candidate)) {
          result.errors.push({ candidate, message: "Título ausente." });
          continue;
        }

        const chaveDoc = candidateChaveDoc(candidate);
        if (existingMap.has(chaveDoc) || seenInBatch.has(chaveDoc)) {
          result.duplicates += 1;
          continue;
        }
        seenInBatch.add(chaveDoc);

        const sourceId = crypto.randomUUID();
        let sourceInserted = false;

        try {
          let pdfStoragePath: string | null = null;
          let hasPdf = false;
          if (candidate.pdfFile) {
            const path = `${ownerId}/${sourceId}/${sanitizeFileName(candidate.pdfFile.name)}`;
            const { error: uploadError } = await supabase.storage
              .from("source-pdfs")
              .upload(path, candidate.pdfFile, { upsert: true });
            if (uploadError) throw uploadError;
            pdfStoragePath = path;
            hasPdf = true;
          }

          const payload: TablesInsert<"sources"> = {
            id: sourceId,
            owner_id: ownerId,
            title: candidate.title.trim(),
            source_type: candidate.sourceType,
            year: candidate.year,
            container_title: candidate.containerTitle || null,
            volume: candidate.volume || null,
            issue: candidate.issue || null,
            pages: candidate.pages || null,
            doi: candidate.doi || null,
            url: candidate.url || null,
            abstract: candidate.abstract || null,
            language: candidate.language,
            chave_doc: chaveDoc,
            has_pdf: hasPdf,
            pdf_storage_path: pdfStoragePath,
            access_date: candidate.setAccessDateToday ? new Date().toISOString() : null,
          };

          const { error: insertError } = await supabase.from("sources").insert(payload);
          if (insertError) throw insertError;
          sourceInserted = true;

          // Autores: deduplicados e resolvidos sequencialmente (upsert seguro contra corrida,
          // uma pessoa por vez) para que duplicatas dentro da mesma entrada, ou colisão com uma
          // pessoa já criada por outra fonte, nunca derrubem a fonte inteira nem se percam.
          const authorNames = dedupeByNormalized(parseSemicolonList(candidate.authors));
          if (authorNames.length > 0) {
            const personIds: string[] = [];
            for (const name of authorNames) {
              const person = await upsertPerson(ownerId, name);
              personIds.push(person.id);
            }
            const { error } = await supabase.from("source_people").insert(
              personIds.map((person_id, index) => ({
                source_id: sourceId,
                person_id,
                role: "autor" as const,
                position: index + 1,
              })),
            );
            if (error) throw error;
          }

          // Palavras-chave: mesma lógica — dedupe + upsert sequencial seguro contra corrida.
          const keywordLabels = dedupeByNormalized(parseKeywordList(candidate.keywords));
          if (keywordLabels.length > 0) {
            const keywordIds: string[] = [];
            for (const label of keywordLabels) {
              const keyword = await upsertKeyword(ownerId, label);
              keywordIds.push(keyword.id);
            }
            const { error } = await supabase
              .from("source_keywords")
              .insert(keywordIds.map((keyword_id) => ({ source_id: sourceId, keyword_id })));
            if (error) throw error;
          }

          result.inserted += 1;
          existingMap.set(chaveDoc, { id: sourceId, title: candidate.title.trim() });
        } catch (error) {
          // Transacional na prática: se qualquer etapa após a criação da fonte falhar, a fonte
          // é removida (cascade limpa source_people/source_keywords/source_tags) em vez de ficar
          // salva com um subconjunto incompleto de autores/palavras-chave.
          if (sourceInserted) await rollbackSource(sourceId);
          result.errors.push({
            candidate,
            message: error instanceof Error ? error.message : "Erro desconhecido.",
          });
        }
      }

      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

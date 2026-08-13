import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import {
  candidateChaveDoc,
  isTitleMissing,
  parseKeywordList,
  parseSemicolonList,
  type ImportCandidate,
} from "../lib/import";
import { dedupeByNormalized, upsertKeyword, upsertPerson } from "../lib/upsertLookup";
import { sourcesQueryKey } from "./useSources";

/** Insere pessoas de um papel (editor/tradutor) sequencialmente (upsert seguro contra corrida). */
async function insertPeopleForRole(
  ownerId: string,
  sourceId: string,
  names: string[],
  role: "editor" | "tradutor",
) {
  if (names.length === 0) return;
  const rows: TablesInsert<"source_people">[] = [];
  let position = 0;
  for (const name of names) {
    const person = await upsertPerson(ownerId, name);
    position += 1;
    rows.push({ source_id: sourceId, person_id: person.id, role, position });
  }
  const { error } = await supabase.from("source_people").insert(rows);
  if (error) throw error;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export interface ImportResult {
  inserted: number;
  duplicates: number;
  errors: { candidate: ImportCandidate; message: string }[];
}

/** Remove o registro de sources (e, em cascata, source_people/source_keywords/source_tags/source_titles/source_abstracts/source_links) já inseridos para esta fonte. */
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
            publisher: candidate.publisher || null,
            place: candidate.place || null,
            doi: candidate.doi || null,
            url: candidate.url || null,
            abstract: candidate.abstract || null,
            language: candidate.language,
            chave_doc: chaveDoc,
            has_pdf: hasPdf,
            pdf_storage_path: pdfStoragePath,
            access_date: candidate.setAccessDateToday ? new Date().toISOString() : null,
            issn_isbn: candidate.issnIsbn || null,
            database_source: candidate.databaseSource || null,
            external_id: candidate.externalId || null,
            // Zero perda: o registro bruto (todas as tags do RIS, ou o payload
            // de link/PDF) é sempre gravado, independente do que também foi
            // mapeado para colunas estruturadas.
            raw_import_data: candidate.rawImportData as Json | null,
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

          // Editores e tradutores (tags RIS A2/A3/A4): mesmo padrão sequencial seguro.
          await insertPeopleForRole(
            ownerId,
            sourceId,
            dedupeByNormalized(parseSemicolonList(candidate.editorNames)),
            "editor",
          );
          await insertPeopleForRole(
            ownerId,
            sourceId,
            dedupeByNormalized(parseSemicolonList(candidate.translatorNames)),
            "tradutor",
          );

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

          // Títulos: a versão principal (TI) sempre vira uma linha, mais uma por
          // título traduzido/alternativo (TT) — nunca inventa entradas vazias.
          const titleRows: TablesInsert<"source_titles">[] = [
            {
              source_id: sourceId,
              title_text: candidate.title.trim(),
              language: candidate.language,
              title_type: "principal",
            },
            ...candidate.altTitles.map((t) => ({
              source_id: sourceId,
              title_text: t.text,
              language: t.language,
              title_type: "traduzido" as const,
            })),
          ];
          {
            const { error } = await supabase.from("source_titles").insert(titleRows);
            if (error) throw error;
          }

          // Resumos: um por idioma encontrado (AB repetido); se o candidato só
          // tem o campo de resumo único (canais link/PDF), vira uma linha.
          const abstractEntries =
            candidate.abstracts.length > 0
              ? candidate.abstracts
              : candidate.abstract.trim()
                ? [{ text: candidate.abstract.trim(), language: candidate.language }]
                : [];
          if (abstractEntries.length > 0) {
            const { error } = await supabase.from("source_abstracts").insert(
              abstractEntries.map((a) => ({
                source_id: sourceId,
                abstract_text: a.text,
                language: a.language,
              })),
            );
            if (error) throw error;
          }

          // Links: UR + L1-L4 do RIS, ou a URL única dos canais link/PDF.
          const linkEntries =
            candidate.links.length > 0
              ? candidate.links
              : candidate.url.trim()
                ? [{ url: candidate.url.trim(), linkType: "pagina" as const }]
                : [];
          if (linkEntries.length > 0) {
            const { error } = await supabase.from("source_links").insert(
              linkEntries.map((l) => ({
                source_id: sourceId,
                url: l.url,
                link_type: l.linkType,
              })),
            );
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

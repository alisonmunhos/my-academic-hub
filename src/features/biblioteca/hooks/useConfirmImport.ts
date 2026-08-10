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
import { sourcesQueryKey } from "./useSources";

async function findOrCreatePerson(ownerId: string, fullName: string): Promise<string> {
  const normalized = fullName.toLowerCase().trim();
  const { data: existing, error: findError } = await supabase
    .from("people")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("people")
    .insert({ full_name: fullName, owner_id: ownerId })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

async function findOrCreateKeyword(ownerId: string, label: string): Promise<string> {
  const normalized = label.toLowerCase().trim();
  const { data: existing, error: findError } = await supabase
    .from("keywords")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("normalized_label", normalized)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("keywords")
    .insert({ label, owner_id: ownerId })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export interface ImportResult {
  inserted: number;
  duplicates: number;
  errors: { candidate: ImportCandidate; message: string }[];
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

        try {
          const sourceId = crypto.randomUUID();

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

          const authorNames = parseSemicolonList(candidate.authors);
          if (authorNames.length > 0) {
            const personIds = await Promise.all(
              authorNames.map((name) => findOrCreatePerson(ownerId, name)),
            );
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

          const keywordLabels = parseKeywordList(candidate.keywords);
          if (keywordLabels.length > 0) {
            const keywordIds = await Promise.all(
              keywordLabels.map((label) => findOrCreateKeyword(ownerId, label)),
            );
            const { error } = await supabase
              .from("source_keywords")
              .insert(keywordIds.map((keyword_id) => ({ source_id: sourceId, keyword_id })));
            if (error) throw error;
          }

          result.inserted += 1;
          existingMap.set(chaveDoc, { id: sourceId, title: candidate.title.trim() });
        } catch (error) {
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

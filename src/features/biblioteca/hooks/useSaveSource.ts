import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/integrations/supabase/types";
import { buildChaveDoc } from "../lib/academic";
import { generateUniqueSlug } from "../lib/slug";
import { sourcesQueryKey } from "./useSources";
import type { PersonRole } from "../constants";

export interface PersonEntry {
  person_id: string;
  full_name: string;
  role: PersonRole;
  position: number;
}

export interface SaveSourceInput {
  id: string | null;
  values: Omit<TablesInsert<"sources">, "id" | "owner_id" | "chave_doc" | "public_slug">;
  people: PersonEntry[];
  keywordIds: string[];
  tagIds: string[];
  pdfFile: File | null;
  removePdf: boolean;
  existingPdfPath: string | null | undefined;
  existingPublicSlug: string | null | undefined;
}

export interface SaveSourceResult {
  id: string;
  publicSlug: string | null;
}

export class DuplicateSourceError extends Error {
  existing: { id: string; title: string };
  constructor(existing: { id: string; title: string }) {
    super("Já existe uma fonte com esta mesma chave de documento.");
    this.existing = existing;
  }
}

async function findDuplicate(ownerId: string, chaveDoc: string, excludeId: string | null) {
  let query = supabase
    .from("sources")
    .select("id, title")
    .eq("owner_id", ownerId)
    .eq("chave_doc", chaveDoc)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function useSaveSource(ownerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveSourceInput) => {
      if (!ownerId) throw new Error("Usuário não autenticado.");

      const chaveDoc = buildChaveDoc(
        input.values.title,
        input.values.year ?? null,
        input.values.doi,
      );

      const duplicate = await findDuplicate(ownerId, chaveDoc, input.id);
      if (duplicate) {
        throw new DuplicateSourceError(duplicate);
      }

      const sourceId = input.id ?? crypto.randomUUID();

      let hasPdf = !!input.existingPdfPath && !input.removePdf;
      let pdfStoragePath: string | null = input.removePdf ? null : (input.existingPdfPath ?? null);

      if (input.removePdf && input.existingPdfPath) {
        await supabase.storage.from("source-pdfs").remove([input.existingPdfPath]);
      }

      if (input.pdfFile) {
        const path = `${ownerId}/${sourceId}/${sanitizeFileName(input.pdfFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("source-pdfs")
          .upload(path, input.pdfFile, { upsert: true });
        if (uploadError) throw uploadError;
        pdfStoragePath = path;
        hasPdf = true;
      }

      let publicSlug = input.existingPublicSlug ?? null;
      if (input.values.is_public && !publicSlug) {
        publicSlug = await generateUniqueSlug("sources", input.values.title);
      }

      const payload: TablesInsert<"sources"> = {
        ...input.values,
        id: sourceId,
        owner_id: ownerId,
        chave_doc: chaveDoc,
        has_pdf: hasPdf,
        pdf_storage_path: pdfStoragePath,
        public_slug: publicSlug,
      };

      const { error: upsertError } = await supabase.from("sources").upsert(payload);
      if (upsertError) throw upsertError;

      // Dedupe defensivo: a UI já evita selecionar a mesma pessoa/palavra-chave/tag duas vezes,
      // mas nunca confiamos apenas nisso — um id duplicado aqui violaria a chave primária.
      const dedupedPeople = input.people.filter(
        (p, index) => input.people.findIndex((other) => other.person_id === p.person_id) === index,
      );
      const dedupedKeywordIds = Array.from(new Set(input.keywordIds));
      const dedupedTagIds = Array.from(new Set(input.tagIds));

      await supabase.from("source_people").delete().eq("source_id", sourceId);
      if (dedupedPeople.length > 0) {
        const { error } = await supabase.from("source_people").insert(
          dedupedPeople.map((p) => ({
            source_id: sourceId,
            person_id: p.person_id,
            role: p.role,
            position: p.position,
          })),
        );
        if (error) throw error;
      }

      await supabase.from("source_keywords").delete().eq("source_id", sourceId);
      if (dedupedKeywordIds.length > 0) {
        const { error } = await supabase
          .from("source_keywords")
          .insert(dedupedKeywordIds.map((keyword_id) => ({ source_id: sourceId, keyword_id })));
        if (error) throw error;
      }

      await supabase.from("source_tags").delete().eq("source_id", sourceId);
      if (dedupedTagIds.length > 0) {
        const { error } = await supabase
          .from("source_tags")
          .insert(dedupedTagIds.map((tag_id) => ({ source_id: sourceId, tag_id })));
        if (error) throw error;
      }

      return { id: sourceId, publicSlug } satisfies SaveSourceResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

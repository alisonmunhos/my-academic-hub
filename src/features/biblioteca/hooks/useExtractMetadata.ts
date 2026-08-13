import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { LANGUAGES, SOURCE_TYPES, type Language, type SourceType } from "../constants";
import { createEmptyCandidate, type ImportCandidate } from "../lib/import";

interface ExtractMetadataResponse {
  found: boolean;
  metadataSource: "citation" | "dublin_core" | "open_graph" | "none";
  title: string;
  authors: string[];
  year: number | null;
  doi: string;
  containerTitle: string;
  abstract: string;
  keywords: string[];
  language: string;
  sourceTypeHint: string;
  url: string;
}

function mapLanguage(value: string): Language | null {
  const upper = value.trim().toUpperCase().slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(upper) ? (upper as Language) : null;
}

function mapSourceType(value: string): SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value) ? (value as SourceType) : "Outro";
}

export function metadataToCandidate(data: ExtractMetadataResponse): ImportCandidate {
  const candidate = createEmptyCandidate("link");
  return {
    ...candidate,
    title: data.title,
    authors: data.authors.join("; "),
    year: data.year,
    sourceType: mapSourceType(data.sourceTypeHint),
    containerTitle: data.containerTitle,
    doi: data.doi,
    url: data.url,
    abstract: data.abstract,
    abstracts: data.abstract ? [{ text: data.abstract, language: mapLanguage(data.language) }] : [],
    keywords: data.keywords.join("; "),
    language: mapLanguage(data.language),
    links: data.url ? [{ url: data.url, linkType: "pagina" }] : [],
    // Zero perda: guarda a resposta inteira da extração, independente do que
    // também foi mapeado para campos estruturados.
    rawImportData: data as unknown as Record<string, unknown>,
  };
}

export function useExtractMetadata() {
  return useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke<ExtractMetadataResponse>(
        "extract-metadata",
        { body: { url } },
      );
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia da extração.");
      return data;
    },
  });
}

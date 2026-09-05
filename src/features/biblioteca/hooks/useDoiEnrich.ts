import { supabase } from "@/lib/supabase";
import { LANGUAGES, type Language } from "../constants";
import type { ImportCandidate } from "../lib/import";

interface DoiEnrichResponse {
  found: boolean;
  title: string;
  authors: string[];
  containerTitle: string;
  year: number | null;
  publisher: string;
  issnIsbn: string;
  language: string;
  error?: string;
}

function mapLanguage(value: string): Language | null {
  const upper = value.trim().toUpperCase().slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(upper) ? (upper as Language) : null;
}

/**
 * Enriquece um candidato com dados da Crossref quando ele tem DOI (RF6):
 * título, autores, veículo, ano, editora e ISSN passam a valer o que a
 * Crossref retornou (base de verdade) — resumo/palavras-chave/links
 * continuam do RIS/link, sem alteração. Nunca lança: se a função falhar, dá
 * timeout, ou o DOI não existir na Crossref, devolve o candidato original
 * sem marcar `enrichedViaCrossref`, e a importação segue normalmente.
 */
export async function enrichCandidateWithDoi(candidate: ImportCandidate): Promise<ImportCandidate> {
  const doi = candidate.doi.trim();
  if (!doi) return candidate;

  try {
    const { data, error } = await supabase.functions.invoke<DoiEnrichResponse>("doi-enrich", {
      body: { doi },
    });
    if (error || !data || !data.found) return candidate;

    const language = data.language ? mapLanguage(data.language) : candidate.language;

    return {
      ...candidate,
      title: data.title || candidate.title,
      authors: data.authors.length > 0 ? data.authors.join("; ") : candidate.authors,
      containerTitle: data.containerTitle || candidate.containerTitle,
      year: data.year ?? candidate.year,
      publisher: data.publisher || candidate.publisher,
      issnIsbn: data.issnIsbn || candidate.issnIsbn,
      language,
      enrichedViaCrossref: true,
    };
  } catch {
    return candidate;
  }
}

/** Enriquece uma lista de candidatos sequencialmente (boa prática de taxa de requisição da Crossref). */
export async function enrichCandidatesWithDoi(
  candidates: ImportCandidate[],
): Promise<ImportCandidate[]> {
  const out: ImportCandidate[] = [];
  for (const candidate of candidates) {
    out.push(await enrichCandidateWithDoi(candidate));
  }
  return out;
}

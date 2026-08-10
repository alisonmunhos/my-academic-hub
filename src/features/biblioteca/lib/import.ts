import type { Language, SourceType } from "../constants";
import { buildChaveDoc } from "./academic";
import type { SourceRow } from "../hooks/useSources";

export type ImportOrigin = "link" | "ris" | "pdf";

export interface ImportCandidate {
  localId: string;
  origin: ImportOrigin;
  title: string;
  /** Nomes separados por ";" no formato "Sobrenome, Nome" (como no RIS/citation_author). */
  authors: string;
  year: number | null;
  sourceType: SourceType;
  containerTitle: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  abstract: string;
  /** Palavras-chave separadas por ";" ou ",". */
  keywords: string;
  language: Language | null;
  setAccessDateToday: boolean;
  pdfFile?: File | null;
}

export function createEmptyCandidate(origin: ImportOrigin): ImportCandidate {
  return {
    localId: crypto.randomUUID(),
    origin,
    title: "",
    authors: "",
    year: null,
    sourceType: "Artigo",
    containerTitle: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    url: "",
    abstract: "",
    keywords: "",
    language: null,
    setAccessDateToday: origin !== "ris",
    pdfFile: null,
  };
}

export function candidateChaveDoc(candidate: ImportCandidate): string {
  return buildChaveDoc(candidate.title, candidate.year, candidate.doi || null);
}

const REVIEW_FIELDS: { key: keyof ImportCandidate; label: string }[] = [
  { key: "authors", label: "Autores" },
  { key: "year", label: "Ano" },
  { key: "containerTitle", label: "Veículo / publicado em" },
  { key: "abstract", label: "Resumo" },
];

export function getMissingFields(candidate: ImportCandidate): string[] {
  return REVIEW_FIELDS.filter(({ key }) => {
    const value = candidate[key];
    return value === null || value === undefined || String(value).trim() === "";
  }).map((f) => f.label);
}

export function isTitleMissing(candidate: ImportCandidate): boolean {
  return !candidate.title.trim();
}

export type CandidateStatus = "duplicate" | "missing_title" | "missing_fields" | "complete";

export function getCandidateStatus(
  candidate: ImportCandidate,
  duplicateOf: { id: string; title: string } | null,
): CandidateStatus {
  if (duplicateOf) return "duplicate";
  if (isTitleMissing(candidate)) return "missing_title";
  if (getMissingFields(candidate).length > 0) return "missing_fields";
  return "complete";
}

/**
 * Mapa chave_doc -> fonte existente, para checagem de duplicata client-side
 * durante a revisão em lote (evita uma consulta por linha).
 */
export function buildExistingChaveDocMap(
  sources: SourceRow[],
): Map<string, { id: string; title: string }> {
  const map = new Map<string, { id: string; title: string }>();
  for (const source of sources) {
    if (source.chave_doc) map.set(source.chave_doc, { id: source.id, title: source.title });
  }
  return map;
}

export function parseSemicolonList(value: string): string[] {
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseKeywordList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

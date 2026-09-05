import type { Language, SourceType } from "../constants";
import { buildChaveDoc } from "./academic";
import type { SourceRow } from "../hooks/useSources";

export type ImportOrigin = "link" | "ris" | "pdf";

/** Um título ou resumo alternativo, com idioma inferido quando possível. */
export interface LocalizedText {
  text: string;
  language: Language | null;
}

export type SourceLinkType = "pagina" | "pdf_direto" | "outro";

export interface CandidateLink {
  url: string;
  linkType: SourceLinkType;
}

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
  publisher: string;
  place: string;
  doi: string;
  url: string;
  abstract: string;
  /** Palavras-chave separadas por ";" ou ",". */
  keywords: string;
  language: Language | null;
  setAccessDateToday: boolean;
  pdfFile?: File | null;
  /** ISSN/ISBN (tag RIS "SN"). */
  issnIsbn: string;
  /** Base de dados de origem (tag RIS "DB"). */
  databaseSource: string;
  /** Identificador externo (tag RIS "ID"). */
  externalId: string;
  /** Títulos traduzidos/alternativos (tag RIS "TT", pode repetir). */
  altTitles: LocalizedText[];
  /** Todos os resumos encontrados (tag RIS "AB", pode repetir). */
  abstracts: LocalizedText[];
  /** Editores (tags RIS "A2"/"A3"), separados por ";". */
  editorNames: string;
  /** Tradutores (tag RIS "A4"), separados por ";". */
  translatorNames: string;
  /** Links (tags RIS "UR" + "L1"-"L4"), com tipo já inferido. */
  links: CandidateLink[];
  /** Registro bruto completo (todas as tags -> valores, ou o payload cru de link/PDF), sempre gravado. */
  rawImportData: Record<string, unknown> | null;
  /** Referência de origem do import_channel (nome do arquivo .ris/.pdf, ou a URL). */
  originReference: string;
  /** true quando título/autores/veículo/ano/editora/ISSN vieram (sobrescritos) da Crossref via DOI. */
  enrichedViaCrossref: boolean;
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
    publisher: "",
    place: "",
    doi: "",
    url: "",
    abstract: "",
    keywords: "",
    language: null,
    setAccessDateToday: origin !== "ris",
    pdfFile: null,
    issnIsbn: "",
    databaseSource: "",
    externalId: "",
    altTitles: [],
    abstracts: [],
    editorNames: "",
    translatorNames: "",
    links: [],
    rawImportData: null,
    originReference: "",
    enrichedViaCrossref: false,
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

export type CandidateStatus =
  "duplicate" | "missing_title" | "missing_fields" | "complete" | "merge_ready" | "merge_conflict";

/**
 * `duplicateOf.local` = mesma chave_doc de outra linha deste mesmo lote (arbitrário, ignorada).
 * `duplicateOf` sem `local` = já existe uma fonte salva com essa chave_doc: em vez de bloquear,
 * vira mesclagem por enriquecimento (RF7) — "merge_conflict" enquanto houver campo em conflito
 * sem decisão do usuário, "merge_ready" quando já pode ser aplicada.
 */
export function getCandidateStatus(
  candidate: ImportCandidate,
  duplicateOf: { id: string; title: string; local?: boolean } | null,
  mergeConflictsPending?: boolean,
): CandidateStatus {
  if (duplicateOf?.local) return "duplicate";
  if (isTitleMissing(candidate)) return "missing_title";
  if (duplicateOf) return mergeConflictsPending ? "merge_conflict" : "merge_ready";
  if (getMissingFields(candidate).length > 0) return "missing_fields";
  return "complete";
}

/**
 * Mapa chave_doc -> fonte existente (registro completo, com relações), para
 * checagem de duplicata/mesclagem client-side durante a revisão em lote
 * (evita uma consulta por linha).
 */
export function buildExistingChaveDocMap(sources: SourceRow[]): Map<string, SourceRow> {
  const map = new Map<string, SourceRow>();
  for (const source of sources) {
    if (source.chave_doc) map.set(source.chave_doc, source);
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

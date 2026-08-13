import type { Language, SourceType } from "../constants";
import {
  createEmptyCandidate,
  type CandidateLink,
  type ImportCandidate,
  type LocalizedText,
} from "./import";

export type RisTagMap = Record<string, string[]>;

const TAG_LINE = /^([A-Z][A-Z0-9]{1,3})\s+-\s?(.*)$/;

/** Faz o parse de um texto RIS (uma ou mais entradas TY.../ER  -) em mapas de tag -> valores. */
export function parseRisEntries(raw: string): RisTagMap[] {
  const withoutBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lines = withoutBom.split(/\r\n|\r|\n/);
  const entries: RisTagMap[] = [];
  let current: RisTagMap | null = null;
  let lastTag: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const match = line.match(TAG_LINE);
    if (match) {
      const tag = match[1]!;
      const value = match[2]!.trim();

      if (tag === "TY") {
        current = {};
        entries.push(current);
      }
      if (!current) continue;

      if (tag === "ER") {
        current = null;
        lastTag = null;
        continue;
      }

      (current[tag] ??= []).push(value);
      lastTag = tag;
    } else if (current && lastTag) {
      const arr = current[lastTag]!;
      arr[arr.length - 1] = `${arr[arr.length - 1]} ${line.trim()}`.trim();
    }
  }

  return entries;
}

function first(map: RisTagMap, tag: string): string {
  return (map[tag] ?? []).find((v) => v.trim() !== "")?.trim() ?? "";
}

function all(map: RisTagMap, tag: string): string[] {
  return (map[tag] ?? []).map((v) => v.trim()).filter(Boolean);
}

const TY_TO_SOURCE_TYPE: Record<string, SourceType> = {
  JOUR: "Artigo",
  JFULL: "Artigo",
  MGZN: "Artigo",
  NEWS: "Artigo",
  BOOK: "Livro",
  EBOOK: "Livro",
  CHAP: "Capítulo de livro",
  ECHAP: "Capítulo de livro",
  THES: "Tese",
  CONF: "Anais",
  CPAPER: "Anais",
  CONF1: "Anais",
  ELEC: "Website",
  WEB: "Website",
  ICOMM: "Website",
};

function mapSourceType(ty: string): SourceType {
  return TY_TO_SOURCE_TYPE[ty.toUpperCase()] ?? "Outro";
}

function mapLanguage(value: string): Language | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("pt")) return "PT";
  if (normalized.startsWith("en")) return "EN";
  if (normalized.startsWith("es")) return "ES";
  return normalized ? "Outro" : null;
}

function extractYear(map: RisTagMap): number | null {
  const py = first(map, "PY");
  const pyMatch = py.match(/\d{4}/);
  if (pyMatch) return Number(pyMatch[0]);
  const da = first(map, "DA");
  const daMatch = da.match(/\d{4}/);
  if (daMatch) return Number(daMatch[0]);
  return null;
}

function extractPages(map: RisTagMap): string {
  const sp = first(map, "SP");
  const ep = first(map, "EP");
  if (sp && ep) return `${sp}-${ep}`;
  return sp || ep;
}

// --- Inferência de idioma (melhor esforço) --------------------------------
//
// Sem tag de idioma explícita por título/resumo, inferimos por: (1) prefixos
// convencionais de resumo acadêmico ("Abstract"/"Resumo"/"Resumen"), depois
// (2) contagem de palavras funcionais distintivas de cada idioma (evitando
// palavras ambíguas entre PT/ES para não gerar falsos positivos a partir de
// nomes próprios como "São Paulo" dentro de um título em inglês). Quando não
// há sinal suficiente, retorna null — a lacuna fica só sem idioma, nunca com
// um palpite inventado.

const EN_PREFIX = /^abstract\b/i;
const PT_PREFIX = /^resumo\b/i;
const ES_PREFIX = /^res[uú]m[ée]n\b/i;

const EN_WORDS = [
  "the",
  "and",
  "is",
  "are",
  "this",
  "that",
  "from",
  "of",
  "was",
  "were",
  "with",
  "in",
];
const ES_WORDS = [
  "el",
  "los",
  "las",
  "la",
  "una",
  "es",
  "en",
  "sí",
  "cómo",
  "aquí",
  "según",
  "más",
  "así",
  "del",
];
const PT_WORDS = [
  "não",
  "então",
  "também",
  "às",
  "numa",
  "pelos",
  "pelas",
  "está",
  "são",
  "uma",
  "dos",
  "das",
];

function countWordHits(lower: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    const matches = lower.match(new RegExp(`\\b${word}\\b`, "giu"));
    if (matches) count += matches.length;
  }
  return count;
}

function detectTextLanguage(text: string): Language | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (EN_PREFIX.test(trimmed)) return "EN";
  if (PT_PREFIX.test(trimmed)) return "PT";
  if (ES_PREFIX.test(trimmed)) return "ES";

  const lower = trimmed.toLowerCase();
  const enHits = countWordHits(lower, EN_WORDS);
  const esHits = countWordHits(lower, ES_WORDS);
  const ptHits = countWordHits(lower, PT_WORDS);
  const max = Math.max(enHits, esHits, ptHits);
  if (max === 0) return null;

  const winners = [
    ["EN", enHits],
    ["ES", esHits],
    ["PT", ptHits],
  ].filter(([, hits]) => hits === max);
  if (winners.length > 1) return null; // empate: sem sinal confiável o bastante

  return winners[0]![0] as Language;
}

// --- Links (UR + L1-L4) -----------------------------------------------------

function inferLinkType(url: string): CandidateLink["linkType"] {
  const clean = url.trim().split(/[?#]/)[0] ?? "";
  return /\.pdf$/i.test(clean) ? "pdf_direto" : "outro";
}

function extractLinks(map: RisTagMap): CandidateLink[] {
  const links: CandidateLink[] = [];
  for (const url of all(map, "UR")) {
    links.push({ url, linkType: "pagina" });
  }
  for (const tag of ["L1", "L2", "L3", "L4"]) {
    for (const url of all(map, tag)) {
      links.push({ url, linkType: inferLinkType(url) });
    }
  }
  return links;
}

// --- Pessoas (AU/A2/A3/A4) --------------------------------------------------
// AU -> autor (papel default do candidate); A2/A3 -> editor; A4 -> tradutor.

function extractEditorNames(map: RisTagMap): string[] {
  return [...all(map, "A2"), ...all(map, "A3")];
}

function extractTranslatorNames(map: RisTagMap): string[] {
  return all(map, "A4");
}

// --- Resumo "mais completo" (para compat com sources.abstract) -------------

function pickPrimaryAbstract(abstracts: LocalizedText[]): string {
  if (abstracts.length === 0) return "";
  return abstracts.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest,
  ).text;
}

export function risEntryToCandidate(map: RisTagMap): ImportCandidate {
  const base = createEmptyCandidate("ris");

  const altTitles: LocalizedText[] = all(map, "TT").map((text) => ({
    text,
    language: detectTextLanguage(text),
  }));
  const abstracts: LocalizedText[] = all(map, "AB").map((text) => ({
    text,
    language: detectTextLanguage(text),
  }));

  return {
    ...base,
    title: first(map, "TI"),
    authors: all(map, "AU").join("; "),
    editorNames: extractEditorNames(map).join("; "),
    translatorNames: extractTranslatorNames(map).join("; "),
    year: extractYear(map),
    sourceType: mapSourceType(first(map, "TY")),
    containerTitle: first(map, "JO") || first(map, "J2") || first(map, "T2"),
    volume: first(map, "VL"),
    issue: first(map, "IS"),
    pages: extractPages(map),
    publisher: first(map, "PB"),
    place: first(map, "CY"),
    doi: first(map, "DO"),
    url: first(map, "UR"),
    abstract: pickPrimaryAbstract(abstracts),
    keywords: all(map, "KW").join("; "),
    language: mapLanguage(first(map, "LA")),
    issnIsbn: first(map, "SN"),
    databaseSource: first(map, "DB"),
    externalId: first(map, "ID"),
    altTitles,
    abstracts,
    links: extractLinks(map),
    // Zero perda: o mapa de tags inteiro, sempre gravado independente do que
    // também foi mapeado para campos estruturados.
    rawImportData: map,
  };
}

export function parseRisText(raw: string): ImportCandidate[] {
  return parseRisEntries(raw).map(risEntryToCandidate);
}

export async function parseRisFiles(files: File[]): Promise<ImportCandidate[]> {
  const texts = await Promise.all(files.map((file) => file.text()));
  return texts.flatMap((text) => parseRisText(text));
}

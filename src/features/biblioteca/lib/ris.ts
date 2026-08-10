import type { Language, SourceType } from "../constants";
import { createEmptyCandidate, type ImportCandidate } from "./import";

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

export function risEntryToCandidate(map: RisTagMap): ImportCandidate {
  const base = createEmptyCandidate("ris");
  return {
    ...base,
    title: first(map, "TI"),
    authors: all(map, "AU").join("; "),
    year: extractYear(map),
    sourceType: mapSourceType(first(map, "TY")),
    containerTitle: first(map, "JO") || first(map, "T2") || first(map, "J2"),
    volume: first(map, "VL"),
    issue: first(map, "IS"),
    pages: extractPages(map),
    doi: first(map, "DO"),
    url: first(map, "UR"),
    abstract: first(map, "AB"),
    keywords: all(map, "KW").join("; "),
    language: mapLanguage(first(map, "LA")),
  };
}

export function parseRisText(raw: string): ImportCandidate[] {
  return parseRisEntries(raw).map(risEntryToCandidate);
}

export async function parseRisFiles(files: File[]): Promise<ImportCandidate[]> {
  const texts = await Promise.all(files.map((file) => file.text()));
  return texts.flatMap((text) => parseRisText(text));
}

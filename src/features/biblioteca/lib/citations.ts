import type { SourceRow } from "../hooks/useSources";

const MONTHS_PT_BR = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "maio",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
];

function getSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function getGivenNames(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, -1).join(" ");
}

function invertedName(fullName: string): string {
  const surname = getSurname(fullName).toUpperCase();
  const given = getGivenNames(fullName);
  return given ? `${surname}, ${given}` : surname;
}

function formatDatePtBr(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${MONTHS_PT_BR[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function getAuthorNames(source: SourceRow): string[] {
  return source.source_people
    .filter((sp) => sp.role === "autor")
    .sort((a, b) => a.position - b.position)
    .map((sp) => sp.people?.full_name)
    .filter((name): name is string => !!name);
}

export function buildParenthetical(authorNames: string[], year: number | null): string {
  const yr = year ?? "s.d.";
  if (authorNames.length === 0) return `(s.a., ${yr})`;
  if (authorNames.length <= 3) {
    const surnames = authorNames.map((name) => getSurname(name).toUpperCase());
    return `(${surnames.join("; ")}, ${yr})`;
  }
  return `(${getSurname(authorNames[0]!).toUpperCase()} et al., ${yr})`;
}

export function buildIntegrated(authorNames: string[], year: number | null): string {
  const yr = year ?? "s.d.";
  if (authorNames.length === 0) return `(s.a., ${yr})`;
  if (authorNames.length === 1) return `${getSurname(authorNames[0]!)} (${yr})`;
  if (authorNames.length === 2) {
    return `${getSurname(authorNames[0]!)} e ${getSurname(authorNames[1]!)} (${yr})`;
  }
  if (authorNames.length === 3) {
    return `${getSurname(authorNames[0]!)}, ${getSurname(authorNames[1]!)} e ${getSurname(authorNames[2]!)} (${yr})`;
  }
  return `${getSurname(authorNames[0]!)} et al. (${yr})`;
}

export function buildFullAbnt(source: SourceRow, authorNames: string[]): string {
  const segments: string[] = [];

  if (authorNames.length > 0) {
    const authorsStr =
      authorNames.length <= 3
        ? authorNames.map(invertedName).join("; ")
        : `${invertedName(authorNames[0]!)} et al.`;
    segments.push(`${authorsStr}.`);
  }

  segments.push(`${source.title}.`);

  if (source.container_title) {
    segments.push(
      source.source_type === "Capítulo de livro"
        ? `In: ${source.container_title}.`
        : `${source.container_title}.`,
    );
  }

  const volIssuePages = [
    source.volume ? `v. ${source.volume}` : null,
    source.issue ? `n. ${source.issue}` : null,
    source.pages ? `p. ${source.pages}` : null,
  ].filter((part): part is string => !!part);
  if (volIssuePages.length > 0) segments.push(`${volIssuePages.join(", ")}.`);

  let placePublisher = "";
  if (source.place && source.publisher) placePublisher = `${source.place}: ${source.publisher}`;
  else if (source.publisher) placePublisher = source.publisher;
  else if (source.place) placePublisher = source.place;

  if (placePublisher || source.year) {
    const yearPart = source.year ? String(source.year) : "";
    const sep = placePublisher && yearPart ? ", " : "";
    segments.push(`${placePublisher}${sep}${yearPart}.`);
  }

  if (source.url) {
    const accessLabel = source.access_date ? formatDatePtBr(source.access_date) : "";
    segments.push(
      `Disponível em: ${source.url}.${accessLabel ? ` Acesso em: ${accessLabel}.` : ""}`,
    );
  }

  if (source.doi) segments.push(`DOI: ${source.doi}.`);

  return segments.filter(Boolean).join(" ");
}

export interface SourceCitations {
  full: string;
  integrated: string;
  parenthetical: string;
}

/** Usa os campos de citação já salvos na fonte; gera a partir dos campos estruturados quando vazios. */
export function getCitations(source: SourceRow): SourceCitations {
  const authorNames = getAuthorNames(source);
  return {
    full: source.citation_full_abnt?.trim() || buildFullAbnt(source, authorNames),
    integrated: source.citation_integrated?.trim() || buildIntegrated(authorNames, source.year),
    parenthetical:
      source.citation_parenthetical?.trim() || buildParenthetical(authorNames, source.year),
  };
}

export function sortSourcesAlphabetically(sources: SourceRow[]): SourceRow[] {
  return [...sources].sort((a, b) => {
    const keyA = getSurname(getAuthorNames(a)[0] ?? a.title).toLowerCase();
    const keyB = getSurname(getAuthorNames(b)[0] ?? b.title).toLowerCase();
    return keyA.localeCompare(keyB, "pt-BR");
  });
}

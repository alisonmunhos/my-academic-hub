import type { SourceRow } from "../hooks/useSources";

export type FacetMode = "any" | "all" | "none";

export interface FacetState {
  mode: FacetMode;
  values: string[];
}

export type FacetKey =
  | "sourceType"
  | "language"
  | "statusReading"
  | "tags"
  | "authors"
  | "advisors"
  | "keywords"
  | "projects";

export interface FilterState {
  search: string;
  yearMin: number | null;
  yearMax: number | null;
  sourceType: FacetState;
  language: FacetState;
  statusReading: FacetState;
  tags: FacetState;
  authors: FacetState;
  advisors: FacetState;
  keywords: FacetState;
  projects: FacetState;
}

function emptyFacet(): FacetState {
  return { mode: "any", values: [] };
}

export function createEmptyFilterState(): FilterState {
  return {
    search: "",
    yearMin: null,
    yearMax: null,
    sourceType: emptyFacet(),
    language: emptyFacet(),
    statusReading: emptyFacet(),
    tags: emptyFacet(),
    authors: emptyFacet(),
    advisors: emptyFacet(),
    keywords: emptyFacet(),
    projects: emptyFacet(),
  };
}

const FACET_KEYS: FacetKey[] = [
  "sourceType",
  "language",
  "statusReading",
  "tags",
  "authors",
  "advisors",
  "keywords",
  "projects",
];

export function isFilterStateEmpty(filters: FilterState): boolean {
  return (
    filters.search.trim() === "" &&
    filters.yearMin === null &&
    filters.yearMax === null &&
    FACET_KEYS.every((key) => filters[key].values.length === 0)
  );
}

function getSourceTypeIds(source: SourceRow): string[] {
  return source.source_type ? [source.source_type] : [];
}

function getLanguageIds(source: SourceRow): string[] {
  return source.language ? [source.language] : [];
}

function getStatusReadingIds(source: SourceRow): string[] {
  return source.status_reading ? [source.status_reading] : [];
}

function getTagIds(source: SourceRow): string[] {
  return source.source_tags.map((st) => st.tags?.id).filter((id): id is string => !!id);
}

function getAuthorIds(source: SourceRow): string[] {
  return source.source_people.filter((sp) => sp.role === "autor").map((sp) => sp.person_id);
}

function getAdvisorIds(source: SourceRow): string[] {
  return source.source_people
    .filter((sp) => sp.role === "orientador" || sp.role === "coorientador")
    .map((sp) => sp.person_id);
}

function getKeywordIds(source: SourceRow): string[] {
  return source.source_keywords.map((sk) => sk.keywords?.id).filter((id): id is string => !!id);
}

function getProjectIds(source: SourceRow): string[] {
  return source.project_sources.map((ps) => ps.project_id);
}

const FACET_EXTRACTORS: Record<FacetKey, (source: SourceRow) => string[]> = {
  sourceType: getSourceTypeIds,
  language: getLanguageIds,
  statusReading: getStatusReadingIds,
  tags: getTagIds,
  authors: getAuthorIds,
  advisors: getAdvisorIds,
  keywords: getKeywordIds,
  projects: getProjectIds,
};

function facetMatches(mode: FacetMode, selected: string[], itemIds: string[]): boolean {
  if (selected.length === 0) return true;
  const idSet = new Set(itemIds);
  if (mode === "any") return selected.some((id) => idSet.has(id));
  if (mode === "all") return selected.every((id) => idSet.has(id));
  return selected.every((id) => !idSet.has(id));
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesYearRange(source: SourceRow, filters: FilterState): boolean {
  if (filters.yearMin === null && filters.yearMax === null) return true;
  if (source.year === null) return false;
  if (filters.yearMin !== null && source.year < filters.yearMin) return false;
  if (filters.yearMax !== null && source.year > filters.yearMax) return false;
  return true;
}

function matchesSearch(source: SourceRow, filters: FilterState): boolean {
  const query = filters.search.trim();
  if (!query) return true;
  const needle = normalizeSearchText(query);
  const haystack = normalizeSearchText(`${source.title ?? ""} ${source.abstract ?? ""}`);
  return haystack.includes(needle);
}

/** Testa se a fonte satisfaz todos os filtros, exceto as facetas listadas em `excludeKeys`. */
export function matchesFilters(
  source: SourceRow,
  filters: FilterState,
  excludeKeys: ReadonlySet<FacetKey> = new Set(),
): boolean {
  if (!matchesYearRange(source, filters)) return false;
  if (!matchesSearch(source, filters)) return false;

  for (const key of Object.keys(FACET_EXTRACTORS) as FacetKey[]) {
    if (excludeKeys.has(key)) continue;
    const facet = filters[key];
    if (!facetMatches(facet.mode, facet.values, FACET_EXTRACTORS[key](source))) return false;
  }
  return true;
}

export function filterSources(sources: SourceRow[], filters: FilterState): SourceRow[] {
  return sources.filter((source) => matchesFilters(source, filters));
}

/**
 * Conta ocorrências de cada valor de uma faceta entre as fontes que já
 * satisfazem os outros filtros ativos (excluindo a própria faceta), para
 * que os contadores reflitam "quantas fontes eu teria se adicionasse esta opção".
 */
export function countFacetValues(
  sources: SourceRow[],
  filters: FilterState,
  facetKey: FacetKey,
): Map<string, number> {
  const excludeKeys = new Set<FacetKey>([facetKey]);
  const counts = new Map<string, number>();
  for (const source of sources) {
    if (!matchesFilters(source, filters, excludeKeys)) continue;
    for (const id of FACET_EXTRACTORS[facetKey](source)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

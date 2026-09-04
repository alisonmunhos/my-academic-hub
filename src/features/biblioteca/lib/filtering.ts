import { LANGUAGES, SOURCE_TYPES, STATUS_READING } from "../constants";
import type { SourceRow } from "../hooks/useSources";

export type FacetMode = "any" | "all" | "none";

export interface FacetState {
  mode: FacetMode;
  values: string[];
}

function emptyFacet(): FacetState {
  return { mode: "any", values: [] };
}

export interface FacetOption {
  value: string;
  label: string;
}

/** Contexto extra que algumas facetas precisam além da própria lista de fontes (ex.: projetos). */
export interface FacetContext {
  sources: SourceRow[];
  projects: { id: string; name: string }[];
}

/**
 * Definição genérica de uma faceta de filtro: de onde tira o(s) id(s) de uma
 * fonte, quais opções mostrar (rótulo), e quais modos de combinação fazem
 * sentido para ela. O painel de filtros e o motor de matching iteram sobre
 * essa lista — nenhuma faceta tem lógica própria hardcoded fora daqui.
 */
export interface FacetDefinition {
  key: string;
  title: string;
  modes: FacetMode[];
  searchable?: boolean;
  sortByCount?: boolean;
  extractIds: (source: SourceRow) => string[];
  buildOptions: (ctx: FacetContext) => FacetOption[];
}

function fixedOptions(values: readonly string[]): (ctx: FacetContext) => FacetOption[] {
  return () => values.map((v) => ({ value: v, label: v }));
}

function derivedOptions(
  extract: (source: SourceRow) => { id: string; label: string }[],
): (ctx: FacetContext) => FacetOption[] {
  return (ctx) => {
    const map = new Map<string, string>();
    for (const source of ctx.sources) {
      for (const { id, label } of extract(source)) {
        if (!map.has(id)) map.set(id, label);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  };
}

const YES_NO_OPTIONS: FacetOption[] = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];

function hasPdfDireto(source: SourceRow): boolean {
  return source.source_links.some((l) => l.link_type === "pdf_direto");
}

function isMultilingual(source: SourceRow): boolean {
  return source.source_titles.length > 1 || source.source_abstracts.length > 1;
}

export const FACET_DEFINITIONS: FacetDefinition[] = [
  {
    key: "sourceType",
    title: "Tipo de fonte",
    modes: ["any", "none"],
    extractIds: (s) => (s.source_type ? [s.source_type] : []),
    buildOptions: fixedOptions(SOURCE_TYPES),
  },
  {
    key: "language",
    title: "Idioma",
    modes: ["any", "none"],
    extractIds: (s) => (s.language ? [s.language] : []),
    buildOptions: fixedOptions(LANGUAGES),
  },
  {
    key: "statusReading",
    title: "Status de leitura",
    modes: ["any", "none"],
    extractIds: (s) => (s.status_reading ? [s.status_reading] : []),
    buildOptions: fixedOptions(STATUS_READING),
  },
  {
    key: "authors",
    title: "Autor",
    modes: ["any", "all", "none"],
    searchable: true,
    extractIds: (s) =>
      s.source_people.filter((sp) => sp.role === "autor").map((sp) => sp.person_id),
    buildOptions: derivedOptions((s) =>
      s.source_people
        .filter((sp) => sp.role === "autor" && sp.people)
        .map((sp) => ({ id: sp.person_id, label: sp.people!.full_name })),
    ),
  },
  {
    key: "advisors",
    title: "Orientador / Coorientador",
    modes: ["any", "all", "none"],
    searchable: true,
    extractIds: (s) =>
      s.source_people
        .filter((sp) => sp.role === "orientador" || sp.role === "coorientador")
        .map((sp) => sp.person_id),
    buildOptions: derivedOptions((s) =>
      s.source_people
        .filter((sp) => (sp.role === "orientador" || sp.role === "coorientador") && sp.people)
        .map((sp) => ({
          id: sp.person_id,
          label: `${sp.people!.full_name} (${sp.role === "orientador" ? "Orientador" : "Coorientador"})`,
        })),
    ),
  },
  {
    key: "tags",
    title: "Tags",
    modes: ["any", "all", "none"],
    searchable: true,
    extractIds: (s) => s.source_tags.map((st) => st.tags?.id).filter((id): id is string => !!id),
    buildOptions: derivedOptions((s) =>
      s.source_tags
        .filter((st) => st.tags)
        .map((st) => ({ id: st.tags!.id, label: st.tags!.label })),
    ),
  },
  {
    key: "keywords",
    title: "Palavras-chave",
    modes: ["any", "all", "none"],
    searchable: true,
    sortByCount: true,
    extractIds: (s) =>
      s.source_keywords.map((sk) => sk.keywords?.id).filter((id): id is string => !!id),
    buildOptions: derivedOptions((s) =>
      s.source_keywords
        .filter((sk) => sk.keywords)
        .map((sk) => ({ id: sk.keywords!.id, label: sk.keywords!.label })),
    ),
  },
  {
    key: "projects",
    title: "Projeto",
    modes: ["any", "all", "none"],
    extractIds: (s) => s.project_sources.map((ps) => ps.project_id),
    buildOptions: (ctx) => ctx.projects.map((p) => ({ value: p.id, label: p.name })),
  },
  {
    key: "databaseSource",
    title: "Base de dados de origem",
    modes: ["any", "none"],
    extractIds: (s) => (s.database_source ? [s.database_source] : []),
    buildOptions: derivedOptions((s) =>
      s.database_source ? [{ id: s.database_source, label: s.database_source }] : [],
    ),
  },
  {
    key: "hasPdfDireto",
    title: "Tem PDF direto disponível",
    modes: ["any", "none"],
    extractIds: (s) => [hasPdfDireto(s) ? "yes" : "no"],
    buildOptions: () => YES_NO_OPTIONS,
  },
  {
    key: "isMultilingual",
    title: "Título/resumo em mais de um idioma",
    modes: ["any", "none"],
    extractIds: (s) => [isMultilingual(s) ? "yes" : "no"],
    buildOptions: () => YES_NO_OPTIONS,
  },
];

export interface FilterState {
  search: string;
  yearMin: number | null;
  yearMax: number | null;
  facets: Record<string, FacetState>;
}

export function createEmptyFilterState(): FilterState {
  const facets: Record<string, FacetState> = {};
  for (const def of FACET_DEFINITIONS) facets[def.key] = emptyFacet();
  return { search: "", yearMin: null, yearMax: null, facets };
}

function getFacetState(filters: FilterState, key: string): FacetState {
  return filters.facets[key] ?? emptyFacet();
}

export function isFilterStateEmpty(filters: FilterState): boolean {
  return (
    filters.search.trim() === "" &&
    filters.yearMin === null &&
    filters.yearMax === null &&
    FACET_DEFINITIONS.every((def) => getFacetState(filters, def.key).values.length === 0)
  );
}

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
  excludeKeys: ReadonlySet<string> = new Set(),
): boolean {
  if (!matchesYearRange(source, filters)) return false;
  if (!matchesSearch(source, filters)) return false;

  for (const def of FACET_DEFINITIONS) {
    if (excludeKeys.has(def.key)) continue;
    const facet = getFacetState(filters, def.key);
    if (!facetMatches(facet.mode, facet.values, def.extractIds(source))) return false;
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
  facetKey: string,
): Map<string, number> {
  const def = FACET_DEFINITIONS.find((d) => d.key === facetKey);
  if (!def) return new Map();
  const excludeKeys = new Set<string>([facetKey]);
  const counts = new Map<string, number>();
  for (const source of sources) {
    if (!matchesFilters(source, filters, excludeKeys)) continue;
    for (const id of def.extractIds(source)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

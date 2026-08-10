import { useMemo } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES, PERSON_ROLE_LABELS, SOURCE_TYPES, STATUS_READING } from "../constants";
import { useProjects } from "../hooks/useProjects";
import type { SourceRow } from "../hooks/useSources";
import {
  countFacetValues,
  createEmptyFilterState,
  isFilterStateEmpty,
  type FacetKey,
  type FacetState,
  type FilterState,
} from "../lib/filtering";
import { FacetSection, type FacetOption } from "./FacetSection";

interface FilterPanelProps {
  ownerId: string;
  sources: SourceRow[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function buildLabelMap(
  sources: SourceRow[],
  extract: (source: SourceRow) => { id: string; label: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const source of sources) {
    for (const { id, label } of extract(source)) {
      if (!map.has(id)) map.set(id, label);
    }
  }
  return map;
}

function toOptions(labels: Map<string, string>, counts: Map<string, number>): FacetOption[] {
  return Array.from(labels.entries()).map(([value, label]) => ({
    value,
    label,
    count: counts.get(value) ?? 0,
  }));
}

export function FilterPanel({ ownerId, sources, filters, onChange }: FilterPanelProps) {
  const { data: projects = [] } = useProjects(ownerId);

  const tagLabels = useMemo(
    () =>
      buildLabelMap(sources, (s) =>
        s.source_tags
          .filter((st) => st.tags)
          .map((st) => ({ id: st.tags!.id, label: st.tags!.label })),
      ),
    [sources],
  );
  const authorLabels = useMemo(
    () =>
      buildLabelMap(sources, (s) =>
        s.source_people
          .filter((sp) => sp.role === "autor" && sp.people)
          .map((sp) => ({ id: sp.person_id, label: sp.people!.full_name })),
      ),
    [sources],
  );
  const advisorLabels = useMemo(
    () =>
      buildLabelMap(sources, (s) =>
        s.source_people
          .filter((sp) => (sp.role === "orientador" || sp.role === "coorientador") && sp.people)
          .map((sp) => ({
            id: sp.person_id,
            label: `${sp.people!.full_name} (${PERSON_ROLE_LABELS[sp.role as "orientador" | "coorientador"]})`,
          })),
      ),
    [sources],
  );
  const keywordLabels = useMemo(
    () =>
      buildLabelMap(sources, (s) =>
        s.source_keywords
          .filter((sk) => sk.keywords)
          .map((sk) => ({ id: sk.keywords!.id, label: sk.keywords!.label })),
      ),
    [sources],
  );
  const projectLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  const counts = useMemo(() => {
    const keys: FacetKey[] = [
      "sourceType",
      "language",
      "statusReading",
      "tags",
      "authors",
      "advisors",
      "keywords",
      "projects",
    ];
    const result = {} as Record<FacetKey, Map<string, number>>;
    for (const key of keys) result[key] = countFacetValues(sources, filters, key);
    return result;
  }, [sources, filters]);

  function updateFacet(key: FacetKey, next: { selected: string[]; mode: FacetState["mode"] }) {
    onChange({ ...filters, [key]: { values: next.selected, mode: next.mode } });
  }

  const empty = isFilterStateEmpty(filters);

  return (
    <aside className="w-72 shrink-0 space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filtros</h2>
        {!empty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange(createEmptyFilterState())}
          >
            <X className="size-3" />
            Limpar tudo
          </Button>
        )}
      </div>

      <div className="space-y-1.5 border-b pb-4">
        <Label htmlFor="filter-search" className="text-sm font-medium">
          Busca livre
        </Label>
        <Input
          id="filter-search"
          placeholder="Título ou resumo..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="space-y-1.5 border-b pb-4">
        <Label className="text-sm font-medium">Ano</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="De"
            className="h-8"
            value={filters.yearMin ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                yearMin: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Até"
            className="h-8"
            value={filters.yearMax ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                yearMax: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <FacetSection
        title="Tipo de fonte"
        options={SOURCE_TYPES.map((type) => ({
          value: type,
          label: type,
          count: counts.sourceType.get(type) ?? 0,
        }))}
        selected={filters.sourceType.values}
        mode={filters.sourceType.mode}
        onChange={(next) => updateFacet("sourceType", next)}
      />

      <FacetSection
        title="Idioma"
        options={LANGUAGES.map((lang) => ({
          value: lang,
          label: lang,
          count: counts.language.get(lang) ?? 0,
        }))}
        selected={filters.language.values}
        mode={filters.language.mode}
        onChange={(next) => updateFacet("language", next)}
      />

      <FacetSection
        title="Status de leitura"
        options={STATUS_READING.map((status) => ({
          value: status,
          label: status,
          count: counts.statusReading.get(status) ?? 0,
        }))}
        selected={filters.statusReading.values}
        mode={filters.statusReading.mode}
        onChange={(next) => updateFacet("statusReading", next)}
      />

      <FacetSection
        title="Autor"
        options={toOptions(authorLabels, counts.authors)}
        selected={filters.authors.values}
        mode={filters.authors.mode}
        onChange={(next) => updateFacet("authors", next)}
        searchable
      />

      <FacetSection
        title="Orientador / Coorientador"
        options={toOptions(advisorLabels, counts.advisors)}
        selected={filters.advisors.values}
        mode={filters.advisors.mode}
        onChange={(next) => updateFacet("advisors", next)}
        searchable
      />

      <FacetSection
        title="Tags"
        options={toOptions(tagLabels, counts.tags)}
        selected={filters.tags.values}
        mode={filters.tags.mode}
        onChange={(next) => updateFacet("tags", next)}
        searchable
      />

      <FacetSection
        title="Palavras-chave"
        options={toOptions(keywordLabels, counts.keywords)}
        selected={filters.keywords.values}
        mode={filters.keywords.mode}
        onChange={(next) => updateFacet("keywords", next)}
        searchable
        sortByCount
      />

      <FacetSection
        title="Projeto"
        options={toOptions(projectLabels, counts.projects)}
        selected={filters.projects.values}
        mode={filters.projects.mode}
        onChange={(next) => updateFacet("projects", next)}
      />
    </aside>
  );
}

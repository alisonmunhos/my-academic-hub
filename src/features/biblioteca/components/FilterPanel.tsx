import { useMemo } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "../hooks/useProjects";
import type { SourceRow } from "../hooks/useSources";
import {
  countFacetValues,
  createEmptyFilterState,
  FACET_DEFINITIONS,
  isFilterStateEmpty,
  type FacetContext,
  type FacetMode,
  type FilterState,
} from "../lib/filtering";
import { FacetSection } from "./FacetSection";

interface FilterPanelProps {
  ownerId: string;
  sources: SourceRow[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterPanel({ ownerId, sources, filters, onChange }: FilterPanelProps) {
  const { data: projects = [] } = useProjects(ownerId);

  const context: FacetContext = useMemo(
    () => ({ sources, projects: projects.map((p) => ({ id: p.id, name: p.name })) }),
    [sources, projects],
  );

  function updateFacet(key: string, next: { selected: string[]; mode: FacetMode }) {
    onChange({
      ...filters,
      facets: { ...filters.facets, [key]: { values: next.selected, mode: next.mode } },
    });
  }

  const empty = isFilterStateEmpty(filters);

  return (
    <aside className="w-full shrink-0 space-y-4 rounded-lg border p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:w-72 lg:overflow-y-auto lg:overscroll-contain">
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

      {FACET_DEFINITIONS.map((def) => {
        const facet = filters.facets[def.key] ?? { mode: "any" as FacetMode, values: [] };
        const counts = countFacetValues(sources, filters, def.key);
        const options = def.buildOptions(context).map((option) => ({
          ...option,
          count: counts.get(option.value) ?? 0,
        }));
        return (
          <FacetSection
            key={def.key}
            title={def.title}
            options={options}
            selected={facet.values}
            mode={facet.mode}
            modes={def.modes}
            onChange={(next) => updateFacet(def.key, next)}
            searchable={def.searchable ?? false}
            sortByCount={def.sortByCount ?? false}
          />
        );
      })}
    </aside>
  );
}

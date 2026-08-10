import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FacetMode } from "../lib/filtering";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

interface FacetSectionProps {
  title: string;
  options: FacetOption[];
  selected: string[];
  mode: FacetMode;
  onChange: (next: { selected: string[]; mode: FacetMode }) => void;
  searchable?: boolean;
  sortByCount?: boolean;
}

export function FacetSection({
  title,
  options,
  selected,
  mode,
  onChange,
  searchable = false,
  sortByCount = false,
}: FacetSectionProps) {
  const [query, setQuery] = useState("");

  const sorted = sortByCount
    ? [...options].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
    : options;
  const visible = searchable
    ? sorted.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  function toggleValue(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange({ selected: next, mode });
  }

  return (
    <div className="space-y-2 border-b pb-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange({ selected: [], mode: "any" })}
          >
            Limpar
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(value) => value && onChange({ selected, mode: value as FacetMode })}
          className="justify-start"
        >
          <ToggleGroupItem value="any" className="h-6 px-2 text-[11px]">
            Qualquer uma
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="h-6 px-2 text-[11px]">
            Todas
          </ToggleGroupItem>
          <ToggleGroupItem value="none" className="h-6 px-2 text-[11px]">
            Nenhuma
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {searchable && options.length > 6 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="h-7 text-xs"
        />
      )}

      <div className="max-h-44 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma opção disponível.</p>
        )}
        {visible.map((option) => {
          const id = `facet-${title}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggleValue(option.value)}
              />
              <Label htmlFor={id} className="flex-1 cursor-pointer truncate text-xs font-normal">
                {option.label}
              </Label>
              <span className="text-xs text-muted-foreground">{option.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

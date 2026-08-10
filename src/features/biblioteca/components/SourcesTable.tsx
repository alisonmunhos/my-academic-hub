import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, FileText, Quote, Star } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ALL_COLUMNS, PERSON_ROLE_LABELS } from "../constants";
import type { SourceRow } from "../hooks/useSources";

interface SourcesTableProps {
  sources: SourceRow[];
  visibleColumns: string[];
  onToggleFavorite: (source: SourceRow) => void;
  onEdit: (source: SourceRow) => void;
  onOpenLink: (source: SourceRow) => void;
  onOpenPdf: (source: SourceRow) => void;
  onCite: (source: SourceRow) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

type SortDirection = "asc" | "desc";

function getAuthorsLabel(source: SourceRow): string {
  return source.source_people
    .filter((sp) => sp.role === "autor")
    .sort((a, b) => a.position - b.position)
    .map((sp) => sp.people?.full_name ?? "")
    .filter(Boolean)
    .join("; ");
}

function getSortValue(source: SourceRow, key: string): string | number | boolean {
  switch (key) {
    case "title":
      return source.title?.toLowerCase() ?? "";
    case "authors":
      return getAuthorsLabel(source).toLowerCase();
    case "year":
      return source.year ?? -Infinity;
    case "source_type":
      return source.source_type ?? "";
    case "status_reading":
      return source.status_reading ?? "";
    case "is_favorite":
      return source.is_favorite;
    case "color_tag":
      return source.color_tag ?? "";
    case "container_title":
      return source.container_title?.toLowerCase() ?? "";
    case "language":
      return source.language ?? "";
    case "has_pdf":
      return source.has_pdf;
    case "created_at":
      return source.created_at ?? "";
    default:
      return "";
  }
}

export function SourcesTable({
  sources,
  visibleColumns,
  onToggleFavorite,
  onEdit,
  onOpenLink,
  onOpenPdf,
  onCite,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: SourcesTableProps) {
  const selectable = !!selectedIds && !!onToggleSelect;
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const columns = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key));

  const sorted = useMemo(() => {
    const copy = [...sources];
    copy.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else if (typeof va === "boolean" && typeof vb === "boolean") cmp = Number(va) - Number(vb);
      else cmp = String(va).localeCompare(String(vb), "pt-BR");
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [sources, sortKey, sortDirection]);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortIcon({ column }: { column: string }) {
    if (sortKey !== column) return <ArrowUpDown className="size-3.5 opacity-40" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
        <FileText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">Suas referências aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain rounded-lg border">
      <Table className="w-max min-w-full">

        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={sources.length > 0 && selectedIds!.size === sources.length}
                  onCheckedChange={() => onToggleSelectAll?.()}
                  aria-label="Selecionar todas"
                />
              </TableHead>
            )}
            <TableHead>
              <button
                className="flex items-center gap-1 font-medium hover:text-foreground"
                onClick={() => handleSort("title")}
              >
                Título
                <SortIcon column="title" />
              </button>
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.key}>
                <button
                  className="flex items-center gap-1 font-medium hover:text-foreground"
                  onClick={() => handleSort(column.key)}
                >
                  {column.label}
                  <SortIcon column={column.key} />
                </button>
              </TableHead>
            ))}
            <TableHead className="w-10">Citar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((source) => (
            <TableRow key={source.id} className="cursor-pointer" onClick={() => onEdit(source)}>
              {selectable && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds!.has(source.id)}
                    onCheckedChange={() => onToggleSelect?.(source.id)}
                    aria-label={`Selecionar ${source.title}`}
                  />
                </TableCell>
              )}
              <TableCell className="max-w-xs">
                <div className="flex items-center gap-2">
                  {source.color_tag && !visibleColumns.includes("color_tag") && (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: source.color_tag }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate font-medium">{source.title}</span>
                  {source.url && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLink(source);
                      }}
                      aria-label="Abrir link"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>
                  )}
                  {source.has_pdf && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPdf(source);
                      }}
                      aria-label="Abrir PDF"
                    >
                      <FileText className="size-3.5" />
                    </button>
                  )}
                </div>
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {renderCell(column.key, source, onToggleFavorite)}
                </TableCell>
              ))}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onCite(source)}
                  aria-label="Citar"
                >
                  <Quote className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderCell(key: string, source: SourceRow, onToggleFavorite: (source: SourceRow) => void) {
  switch (key) {
    case "authors": {
      const authors = source.source_people
        .filter((sp) => sp.role === "autor")
        .sort((a, b) => a.position - b.position);
      const others = source.source_people.filter((sp) => sp.role !== "autor");
      const authorLabel = authors
        .map((sp) => sp.people?.full_name)
        .filter(Boolean)
        .join("; ");
      return (
        <div className="max-w-56">
          <p className="truncate text-sm">{authorLabel || "—"}</p>
          {others.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {others
                .map(
                  (sp) =>
                    `${PERSON_ROLE_LABELS[sp.role as keyof typeof PERSON_ROLE_LABELS] ?? sp.role}: ${sp.people?.full_name ?? ""}`,
                )
                .join("; ")}
            </p>
          )}
        </div>
      );
    }
    case "year":
      return source.year ?? "—";
    case "source_type":
      return source.source_type;
    case "status_reading":
      return source.status_reading;
    case "is_favorite":
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(source);
          }}
          aria-label={source.is_favorite ? "Remover dos favoritos" : "Marcar como favorito"}
        >
          <Star
            className={cn(
              "size-4",
              source.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
            )}
          />
        </Button>
      );
    case "color_tag":
      return source.color_tag ? (
        <span
          className="inline-block size-4 rounded-full border"
          style={{ backgroundColor: source.color_tag }}
          aria-label={source.color_tag}
        />
      ) : (
        "—"
      );
    case "container_title":
      return source.container_title || "—";
    case "language":
      return source.language || "—";
    case "has_pdf":
      return source.has_pdf ? <FileText className="size-4 text-muted-foreground" /> : "—";
    case "created_at":
      return new Date(source.created_at).toLocaleDateString("pt-BR");
    default:
      return null;
  }
}

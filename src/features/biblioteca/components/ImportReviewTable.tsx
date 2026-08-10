import { AlertTriangle, CheckCircle2, Copy, FileText, Link2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES, SOURCE_TYPES } from "../constants";
import { getCandidateStatus, getMissingFields, type ImportCandidate } from "../lib/import";

export interface DuplicateInfo {
  id: string;
  title: string;
  local?: boolean;
}

interface ImportReviewTableProps {
  candidates: ImportCandidate[];
  duplicates: Map<string, DuplicateInfo | null>;
  onChange: (localId: string, patch: Partial<ImportCandidate>) => void;
  onRemove: (localId: string) => void;
  onOpenExisting?: (id: string) => void;
}

const ORIGIN_ICON: Record<ImportCandidate["origin"], typeof Link2> = {
  link: Link2,
  ris: FileText,
  pdf: FileText,
};

function StatusBadge({
  candidate,
  duplicateOf,
}: {
  candidate: ImportCandidate;
  duplicateOf: DuplicateInfo | null;
}) {
  const status = getCandidateStatus(candidate, duplicateOf);
  if (status === "duplicate") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Copy className="size-3" />
        {duplicateOf?.local ? "Duplicata neste lote" : "Já existe"}
      </Badge>
    );
  }
  if (status === "missing_title") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" />
        Título obrigatório
      </Badge>
    );
  }
  if (status === "missing_fields") {
    return (
      <Badge variant="outline" className="gap-1 text-amber-600">
        <AlertTriangle className="size-3" />
        Campos faltando: {getMissingFields(candidate).join(", ")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-emerald-600">
      <CheckCircle2 className="size-3" />
      Completo
    </Badge>
  );
}

export function ImportReviewTable({
  candidates,
  duplicates,
  onChange,
  onRemove,
  onOpenExisting,
}: ImportReviewTableProps) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const duplicateOf = duplicates.get(candidate.localId) ?? null;
        const OriginIcon = ORIGIN_ICON[candidate.origin];
        return (
          <Card key={candidate.localId}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <OriginIcon className="size-3.5" />
                  <StatusBadge candidate={candidate} duplicateOf={duplicateOf} />
                  {duplicateOf && !duplicateOf.local && onOpenExisting && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => onOpenExisting(duplicateOf.id)}
                    >
                      Ver registro existente
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => onRemove(candidate.localId)}
                  aria-label="Remover da importação"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    value={candidate.title}
                    onChange={(e) => onChange(candidate.localId, { title: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Autores (separados por ;)</Label>
                  <Input
                    value={candidate.authors}
                    placeholder="Sobrenome, Nome; Sobrenome2, Nome2"
                    onChange={(e) => onChange(candidate.localId, { authors: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Ano</Label>
                  <Input
                    type="number"
                    value={candidate.year ?? ""}
                    onChange={(e) =>
                      onChange(candidate.localId, {
                        year: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={candidate.sourceType}
                    onValueChange={(value) =>
                      onChange(candidate.localId, {
                        sourceType: value as ImportCandidate["sourceType"],
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Veículo / publicado em</Label>
                  <Input
                    value={candidate.containerTitle}
                    onChange={(e) =>
                      onChange(candidate.localId, { containerTitle: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">DOI</Label>
                  <Input
                    value={candidate.doi}
                    onChange={(e) => onChange(candidate.localId, { doi: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Idioma</Label>
                  <Select
                    value={candidate.language ?? "none"}
                    onValueChange={(value) =>
                      onChange(candidate.localId, {
                        language: value === "none" ? null : (value as ImportCandidate["language"]),
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={candidate.url}
                    onChange={(e) => onChange(candidate.localId, { url: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Resumo</Label>
                  <Textarea
                    rows={2}
                    value={candidate.abstract}
                    onChange={(e) => onChange(candidate.localId, { abstract: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Palavras-chave (separadas por ; ou ,)</Label>
                  <Input
                    value={candidate.keywords}
                    onChange={(e) => onChange(candidate.localId, { keywords: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

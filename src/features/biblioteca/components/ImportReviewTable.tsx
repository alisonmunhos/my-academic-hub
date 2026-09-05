import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  GitMerge,
  Link2,
  Sparkles,
  X,
} from "lucide-react";

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
import {
  isMergeFullyResolved,
  type MergeDecisions,
  type MergeFieldKey,
  type MergePlan,
} from "../lib/merge";

export interface DuplicateInfo {
  id: string;
  title: string;
  local?: boolean;
}

interface ImportReviewTableProps {
  candidates: ImportCandidate[];
  duplicates: Map<string, DuplicateInfo | null>;
  mergePlans: Map<string, MergePlan>;
  mergeDecisions: Record<string, MergeDecisions>;
  onMergeFieldDecision: (
    localId: string,
    field: MergeFieldKey,
    decision: "existing" | "new",
  ) => void;
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
  mergeConflictsPending,
}: {
  candidate: ImportCandidate;
  duplicateOf: DuplicateInfo | null;
  mergeConflictsPending: boolean;
}) {
  const status = getCandidateStatus(candidate, duplicateOf, mergeConflictsPending);
  if (status === "duplicate") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Copy className="size-3" />
        Duplicata neste lote
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
  if (status === "merge_conflict") {
    return (
      <Badge variant="destructive" className="gap-1">
        <GitMerge className="size-3" />
        Já existe — resolva os conflitos abaixo
      </Badge>
    );
  }
  if (status === "merge_ready") {
    return (
      <Badge variant="outline" className="gap-1 text-blue-600">
        <GitMerge className="size-3" />
        Será mesclada com a fonte existente
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

function MergeConflictPanel({
  candidate,
  plan,
  decisions,
  onDecision,
}: {
  candidate: ImportCandidate;
  plan: MergePlan;
  decisions: MergeDecisions;
  onDecision: (field: MergeFieldKey, decision: "existing" | "new") => void;
}) {
  const conflicts = plan.fieldDiffs.filter((d) => d.status === "conflict");
  const extras = [
    plan.newTitles.length > 0 && `${plan.newTitles.length} título(s) alternativo(s)`,
    plan.newAbstracts.length > 0 && `${plan.newAbstracts.length} resumo(s)`,
    plan.newLinks.length > 0 && `${plan.newLinks.length} link(s)`,
    plan.newKeywordLabels.length > 0 && `${plan.newKeywordLabels.length} palavra(s)-chave`,
    plan.newAuthorNames.length > 0 && `${plan.newAuthorNames.length} autor(es)`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
      <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
        Mesclagem por enriquecimento: nenhuma fonte nova será criada — os dados abaixo se somam à
        fonte já existente.
      </p>
      {extras.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Adiciona automaticamente: {extras.join(", ")}.
        </p>
      )}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-destructive">
            Campos com valores diferentes — escolha qual manter:
          </p>
          {conflicts.map((diff) => {
            const decision = decisions[diff.field] ?? "existing";
            return (
              <div key={diff.field} className="space-y-1 rounded border bg-background p-2">
                <p className="text-xs font-medium">{diff.label}</p>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="radio"
                    className="mt-0.5"
                    name={`${candidate.localId}-${diff.field}`}
                    checked={decision === "existing"}
                    onChange={() => onDecision(diff.field, "existing")}
                  />
                  <span>
                    Manter atual:{" "}
                    <span className="text-muted-foreground">{String(diff.existingValue)}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="radio"
                    className="mt-0.5"
                    name={`${candidate.localId}-${diff.field}`}
                    checked={decision === "new"}
                    onChange={() => onDecision(diff.field, "new")}
                  />
                  <span>
                    Usar novo:{" "}
                    <span className="text-muted-foreground">{String(diff.candidateValue)}</span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ImportReviewTable({
  candidates,
  duplicates,
  mergePlans,
  mergeDecisions,
  onMergeFieldDecision,
  onChange,
  onRemove,
  onOpenExisting,
}: ImportReviewTableProps) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const duplicateOf = duplicates.get(candidate.localId) ?? null;
        const plan = mergePlans.get(candidate.localId);
        const decisions = mergeDecisions[candidate.localId] ?? {};
        const mergeConflictsPending = plan ? !isMergeFullyResolved(plan, decisions) : false;
        const OriginIcon = ORIGIN_ICON[candidate.origin];
        return (
          <Card key={candidate.localId}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <OriginIcon className="size-3.5" />
                  <StatusBadge
                    candidate={candidate}
                    duplicateOf={duplicateOf}
                    mergeConflictsPending={mergeConflictsPending}
                  />
                  {candidate.enrichedViaCrossref && (
                    <Badge variant="outline" className="gap-1 text-violet-600">
                      <Sparkles className="size-3" />
                      Dados padronizados via Crossref
                    </Badge>
                  )}
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

              {plan && (
                <MergeConflictPanel
                  candidate={candidate}
                  plan={plan}
                  decisions={decisions}
                  onDecision={(field, decision) =>
                    onMergeFieldDecision(candidate.localId, field, decision)
                  }
                />
              )}

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

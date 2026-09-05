import { useMemo, useState } from "react";
import { CheckCircle2, Copy, GitMerge, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { computeDuplicateReview } from "../lib/duplicates";
import { useIgnoreDuplicate, useMarkVariantGroup } from "../hooks/useDuplicates";
import { useMergeSources } from "../hooks/useMergeSources";
import type { SourceRow } from "../hooks/useSources";

interface DuplicatesPanelProps {
  ownerId: string;
  sources: SourceRow[];
}

function sourceSummary(source: SourceRow): string {
  const authors = source.source_people
    .filter((sp) => sp.role === "autor")
    .sort((a, b) => a.position - b.position)
    .map((sp) => sp.people?.full_name)
    .filter(Boolean)
    .join("; ");
  return [authors, source.year, source.source_type].filter(Boolean).join(" · ");
}

export function DuplicatesPanel({ ownerId, sources }: DuplicatesPanelProps) {
  const review = useMemo(() => computeDuplicateReview(sources), [sources]);
  const markVariant = useMarkVariantGroup(ownerId);
  const ignoreDuplicate = useIgnoreDuplicate(ownerId);
  const mergeSources = useMergeSources(ownerId);
  const [mergingChaveDoc, setMergingChaveDoc] = useState<string | null>(null);

  async function handleMarkVariant(sourceIds: string[]) {
    try {
      await markVariant.mutateAsync(sourceIds);
      toast.success("Marcado como variante.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível marcar como variante.");
    }
  }

  /** Mescla todas as fontes do grupo na mais antiga (RF7) — nenhuma fonte nova, nenhum dado apagado. */
  async function handleMerge(group: { chaveDoc: string; sources: SourceRow[] }) {
    const ordered = [...group.sources].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const survivor = ordered[0];
    if (!survivor) return;
    setMergingChaveDoc(group.chaveDoc);
    try {
      for (const loser of ordered.slice(1)) {
        await mergeSources.mutateAsync({ survivorId: survivor.id, loserId: loser.id });
      }
      toast.success(`${ordered.length - 1} fonte(s) mesclada(s) em "${survivor.title}".`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível mesclar essas fontes.");
    } finally {
      setMergingChaveDoc(null);
    }
  }

  async function handleIgnore(sourceId: string) {
    try {
      await ignoreDuplicate.mutateAsync(sourceId);
      toast.success("Ignorado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ignorar.");
    }
  }

  const total = review.groups.length + review.standalone.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
        <CheckCircle2 className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma duplicata pendente de revisão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {review.groups.map((group) => (
        <Card key={group.chaveDoc}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="gap-1">
                <Copy className="size-3" />
                {group.sources.length} fontes com a mesma chave
              </Badge>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => handleMerge(group)}
                  disabled={mergingChaveDoc === group.chaveDoc}
                  title="Mescla por enriquecimento na fonte mais antiga do grupo: campos e listas exclusivos das outras entram, nada é apagado."
                >
                  <GitMerge className="size-3.5" />
                  {mergingChaveDoc === group.chaveDoc ? "Mesclando..." : "Mesclar"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleMarkVariant(group.sources.map((s) => s.id))}
                  disabled={markVariant.isPending}
                >
                  Marcar como variantes
                </Button>
              </div>
            </div>
            <div className="divide-y rounded-md border">
              {group.sources.map((source) => (
                <div key={source.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{source.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sourceSummary(source)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleIgnore(source.id)}
                    disabled={ignoreDuplicate.isPending}
                  >
                    Ignorar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {review.standalone.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Badge variant="secondary" className="gap-1">
              <ShieldQuestion className="size-3" />
              Marcadas para revisão
            </Badge>
            <div className="divide-y rounded-md border">
              {review.standalone.map((source) => (
                <div key={source.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{source.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sourceSummary(source)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleIgnore(source.id)}
                    disabled={ignoreDuplicate.isPending}
                  >
                    Ignorar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

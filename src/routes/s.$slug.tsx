import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getCitations } from "@/features/biblioteca/lib/citations";
import type { SourceRow } from "@/features/biblioteca/hooks/useSources";

export const Route = createFileRoute("/s/$slug")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Fonte compartilhada | Biblioteca de Referências" }],
  }),
  component: PublicSourcePage,
});

const PUBLIC_SOURCE_SELECT =
  "*, source_people(source_id, person_id, role, position, people(id, full_name)), " +
  "source_keywords(keywords(id, label)), source_tags(tags(id, label, color)), " +
  "project_sources(project_id)";

function usePublicSource(slug: string) {
  return useQuery({
    queryKey: ["public-source", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select(PUBLIC_SOURCE_SELECT)
        .eq("public_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as SourceRow | null;
    },
  });
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiada.`);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

function PublicSourcePage() {
  const { slug } = Route.useParams();
  const { data: source, isLoading } = usePublicSource(slug);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookMarked className="size-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-card-foreground">
              Biblioteca de Referências
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !source ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Esta fonte não existe ou não está mais compartilhada.
            </p>
          </div>
        ) : (
          <SourceDetail source={source} />
        )}
      </main>
    </div>
  );
}

function SourceDetail({ source }: { source: SourceRow }) {
  const authors = source.source_people
    .filter((sp) => sp.role === "autor")
    .sort((a, b) => a.position - b.position)
    .map((sp) => sp.people?.full_name)
    .filter(Boolean)
    .join("; ");
  const citations = getCitations(source);

  return (
    <article className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{source.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[authors, source.year, source.source_type].filter(Boolean).join(" · ")}
        </p>
      </div>

      {source.abstract && (
        <div>
          <h2 className="text-sm font-semibold">Resumo</h2>
          <p className="mt-1 text-sm text-muted-foreground">{source.abstract}</p>
        </div>
      )}

      {source.source_keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {source.source_keywords.map(
            (sk) =>
              sk.keywords && (
                <Badge key={sk.keywords.id} variant="secondary">
                  {sk.keywords.label}
                </Badge>
              ),
          )}
        </div>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Acessar fonte original
        </a>
      )}

      <div className="space-y-3 border-t pt-4">
        <h2 className="text-sm font-semibold">Como citar</h2>
        <CitationRow label="Referência completa (ABNT)" text={citations.full} />
        <CitationRow label="Citação integrada" text={citations.integrated} />
        <CitationRow label="Citação parentética" text={citations.parenthetical} />
      </div>
    </article>
  );
}

function CitationRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => copyText(text, label)}
        >
          <Copy className="size-3" />
          Copiar
        </Button>
      </div>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{text}</p>
    </div>
  );
}

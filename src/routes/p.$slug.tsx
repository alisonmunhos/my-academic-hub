import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Projeto compartilhado | Biblioteca de Referências" }],
  }),
  component: PublicProjectPage,
});

type PublicProject = Tables<"projects">;

type PublicProjectSourceEntry = {
  source_id: string;
  sources: {
    id: string;
    title: string;
    year: number | null;
    source_type: string;
    is_public: boolean;
    public_slug: string | null;
    source_people: {
      role: string;
      position: number;
      people: { full_name: string } | null;
    }[];
  } | null;
};

function usePublicProject(slug: string) {
  return useQuery({
    queryKey: ["public-project", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("public_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PublicProject | null;
    },
  });
}

function usePublicProjectSources(projectId: string | undefined) {
  return useQuery({
    queryKey: ["public-project-sources", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sources")
        .select(
          "source_id, sources(id, title, year, source_type, is_public, public_slug, " +
            "source_people(role, position, people(full_name)))",
        )
        .eq("project_id", projectId as string)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicProjectSourceEntry[];
    },
  });
}

function PublicProjectPage() {
  const { slug } = Route.useParams();
  const { data: project, isLoading } = usePublicProject(slug);
  const { data: entries = [], isLoading: isLoadingSources } = usePublicProjectSources(project?.id);

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
        ) : !project ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Este projeto não existe ou não está mais compartilhado.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">
                {entries.length} {entries.length === 1 ? "fonte" : "fontes"}
              </h2>
              {isLoadingSources ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fonte neste projeto ainda.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {entries.map((entry) => {
                    const source = entry.sources;
                    if (!source) return null;
                    const authors = source.source_people
                      .filter((sp) => sp.role === "autor")
                      .sort((a, b) => a.position - b.position)
                      .map((sp) => sp.people?.full_name)
                      .filter(Boolean)
                      .join("; ");
                    const meta = [authors, source.year, source.source_type]
                      .filter(Boolean)
                      .join(" · ");
                    const canLink = source.is_public && source.public_slug;
                    return (
                      <div key={entry.source_id} className="px-4 py-2.5">
                        {canLink ? (
                          <Link
                            to="/s/$slug"
                            params={{ slug: source.public_slug! }}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {source.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{source.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{meta}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

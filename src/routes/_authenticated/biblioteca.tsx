import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookMarked, Loader2, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ColumnVisibilityMenu } from "@/features/biblioteca/components/ColumnVisibilityMenu";
import { FilterPanel } from "@/features/biblioteca/components/FilterPanel";
import { SourceFormDialog } from "@/features/biblioteca/components/SourceFormDialog";
import { SourcesTable } from "@/features/biblioteca/components/SourcesTable";
import {
  useRecordAccess,
  useSources,
  useToggleFavorite,
} from "@/features/biblioteca/hooks/useSources";
import {
  useSetVisibleColumns,
  useVisibleColumns,
} from "@/features/biblioteca/hooks/useUserPreferences";
import type { SourceRow } from "@/features/biblioteca/hooks/useSources";
import { createEmptyFilterState, filterSources } from "@/features/biblioteca/lib/filtering";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Minhas referências | Biblioteca de Referências" },
      {
        name: "description",
        content: "Sua biblioteca pessoal de referências acadêmicas em um só lugar.",
      },
      { property: "og:title", content: "Minhas referências | Biblioteca de Referências" },
      {
        property: "og:description",
        content: "Sua biblioteca pessoal de referências acadêmicas em um só lugar.",
      },
    ],
  }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const ownerId = user?.id;

  const { data: sources = [], isLoading } = useSources(ownerId);
  const visibleColumns = useVisibleColumns(ownerId);
  const setVisibleColumns = useSetVisibleColumns(ownerId);
  const toggleFavorite = useToggleFavorite(ownerId);
  const recordAccess = useRecordAccess(ownerId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [filters, setFilters] = useState(createEmptyFilterState);

  const editingSource: SourceRow | null = sources.find((s) => s.id === editingSourceId) ?? null;
  const filteredSources = useMemo(() => filterSources(sources, filters), [sources, filters]);

  async function sair() {
    await supabase?.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  function openNewSource() {
    setEditingSourceId(null);
    setDialogOpen(true);
  }

  function openEditSource(source: SourceRow) {
    setEditingSourceId(source.id);
    setDialogOpen(true);
  }

  function switchToSource(id: string) {
    setEditingSourceId(id);
    setDialogOpen(true);
  }

  async function handleOpenLink(source: SourceRow) {
    if (!source.url) return;
    window.open(source.url, "_blank", "noopener,noreferrer");
    recordAccess.mutate(source.id);
  }

  async function handleOpenPdf(source: SourceRow) {
    if (!source.pdf_storage_path) return;
    const { data, error } = await supabase.storage
      .from("source-pdfs")
      .createSignedUrl(source.pdf_storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o PDF.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    recordAccess.mutate(source.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookMarked className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-card-foreground">
                Biblioteca de Referências
              </h1>
              {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={sair}>
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Minhas referências
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {filteredSources.length} de {sources.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <ColumnVisibilityMenu
              visibleColumns={visibleColumns}
              onChange={(columns) => setVisibleColumns.mutate(columns)}
            />
            <Button size="sm" onClick={openNewSource}>
              <Plus className="size-4" />
              Nova fonte
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="flex items-start gap-4">
            {ownerId && (
              <FilterPanel
                ownerId={ownerId}
                sources={sources}
                filters={filters}
                onChange={setFilters}
              />
            )}
            <div className="min-w-0 flex-1">
              <SourcesTable
                sources={filteredSources}
                visibleColumns={visibleColumns}
                onToggleFavorite={(source) =>
                  toggleFavorite.mutate({ id: source.id, isFavorite: !source.is_favorite })
                }
                onEdit={openEditSource}
                onOpenLink={handleOpenLink}
                onOpenPdf={handleOpenPdf}
              />
            </div>
          </div>
        )}
      </main>

      {ownerId && dialogOpen && (
        <SourceFormDialog
          key={editingSourceId ?? "new"}
          ownerId={ownerId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          source={editingSource}
          onSwitchToSource={switchToSource}
        />
      )}
    </div>
  );
}

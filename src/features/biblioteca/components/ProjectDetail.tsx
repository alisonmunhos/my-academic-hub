import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAddSourcesToProject,
  useProjectSources,
  useRemoveSourceFromProject,
} from "../hooks/useProjectSources";
import type { ProjectOption } from "../hooks/useProjects";
import type { SourceRow } from "../hooks/useSources";

interface ProjectDetailProps {
  ownerId: string;
  project: ProjectOption;
  allSources: SourceRow[];
  onBack: () => void;
}

export function ProjectDetail({ ownerId, project, allSources, onBack }: ProjectDetailProps) {
  const { data: entries = [], isLoading } = useProjectSources(project.id);
  const addSources = useAddSourcesToProject(ownerId);
  const removeSource = useRemoveSourceFromProject(ownerId);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  const memberIds = new Set(entries.map((e) => e.source_id));
  const candidates = allSources.filter(
    (s) => !memberIds.has(s.id) && s.title.toLowerCase().includes(query.toLowerCase()),
  );

  async function handleAdd(sourceId: string) {
    try {
      await addSources.mutateAsync({ projectId: project.id, sourceIds: [sourceId] });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível adicionar a fonte ao projeto.");
    }
  }

  async function handleRemove(sourceId: string) {
    try {
      await removeSource.mutateAsync({ projectId: project.id, sourceId });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível remover a fonte do projeto.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "fonte" : "fontes"}
        </p>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-3.5" />
              Adicionar fontes
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar por título..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>Nenhuma fonte encontrada.</CommandEmpty>
                <CommandGroup>
                  {candidates.slice(0, 30).map((source) => (
                    <CommandItem key={source.id} onSelect={() => handleAdd(source.id)}>
                      <span className="truncate">
                        {source.title}
                        {source.year ? ` (${source.year})` : ""}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma fonte neste projeto ainda.</p>
        </div>
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
            return (
              <div key={entry.source_id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{source.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[authors, source.year, source.source_type].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-destructive"
                  onClick={() => handleRemove(entry.source_id)}
                  aria-label="Remover do projeto"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

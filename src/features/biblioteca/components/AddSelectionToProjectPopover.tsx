import { useState } from "react";
import { FolderPlus, Plus } from "lucide-react";
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
import { useAddSourcesToProject } from "../hooks/useProjectSources";
import { useCreateProject, useProjects } from "../hooks/useProjects";

interface AddSelectionToProjectPopoverProps {
  ownerId: string;
  sourceIds: string[];
  onDone: () => void;
}

export function AddSelectionToProjectPopover({
  ownerId,
  sourceIds,
  onDone,
}: AddSelectionToProjectPopoverProps) {
  const { data: projects = [] } = useProjects(ownerId);
  const addSources = useAddSourcesToProject(ownerId);
  const createProject = useCreateProject(ownerId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visible = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = projects.some((p) => p.name.toLowerCase() === query.trim().toLowerCase());

  async function handleAdd(projectId: string, projectName: string) {
    try {
      await addSources.mutateAsync({ projectId, sourceIds });
      toast.success(`${sourceIds.length} fonte(s) adicionada(s) a "${projectName}".`);
      setOpen(false);
      setQuery("");
      onDone();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível adicionar ao projeto.");
    }
  }

  async function handleCreateAndAdd() {
    const name = query.trim();
    if (!name) return;
    try {
      const project = await createProject.mutateAsync({ name, description: "" });
      await handleAdd(project.id, project.name);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível criar o projeto.");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          <FolderPlus className="size-4" />
          Adicionar ao projeto
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou criar projeto..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
            <CommandGroup>
              {visible.map((project) => (
                <CommandItem key={project.id} onSelect={() => handleAdd(project.id, project.name)}>
                  {project.name}
                </CommandItem>
              ))}
              {query.trim() && !exactMatch && (
                <CommandItem onSelect={handleCreateAndAdd} disabled={createProject.isPending}>
                  <Plus className="size-3.5" />
                  Criar projeto "{query.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

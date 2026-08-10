import { useState } from "react";
import { ArrowLeft, FolderPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const visible = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  function reset() {
    setQuery("");
    setCreating(false);
    setNewName("");
    setNewDescription("");
  }

  function closeAfterAdd() {
    setOpen(false);
    reset();
    onDone();
  }

  async function handleAdd(projectId: string, projectName: string) {
    try {
      await addSources.mutateAsync({ projectId, sourceIds });
      toast.success(`${sourceIds.length} fonte(s) adicionada(s) a "${projectName}".`);
      closeAfterAdd();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível adicionar ao projeto.");
    }
  }

  function startCreating() {
    setNewName(query.trim());
    setCreating(true);
  }

  async function handleCreateAndAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      const project = await createProject.mutateAsync({
        name,
        description: newDescription.trim(),
      });
      await handleAdd(project.id, project.name);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível criar o projeto.");
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          <FolderPlus className="size-4" />
          Adicionar ao projeto
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {creating ? (
          <div className="space-y-3 p-3">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setCreating(false)}
            >
              <ArrowLeft className="size-3" />
              Voltar
            </button>
            <div className="space-y-1.5">
              <Label htmlFor="new-project-name" className="text-xs">
                Nome do projeto
              </Label>
              <Input
                id="new-project-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-project-description" className="text-xs">
                Descrição (opcional)
              </Label>
              <Textarea
                id="new-project-description"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!newName.trim() || createProject.isPending || addSources.isPending}
              onClick={handleCreateAndAdd}
            >
              {(createProject.isPending || addSources.isPending) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Criar e adicionar {sourceIds.length} fonte(s)
            </Button>
          </div>
        ) : (
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar projeto..." value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandGroup>
                <CommandItem onSelect={startCreating} className="text-primary">
                  <Plus className="size-3.5" />
                  Criar novo projeto
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                {visible.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleAdd(project.id, project.name)}
                  >
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

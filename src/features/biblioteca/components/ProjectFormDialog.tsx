import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject, useUpdateProject, type ProjectOption } from "../hooks/useProjects";

interface ProjectFormDialogProps {
  ownerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectOption | null;
  onSaved?: (projectId: string) => void;
}

export function ProjectFormDialog({
  ownerId,
  open,
  onOpenChange,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const createProject = useCreateProject(ownerId);
  const updateProject = useUpdateProject(ownerId);
  const isPending = createProject.isPending || updateProject.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, name: name.trim(), description });
        toast.success("Projeto atualizado.");
        onSaved?.(project.id);
      } else {
        const created = await createProject.mutateAsync({ name: name.trim(), description });
        toast.success("Projeto criado.");
        onSaved?.(created.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o projeto.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nome *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

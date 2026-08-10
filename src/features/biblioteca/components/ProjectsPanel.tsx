import { useState } from "react";
import { FolderKanban, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteProject, useProjects, type ProjectOption } from "../hooks/useProjects";
import type { SourceRow } from "../hooks/useSources";
import { ProjectDetail } from "./ProjectDetail";
import { ProjectFormDialog } from "./ProjectFormDialog";

interface ProjectsPanelProps {
  ownerId: string;
  allSources: SourceRow[];
}

export function ProjectsPanel({ ownerId, allSources }: ProjectsPanelProps) {
  const { data: projects = [], isLoading } = useProjects(ownerId);
  const deleteProject = useDeleteProject(ownerId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectOption | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectOption | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  function openNewProject() {
    setEditingProject(null);
    setFormOpen(true);
  }

  function openEditProject(project: ProjectOption) {
    setEditingProject(project);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync(deletingProject.id);
      toast.success("Projeto excluído.");
      if (selectedProjectId === deletingProject.id) setSelectedProjectId(null);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir o projeto.");
    } finally {
      setDeletingProject(null);
    }
  }

  if (selectedProject) {
    return (
      <ProjectDetail
        ownerId={ownerId}
        project={selectedProject}
        allSources={allSources}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projetos</h2>
        <Button size="sm" onClick={openNewProject}>
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <FolderKanban className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum projeto ainda. Crie um para organizar suas fontes por tema, disciplina ou
            trabalho.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => setSelectedProjectId(project.id)}
            >
              <CardContent className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{project.name}</p>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Mais opções"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => openEditProject(project)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setDeletingProject(project)}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog
        ownerId={ownerId}
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
      />

      <AlertDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingProject?.name}" será excluído. As fontes não serão apagadas, apenas
              removidas deste projeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

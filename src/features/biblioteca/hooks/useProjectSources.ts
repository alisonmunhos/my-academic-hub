import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";
import { sourcesQueryKey } from "./useSources";

export type ProjectSourceEntry = {
  source_id: string;
  added_at: string;
  sources: {
    id: string;
    title: string;
    year: number | null;
    source_type: string;
    status_reading: string;
    source_people: {
      person_id: string;
      role: string;
      position: number;
      people: Pick<Tables<"people">, "full_name"> | null;
    }[];
  } | null;
};

export const projectSourcesQueryKey = (projectId: string | undefined) =>
  ["project_sources", projectId] as const;

export function useProjectSources(projectId: string | undefined) {
  return useQuery({
    queryKey: projectSourcesQueryKey(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sources")
        .select(
          "source_id, added_at, sources(id, title, year, source_type, status_reading, " +
            "source_people(person_id, role, position, people(full_name)))",
        )
        .eq("project_id", projectId as string)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectSourceEntry[];
    },
  });
}

export function useAddSourcesToProject(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sourceIds }: { projectId: string; sourceIds: string[] }) => {
      if (sourceIds.length === 0) return;
      const { error } = await supabase.from("project_sources").upsert(
        sourceIds.map((source_id) => ({ project_id: projectId, source_id })),
        { onConflict: "project_id,source_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectSourcesQueryKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) });
    },
  });
}

export function useRemoveSourceFromProject(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sourceId }: { projectId: string; sourceId: string }) => {
      const { error } = await supabase
        .from("project_sources")
        .delete()
        .eq("project_id", projectId)
        .eq("source_id", sourceId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectSourcesQueryKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) });
    },
  });
}

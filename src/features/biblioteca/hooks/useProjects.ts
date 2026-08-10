import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";
import { generateUniqueSlug } from "../lib/slug";

export type ProjectOption = Tables<"projects">;

export const projectsQueryKey = (ownerId: string | undefined) => ["projects", ownerId] as const;

export function useProjects(ownerId: string | undefined) {
  return useQuery({
    queryKey: projectsQueryKey(ownerId),
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", ownerId as string)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProject(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, description: description || null, owner_id: ownerId as string })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(ownerId) }),
  });
}

export function useUpdateProject(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string;
      name: string;
      description: string;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update({ name, description: description || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(ownerId) }),
  });
}

export function useDeleteProject(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(ownerId) }),
  });
}

export function useToggleProjectPublic(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      isPublic,
      existingSlug,
    }: {
      id: string;
      name: string;
      isPublic: boolean;
      existingSlug: string | null;
    }) => {
      const publicSlug =
        isPublic && !existingSlug ? await generateUniqueSlug("projects", name) : existingSlug;
      const { error } = await supabase
        .from("projects")
        .update({ is_public: isPublic, public_slug: publicSlug })
        .eq("id", id);
      if (error) throw error;
      return publicSlug;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(ownerId) }),
  });
}

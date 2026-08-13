import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";

export type SourcePersonRow = Tables<"source_people"> & {
  people: Pick<Tables<"people">, "id" | "full_name"> | null;
};

export type SourceKeywordRow = {
  keywords: Pick<Tables<"keywords">, "id" | "label"> | null;
};

export type SourceTagRow = {
  tags: Pick<Tables<"tags">, "id" | "label" | "color"> | null;
};

export type SourceProjectRow = {
  project_id: string;
};

export type SourceRow = Tables<"sources"> & {
  source_people: SourcePersonRow[];
  source_keywords: SourceKeywordRow[];
  source_tags: SourceTagRow[];
  project_sources: SourceProjectRow[];
  source_titles: Tables<"source_titles">[];
  source_abstracts: Tables<"source_abstracts">[];
  source_links: Tables<"source_links">[];
};

export const sourcesQueryKey = (ownerId: string | undefined) => ["sources", ownerId] as const;

const SOURCE_SELECT =
  "*, source_people(source_id, person_id, role, position, people(id, full_name)), " +
  "source_keywords(keywords(id, label)), source_tags(tags(id, label, color)), " +
  "project_sources(project_id), " +
  "source_titles(id, title_text, language, title_type), " +
  "source_abstracts(id, abstract_text, language), " +
  "source_links(id, url, link_type, label)";

export function useSources(ownerId: string | undefined) {
  return useQuery({
    queryKey: sourcesQueryKey(ownerId),
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select(SOURCE_SELECT)
        .eq("owner_id", ownerId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SourceRow[];
    },
  });
}

export function useToggleFavorite(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("sources")
        .update({ is_favorite: isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

export function useDeleteSource(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

/** Marca a data de acesso como agora, sem bloquear a navegação até o link/PDF. */
export function useRecordAccess(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sources")
        .update({ access_date: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

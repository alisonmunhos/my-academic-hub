import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";

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

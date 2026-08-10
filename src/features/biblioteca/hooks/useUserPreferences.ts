import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { DEFAULT_VISIBLE_COLUMNS } from "../constants";

export function useUserPreferences(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["user_preferences", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("owner_id", ownerId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useVisibleColumns(ownerId: string | undefined) {
  const { data } = useUserPreferences(ownerId);
  const columns = (data?.visible_columns as string[] | null | undefined) ?? [];
  return columns.length > 0 ? columns : DEFAULT_VISIBLE_COLUMNS;
}

export function useSetVisibleColumns(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (columns: string[]) => {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          owner_id: ownerId as string,
          visible_columns: columns,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_preferences", ownerId] }),
  });
}

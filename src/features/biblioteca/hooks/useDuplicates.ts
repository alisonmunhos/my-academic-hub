import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { sourcesQueryKey } from "./useSources";

/** Marca um grupo de fontes como variantes confirmadas, compartilhando duplicate_group_id — sem fundir os registros. */
export function useMarkVariantGroup(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceIds: string[]) => {
      if (sourceIds.length < 2) return;
      const groupId = crypto.randomUUID();
      const { error } = await supabase
        .from("sources")
        .update({ duplicate_group_id: groupId, duplicate_status: "Variante confirmada" })
        .in("id", sourceIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

export function useIgnoreDuplicate(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { error } = await supabase
        .from("sources")
        .update({ duplicate_status: "Não" })
        .eq("id", sourceId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesQueryKey(ownerId) }),
  });
}

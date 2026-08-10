import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";
import { upsertKeyword, upsertPerson } from "../lib/upsertLookup";

export type PersonOption = Tables<"people">;
export type KeywordOption = Tables<"keywords">;
export type TagOption = Tables<"tags">;

export function usePeople(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["people", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("owner_id", ownerId as string)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePerson(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fullName: string) => upsertPerson(ownerId as string, fullName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people", ownerId] }),
  });
}

export function useKeywords(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["keywords", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keywords")
        .select("*")
        .eq("owner_id", ownerId as string)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateKeyword(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: string) => upsertKeyword(ownerId as string, label),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keywords", ownerId] }),
  });
}

export function useTags(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["tags", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("owner_id", ownerId as string)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTag(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, color }: { label: string; color: string }) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({ label, color, owner_id: ownerId as string })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags", ownerId] }),
  });
}

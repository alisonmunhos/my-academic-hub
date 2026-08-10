import { supabase } from "@/lib/supabase";

function slugifyBase(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Gera um slug único (verificado contra o banco) para compartilhamento público. */
export async function generateUniqueSlug(
  table: "sources" | "projects",
  base: string,
): Promise<string> {
  const root = slugifyBase(base) || "item";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomUUID().slice(0, 6);
    const candidate = `${root}-${suffix}`;
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("public_slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  throw new Error("Não foi possível gerar um link único.");
}

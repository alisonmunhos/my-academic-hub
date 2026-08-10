import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const anonKey = (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
  import.meta.env['VITE_SUPABASE_ANON_KEY']) as string | undefined;

/** Indica se o projeto Supabase externo já foi configurado. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Cliente Supabase. Enquanto as variáveis de ambiente não estiverem
 * configuradas, o valor é `null` e a tela de login exibe um aviso.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

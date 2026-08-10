import { supabase as generatedClient } from "@/integrations/supabase/client";

/** O banco de dados agora está configurado via Lovable Cloud. */
export const isSupabaseConfigured = true;

/** Cliente do banco de dados usado nas telas de login e biblioteca. */
export const supabase = generatedClient;

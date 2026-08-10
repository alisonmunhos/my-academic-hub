import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/biblioteca" });
    }
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Biblioteca de Referências" },
      {
        name: "description",
        content: "Biblioteca pessoal para organizar suas referências acadêmicas.",
      },
      { property: "og:title", content: "Biblioteca de Referências" },
      {
        property: "og:description",
        content: "Biblioteca pessoal para organizar suas referências acadêmicas.",
      },
    ],
  }),
  component: () => null,
});

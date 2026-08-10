import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookMarked, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Minhas referências | Biblioteca de Referências" },
      {
        name: "description",
        content: "Sua biblioteca pessoal de referências acadêmicas em um só lugar.",
      },
      { property: "og:title", content: "Minhas referências | Biblioteca de Referências" },
      {
        property: "og:description",
        content: "Sua biblioteca pessoal de referências acadêmicas em um só lugar.",
      },
    ],
  }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  async function sair() {
    await supabase?.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookMarked className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-card-foreground">
                Biblioteca de Referências
              </h1>
              {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={sair}>
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <BookMarked className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">
            Suas referências aparecerão aqui
          </p>
        </div>
      </main>
    </div>
  );
}

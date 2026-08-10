import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/biblioteca" });
  },
  head: () => ({
    meta: [
      { title: "Entrar | Biblioteca de Referências" },
      {
        name: "description",
        content: "Acesse sua biblioteca pessoal de referências acadêmicas.",
      },
      { property: "og:title", content: "Entrar | Biblioteca de Referências" },
      {
        property: "og:description",
        content: "Acesse sua biblioteca pessoal de referências acadêmicas.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!supabase) {
      setErro("A conexão com o banco de dados ainda não foi configurada.");
      return;
    }

    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    navigate({ to: "/biblioteca", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookMarked className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-card-foreground">Biblioteca de Referências</h1>
          <p className="text-sm text-muted-foreground">Entre com sua conta para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Entrar
          </Button>
        </form>

        {!isSupabaseConfigured && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Conexão com o banco de dados ainda não configurada. Adicione as variáveis
            VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para habilitar o login.
          </p>
        )}
      </div>
    </main>
  );
}

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getCitations, sortSourcesAlphabetically } from "../lib/citations";
import type { SourceRow } from "../hooks/useSources";

interface BatchCiteDialogProps {
  sources: SourceRow[] | null;
  onOpenChange: (open: boolean) => void;
}

export function BatchCiteDialog({ sources, onOpenChange }: BatchCiteDialogProps) {
  const sorted = useMemo(() => (sources ? sortSourcesAlphabetically(sources) : []), [sources]);
  const references = useMemo(() => sorted.map((s) => getCitations(s).full), [sorted]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(references.join("\n\n"));
      toast.success("Lista de referências copiada.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  return (
    <Dialog open={!!sources} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-xl flex-col gap-4 sm:max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Referências ({references.length})</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border">
          <div className="space-y-3 p-4">
            {references.map((ref, index) => (
              <p key={sorted[index]?.id ?? index} className="text-sm">
                {ref}
              </p>
            ))}
          </div>
        </div>

        <Button type="button" onClick={copyAll} className="w-full shrink-0">
          <Copy className="size-4" />
          Copiar lista completa
        </Button>
      </DialogContent>

    </Dialog>
  );
}

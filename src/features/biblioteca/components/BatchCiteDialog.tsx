import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="max-w-xl gap-4">
        <DialogHeader>
          <DialogTitle>Referências ({references.length})</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] rounded-md border">
          <div className="space-y-3 p-4">
            {references.map((ref, index) => (
              <p key={sorted[index]?.id ?? index} className="text-sm">
                {ref}
              </p>
            ))}
          </div>
        </ScrollArea>

        <Button type="button" onClick={copyAll} className="w-full">
          <Copy className="size-4" />
          Copiar lista completa
        </Button>
      </DialogContent>
    </Dialog>
  );
}

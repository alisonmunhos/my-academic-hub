import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateKeyword, useKeywords, type KeywordOption } from "../hooks/useLookups";

interface KeywordsPickerProps {
  ownerId: string | undefined;
  value: KeywordOption[];
  onChange: (value: KeywordOption[]) => void;
}

export function KeywordsPicker({ ownerId, value, onChange }: KeywordsPickerProps) {
  const { data: keywords = [] } = useKeywords(ownerId);
  const createKeyword = useCreateKeyword(ownerId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedIds = new Set(value.map((k) => k.id));
  const filtered = keywords.filter(
    (k) => !selectedIds.has(k.id) && k.label.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = keywords.some((k) => k.label.toLowerCase() === query.trim().toLowerCase());

  function add(keyword: KeywordOption) {
    onChange([...value, keyword]);
    setOpen(false);
    setQuery("");
  }

  async function handleCreate() {
    const label = query.trim();
    if (!label) return;
    const keyword = await createKeyword.mutateAsync(label);
    add(keyword);
  }

  function remove(id: string) {
    onChange(value.filter((k) => k.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((k) => (
          <Badge key={k.id} variant="secondary" className="gap-1">
            {k.label}
            <button type="button" onClick={() => remove(k.id)} aria-label={`Remover ${k.label}`}>
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" />
            Adicionar palavra-chave
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar ou criar palavra-chave..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nenhuma palavra-chave encontrada.</CommandEmpty>
              <CommandGroup>
                {filtered.map((keyword) => (
                  <CommandItem key={keyword.id} onSelect={() => add(keyword)}>
                    {keyword.label}
                  </CommandItem>
                ))}
                {query.trim() && !exactMatch && (
                  <CommandItem onSelect={handleCreate} disabled={createKeyword.isPending}>
                    <Plus className="size-3.5" />
                    Criar "{query.trim()}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

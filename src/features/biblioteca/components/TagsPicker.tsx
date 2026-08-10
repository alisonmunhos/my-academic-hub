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
import { TAG_COLOR_PRESETS } from "../constants";
import { useCreateTag, useTags, type TagOption } from "../hooks/useLookups";

interface TagsPickerProps {
  ownerId: string | undefined;
  value: TagOption[];
  onChange: (value: TagOption[]) => void;
}

export function TagsPicker({ ownerId, value, onChange }: TagsPickerProps) {
  const { data: tags = [] } = useTags(ownerId);
  const createTag = useCreateTag(ownerId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLOR_PRESETS[0].value);

  const selectedIds = new Set(value.map((t) => t.id));
  const filtered = tags.filter(
    (t) => !selectedIds.has(t.id) && t.label.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = tags.some((t) => t.label.toLowerCase() === query.trim().toLowerCase());

  function add(tag: TagOption) {
    onChange([...value, tag]);
    setOpen(false);
    setQuery("");
  }

  async function handleCreate() {
    const label = query.trim();
    if (!label) return;
    const tag = await createTag.mutateAsync({ label, color: newColor });
    add(tag);
  }

  function remove(id: string) {
    onChange(value.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag.id} variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: tag.color ?? "#94a3b8" }}
              aria-hidden="true"
            />
            {tag.label}
            <button
              type="button"
              onClick={() => remove(tag.id)}
              aria-label={`Remover ${tag.label}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" />
            Adicionar tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar ou criar tag..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {filtered.map((tag) => (
                  <CommandItem key={tag.id} onSelect={() => add(tag)}>
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                      aria-hidden="true"
                    />
                    {tag.label}
                  </CommandItem>
                ))}
                {query.trim() && !exactMatch && (
                  <div className="p-2">
                    <div className="mb-1.5 flex gap-1">
                      {TAG_COLOR_PRESETS.map((preset) => (
                        <button
                          type="button"
                          key={preset.value}
                          className="size-5 rounded-full border-2"
                          style={{
                            backgroundColor: preset.value,
                            borderColor: newColor === preset.value ? "currentColor" : "transparent",
                          }}
                          aria-label={preset.label}
                          onClick={() => setNewColor(preset.value)}
                        />
                      ))}
                    </div>
                    <CommandItem onSelect={handleCreate} disabled={createTag.isPending}>
                      <Plus className="size-3.5" />
                      Criar "{query.trim()}"
                    </CommandItem>
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

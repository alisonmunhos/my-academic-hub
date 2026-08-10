import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_COLUMNS } from "../constants";

interface ColumnVisibilityMenuProps {
  visibleColumns: string[];
  onChange: (columns: string[]) => void;
}

export function ColumnVisibilityMenu({ visibleColumns, onChange }: ColumnVisibilityMenuProps) {
  function toggle(key: string, checked: boolean) {
    const next = checked ? [...visibleColumns, key] : visibleColumns.filter((c) => c !== key);
    onChange(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-3.5" />
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleColumns.includes(column.key)}
            onCheckedChange={(checked) => toggle(column.key, checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

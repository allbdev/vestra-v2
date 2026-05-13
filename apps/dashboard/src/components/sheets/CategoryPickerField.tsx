import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vestra/ui";
import { useCategories } from "../../api/hooks/useCategories";
import { CategoryFormSheet } from "./CategoryFormSheet";
import type { Category } from "../../api/types";

export interface CategoryPickerFieldProps {
  workspaceId: string;
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  invalid?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  typeFilter?: 1 | 2;
}

export function CategoryPickerField({
  workspaceId,
  value,
  onValueChange,
  invalid,
  placeholder = "Selecione",
  allowEmpty = false,
  typeFilter,
}: CategoryPickerFieldProps) {
  const { data: categories = [] } = useCategories(workspaceId);
  const [creating, setCreating] = useState(false);

  const list = typeFilter ? categories.filter((c) => c.type === typeFilter) : categories;
  const selectValue = value ?? (allowEmpty ? "__none" : "");

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            value={selectValue}
            onValueChange={(v) => onValueChange(v === "__none" ? null : v)}
          >
            <SelectTrigger invalid={invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty ? (
                <SelectItem value="__none">Sem categoria</SelectItem>
              ) : null}
              {list.length === 0 && !allowEmpty ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Crie uma categoria pelo botão ao lado
                </div>
              ) : (
                list.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.color ?? "#94a3b8" }}
                      />
                      {c.name}
                      <span className="text-xs text-muted-foreground">
                        {c.type === 1 ? "Receita" : "Despesa"}
                      </span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Nova categoria"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <CategoryFormSheet
        open={creating}
        onOpenChange={setCreating}
        workspaceId={workspaceId}
        defaultType={typeFilter}
        onCreated={(c: Category) => onValueChange(c.id)}
      />
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useFetch } from "@/hooks/useFetch";

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  const {
    data: categoryData,
    error: errorCategory,
    loading: loadingCategory,
    fetchData: fetchCategory,
  } = useFetch<[]>();

  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    fetchCategory("/api/category", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };
  useEffect(() => {
    if (categoryData) {
      setCategories(categoryData);
    }
  }, [categoryData]);
  useEffect(() => {
    if (errorCategory) {
      toast({
        title: "Error",
        description: `No se pudieron cargar las categorías (${errorCategory})`,
        variant: "destructive",
      });
    }
  }, [errorCategory]);
  const addNewCategory = async () => {
    if (!inputValue.trim()) return;
      setCategories((prev) => [...prev, inputValue]);
      onChange(inputValue);
      setOpen(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? value : "Seleccionar categoría..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar categoría..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              No se encontraron categorías.
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start"
                onClick={addNewCategory}
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir "{inputValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup heading="Categorías existentes">
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
            {inputValue && !categories.includes(inputValue) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Crear nueva categoría">
                  <CommandItem onSelect={addNewCategory}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

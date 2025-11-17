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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { useFetch } from "@/hooks/useFetch";

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  inModal?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  inModal = false,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const { toast } = useToast();
  const {
    data: categoryData,
    error: errorCategory,
    loading: loadingCategory,
    fetchData: fetchCategory,
  } = useFetch<any>();

  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    fetchCategory("/api/categories", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };
  useEffect(() => {
    if (categoryData) {
      // Manejar tanto la respuesta antigua (array) como la nueva (objeto con categories)
      if (Array.isArray(categoryData)) {
        setCategories(categoryData);
      } else if (
        categoryData.categories &&
        Array.isArray(categoryData.categories)
      ) {
        setCategories(categoryData.categories);
      } else {
        setCategories([]);
      }
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

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: inputValue.trim(),
          description: "",
          color: "#3B82F6",
          icon: "📦",
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Agregar la nueva categoría a la lista local
        setCategories((prev) => [...prev, result.category]);
        onChange(inputValue);
        setOpen(false);
        toast({
          title: "Éxito",
          description: "Categoría creada exitosamente",
          variant: "default",
        });
      } else {
        throw new Error(result.error || "Error desconocido al crear categoría");
      }
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast({
        title: "Error al crear categoría",
        description: error?.message || "No se pudo crear la categoría. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const addNewCategoryFromInput = async () => {
    if (!newCategoryInput.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategoryInput.trim(),
          description: "",
          color: "#3B82F6",
          icon: "📦",
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Agregar la nueva categoría a la lista local
        setCategories((prev) => [...prev, result.category]);
        onChange(newCategoryInput);
        setNewCategoryInput("");
        toast({
          title: "Éxito",
          description: "Categoría creada exitosamente",
          variant: "default",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: `No se pudo crear la categoría: ${error}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (inModal) {
    return (
      <div className="space-y-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar categoría..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => {
              // Manejar tanto strings como objetos
              const categoryName =
                typeof category === "string" ? category : category.name;
              const categoryValue =
                typeof category === "string" ? category : category.name;

              return (
                <SelectItem key={categoryName} value={categoryValue}>
                  {categoryName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Input para agregar nueva categoría */}
        <div className="flex gap-2">
          <Input
            placeholder="Nueva categoría..."
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addNewCategoryFromInput()}
          />
          <Button
            type="button"
            size="sm"
            onClick={addNewCategoryFromInput}
            disabled={!newCategoryInput.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

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
      <PopoverContent className="w-[300px] p-0 z-[70]">
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
                onClick={(e) => {
                  e.stopPropagation();
                  addNewCategory();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir "{inputValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup heading="Categorías existentes">
              {categories.map((category) => {
                // Manejar tanto strings como objetos
                const categoryName =
                  typeof category === "string" ? category : category.name;
                const categoryValue =
                  typeof category === "string" ? category : category.name;

                return (
                  <CommandItem
                    key={categoryName}
                    value={categoryValue}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === categoryValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {categoryName}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {inputValue &&
              !categories.some((cat) => {
                const categoryName = typeof cat === "string" ? cat : cat.name;
                return categoryName === inputValue;
              }) && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Crear nueva categoría">
                    <CommandItem
                      onSelect={addNewCategory}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
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

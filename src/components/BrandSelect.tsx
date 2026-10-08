"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  inModal?: boolean;
}

// Marcas tipeadas a mano: no hay entidad Brand, el texto que se escribe acá es
// lo que se guarda en Product.brand. Las opciones son autocompletado de las
// marcas ya usadas por el usuario (/api/products/brands).
export function BrandSelect({
  value,
  onChange,
  inModal = false,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadBrands = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/products/brands", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json.success) {
          setBrands(json.brands || []);
        }
      } catch {
        if (!cancelled) {
          toast({
            title: "Error",
            description: "No se pudieron cargar las marcas",
            variant: "destructive",
          });
        }
      }
    };

    loadBrands();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = value.trim();
  const exactMatch = brands.some((b) => b.toLowerCase() === trimmed.toLowerCase());

  // En modal se usa un input nativo con datalist: no depende de portales ni de
  // z-index, que es justamente lo que hace frágil al popover dentro de un modal.
  if (inModal) {
    return (
      <div className="flex gap-2">
        <Input
          list="brand-datalist"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribir o elegir marca..."
        />
        <datalist id="brand-datalist">
          {brands.map((brand) => (
            <option key={brand} value={brand} />
          ))}
        </datalist>
        {trimmed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar marca"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {trimmed ? trimmed : "Seleccionar o escribir marca..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 z-[70]">
          <Command>
            <CommandInput
              placeholder="Escribir marca..."
              value={value}
              onValueChange={onChange}
            />
            <CommandList>
              <CommandEmpty>
                No se encontraron marcas.
                {trimmed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(trimmed);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Usar &quot;{trimmed}&quot;
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup heading="Marcas existentes">
                {brands.map((brand) => (
                  <CommandItem
                    key={brand}
                    value={brand}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        trimmed === brand ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {brand}
                  </CommandItem>
                ))}
              </CommandGroup>
              {trimmed && !exactMatch && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Usar marca nueva">
                    <CommandItem
                      onSelect={() => {
                        onChange(trimmed);
                        setOpen(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Usar &quot;{trimmed}&quot;
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {trimmed && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar marca"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

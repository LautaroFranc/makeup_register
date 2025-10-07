"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, RotateCcw } from "lucide-react";

interface ProductFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  availableCategories: string[];
  loading?: boolean;
}

interface FilterState {
  search: string;
  category: string;
  published: string;
  stock: string;
}

const initialFilters: FilterState = {
  search: "",
  category: "all",
  published: "all",
  stock: "all",
};

export default function ProductFilters({
  onFiltersChange,
  availableCategories,
  loading = false,
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Contar filtros activos
  useEffect(() => {
    const count = Object.entries(filters).reduce((acc, [key, value]) => {
      if (key === "search") return acc + (value ? 1 : 0);
      return acc + (value !== "all" ? 1 : 0);
    }, 0);
    setActiveFiltersCount(count);
  }, [filters]);

  // Notificar cambios de filtros
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const clearFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "search" ? "" : "all",
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              {isExpanded ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar productos</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nombre, descripción o categoría..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter("search")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros en grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Categoría */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange("category", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.category !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter("category")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {filters.category}
                </Button>
              )}
            </div>

            {/* Visibilidad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Visibilidad</label>
              <Select
                value={filters.published}
                onValueChange={(value) =>
                  handleFilterChange("published", value)
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Solo visibles</SelectItem>
                  <SelectItem value="false">Solo ocultos</SelectItem>
                </SelectContent>
              </Select>
              {filters.published !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter("published")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {filters.published === "true" ? "Visibles" : "Ocultos"}
                </Button>
              )}
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock</label>
              <Select
                value={filters.stock}
                onValueChange={(value) => handleFilterChange("stock", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in-stock">En stock</SelectItem>
                  <SelectItem value="low-stock">Stock bajo (≤5)</SelectItem>
                  <SelectItem value="out-of-stock">Sin stock</SelectItem>
                </SelectContent>
              </Select>
              {filters.stock !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter("stock")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {filters.stock === "in-stock"
                    ? "En stock"
                    : filters.stock === "low-stock"
                    ? "Stock bajo"
                    : "Sin stock"}
                </Button>
              )}
            </div>
          </div>

          {/* Resumen de filtros activos */}
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {filters.search && (
                  <Badge variant="outline" className="text-xs">
                    Búsqueda: "{filters.search}"
                  </Badge>
                )}
                {filters.category !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    Categoría: {filters.category}
                  </Badge>
                )}
                {filters.published !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    {filters.published === "true"
                      ? "Solo visibles"
                      : "Solo ocultos"}
                  </Badge>
                )}
                {filters.stock !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    {filters.stock === "in-stock"
                      ? "En stock"
                      : filters.stock === "low-stock"
                      ? "Stock bajo"
                      : "Sin stock"}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

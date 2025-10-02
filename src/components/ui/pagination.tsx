import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalProducts: number;
  limit: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  totalProducts,
  limit,
}) => {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalProducts);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
      {/* Información de productos - Responsive */}
      <div className="flex items-center text-sm text-gray-700">
        <span className="hidden sm:inline">
          Mostrando {startItem} a {endItem} de {totalProducts} productos
        </span>
        <span className="sm:hidden">
          {startItem}-{endItem} de {totalProducts}
        </span>
      </div>

      {/* Controles de paginación - Responsive */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Botón Anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>

        {/* Números de página - Responsive */}
        <div className="flex items-center gap-1">
          {/* En móvil: solo página actual y total */}
          <div className="sm:hidden flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {currentPage} de {totalPages}
            </span>
          </div>

          {/* En desktop: números completos */}
          <div className="hidden sm:flex items-center gap-1">
            {getVisiblePages().map((page, index) => {
              if (page === "...") {
                return (
                  <span key={index} className="px-2 py-1 text-gray-500 text-sm">
                    ...
                  </span>
                );
              }

              return (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="min-w-[36px] h-8 px-2"
                >
                  {page}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Botón Siguiente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="flex items-center"
        >
          <span className="hidden sm:inline mr-1">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

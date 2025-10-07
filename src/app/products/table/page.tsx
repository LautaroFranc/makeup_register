"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductTable from "@/components/table/Table";
import SaleModal from "@/components/SaleModal";
import ProductFilters from "@/components/ProductFilters";
import { Pagination } from "@/components/ui/pagination";
import { useFetch } from "@/hooks/useFetch";
import { formatToARS, tokenDecode } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Product {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  attributes?: {
    [key: string]: string[];
  };
  buyPrice: string;
  sellPrice: string;
  stock: number;
  category: string;
  code: string;
  barcode: string;
  user: string;
  published: boolean;
}

interface SaleProduct {
  _id: string;
  idProduct: string;
  sellPrice: number;
  stock: number;
  category: string;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

interface DashboardSummary {
  totalGananciasEstimada: number;
  ganancias: number;
  totalCosto: number;
  totalStock: number;
  totalProductos: number;
  productosPublicados: number;
  productosOcultos: number;
  margenPromedio: number;
  lastUpdated: string;
}

interface FilterState {
  search: string;
  category: string;
  published: string;
  stock: string;
}

export default function ProductDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummary | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [paginationLoading, setPaginationLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    published: "all",
    stock: "all",
  });

  const {
    data: productsData,
    fetchData: fetchProducts,
    loading,
  } = useFetch<Product[]>();
  const {
    data: saleUpdateData,
    fetchData: createSale,
    loading: loadingSale,
  } = useFetch<SaleProduct>();
  const {
    data: summaryData,
    fetchData: fetchSummary,
    loading: summaryLoading,
  } = useFetch<{ success: boolean; data: DashboardSummary }>();
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    loadProducts(1);
    loadDashboardSummary();
  }, [fetchProducts]);

  const loadDashboardSummary = async () => {
    const token = localStorage.getItem("token");
    fetchSummary(`/api/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  // Update products list and handle sales updates
  useEffect(() => {
    if (productsData) {
      // Si productsData es un array (respuesta antigua), usar directamente
      if (Array.isArray(productsData)) {
        setProducts(productsData);
      }
      // Si productsData tiene estructura { products, pagination } (respuesta nueva)
      else if ("products" in productsData && "pagination" in productsData) {
        const response = productsData as ProductsResponse;
        setProducts(response.products);
        setPagination(response.pagination);
      }
    }

    if (summaryData && summaryData.success) {
      setDashboardSummary(summaryData.data);
    }

    if (saleUpdateData) {
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === saleUpdateData.idProduct
            ? { ...product, stock: product.stock - saleUpdateData.stock }
            : product
        )
      );
      toast({
        description: "Producto actualizado exitosamente!",
        variant: "default",
      });
      setSelectedProduct(null);
      // Recargar resumen después de una venta
      loadDashboardSummary();
    }
  }, [productsData, summaryData, saleUpdateData, toast]);

  const handleDelete = useCallback(
    (id: string) => {
      const token = localStorage.getItem("token");
      fetchProducts(`/api/products?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product._id !== id)
      );
    },
    [fetchProducts]
  );

  const calculateMargin = (buyPrice: number, sellPrice: number) => {
    // Manejar casos especiales
    if (buyPrice === 0) {
      return "-";
    }
    if (sellPrice === 0) {
      return "-100.00";
    }

    // Cálculo normal
    const margin = ((sellPrice - buyPrice) / buyPrice) * 100;
    return margin.toFixed(2);
  };

  const handleOpenSaleModal = (productId: string) =>
    setSelectedProduct(products.find((p) => p._id === productId) || null);

  const handleProductUpdate = (productId: string, updatedProduct: Product) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product._id === productId ? updatedProduct : product
      )
    );
  };

  const loadProducts = async (
    page: number = 1,
    currentFilters: FilterState = filters
  ) => {
    setPaginationLoading(true);
    try {
      const token = localStorage.getItem("token");
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      // Agregar filtros a los parámetros
      if (currentFilters.search)
        searchParams.set("search", currentFilters.search);
      if (currentFilters.category !== "all")
        searchParams.set("category", currentFilters.category);
      if (currentFilters.published !== "all")
        searchParams.set("published", currentFilters.published);
      if (currentFilters.stock !== "all")
        searchParams.set("stock", currentFilters.stock);

      const response = await fetch(`/api/products/private?${searchParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(data.pagination);
        setCurrentPage(page);

        // Actualizar categorías disponibles si vienen en la respuesta
        if (data.filters?.availableCategories) {
          setAvailableCategories(data.filters.availableCategories);
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setPaginationLoading(false);
    }
  };

  const handleRefresh = () => {
    loadProducts(1, filters);
    loadDashboardSummary();
  };

  const handlePageChange = (page: number) => {
    loadProducts(page, filters);
  };

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    loadProducts(1, newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      search: "",
      category: "all",
      published: "all",
      stock: "all",
    };
    setFilters(clearedFilters);
    loadProducts(1, clearedFilters);
  }, []);

  const handleConfirmSale = (sale: { productId: string; quantity: number }) => {
    const product = products.find((p) => p._id === sale.productId);
    if (!product) return;

    const saleData = {
      idProduct: product._id,
      sellPrice: product.sellPrice,
      stock: sale.quantity,
    };
    const token = localStorage.getItem("token");

    createSale("/api/saleProduct", {
      method: "POST",
      body: JSON.stringify(saleData),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  // const handleSelectCategory = (categoryId: string) => {
  //   setCategory(categoryId);
  // };

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            title: "Total Ganancias Estimada",
            value: dashboardSummary?.totalGananciasEstimada || 0,
            color: "green-600",
            type: "number",
            loading: summaryLoading,
          },
          {
            title: "Ganancias",
            value: dashboardSummary?.ganancias || 0,
            color: "green-600",
            type: "number",
            loading: summaryLoading,
          },
          {
            title: "Total Costo",
            value: dashboardSummary?.totalCosto || 0,
            color: "red-600",
            type: "number",
            loading: summaryLoading,
          },
          {
            title: "Total Stock",
            value: dashboardSummary?.totalStock || 0,
            color: "black",
            type: "text",
            loading: summaryLoading,
          },
        ].map(({ title, value, color, type, loading }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {title}
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold text-${color}`}>
                {loading ? (
                  <span className="text-gray-400">Cargando...</span>
                ) : type === "number" ? (
                  formatToARS(value)
                ) : (
                  value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        {/* Filtros */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Filtros de Productos
            </h2>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
          <ProductFilters
            onFiltersChange={handleFiltersChange}
            availableCategories={availableCategories}
            loading={loading}
          />
        </div>
        <div className="relative">
          <ProductTable
            loading={loading}
            products={products}
            handleDelete={handleDelete}
            calculateMargin={calculateMargin}
            handleOpenSaleModal={handleOpenSaleModal}
            onProductUpdate={handleProductUpdate}
            onRefresh={handleRefresh}
          />

          {/* Loading overlay para paginación */}
          {paginationLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-gray-600 font-medium">
                  Cargando productos...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div
            className={
              paginationLoading ? "opacity-50 pointer-events-none" : ""
            }
          >
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              totalProducts={pagination.totalProducts}
              limit={pagination.limit}
            />
          </div>
        )}
      </div>
      <SaleModal
        onClose={() => setSelectedProduct(null)}
        onConfirm={handleConfirmSale}
        product={selectedProduct}
        loading={loadingSale}
      />
    </div>
  );
}

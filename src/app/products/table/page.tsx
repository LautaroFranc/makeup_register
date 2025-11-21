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
import { StorePreviewButton } from "@/components/StorePreviewButton";

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
  // Métricas financieras principales
  valorInventario: number;
  costoInventario: number;
  ingresosPorVentas: number;
  costoProductosVendidos: number;
  gananciaNeta: number;
  margenGananciaReal: number;
  // Métricas de inventario
  totalStock: number;
  margenPromedioInventario: number;
  // Estadísticas de catálogo
  totalProductos: number;
  productosPublicados: number;
  productosOcultos: number;
  // Alertas de stock
  productosSinStock: number;
  productosStockBajo: number;
  lastUpdated: string;
}

interface FilterState {
  search: string;
  category: string;
  published: string;
  stock: string;
  minPrice?: string;
  maxPrice?: string;
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
    minPrice: "",
    maxPrice: "",
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

  // Update products list
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
  }, [productsData]);

  // Update dashboard summary
  useEffect(() => {
    if (summaryData && summaryData.success) {
      setDashboardSummary(summaryData.data);
    }
  }, [summaryData]);

  // Handle sale updates - SEPARADO para evitar ciclo infinito
  useEffect(() => {
    if (saleUpdateData) {
      // Actualizar stock localmente para feedback inmediato
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === saleUpdateData.idProduct
            ? { ...product, stock: product.stock - saleUpdateData.stock }
            : product
        )
      );
      toast({
        title: "Venta registrada",
        description: "El stock del producto ha sido actualizado exitosamente",
        variant: "default",
      });
      setSelectedProduct(null);

      // Recargar productos desde el servidor para asegurar sincronización
      setTimeout(() => {
        loadProducts(currentPage, filters);
      }, 500);

      // Recargar resumen después de una venta
      loadDashboardSummary();
    }
  }, [saleUpdateData, toast]);

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
      if (currentFilters.minPrice)
        searchParams.set("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice)
        searchParams.set("maxPrice", currentFilters.maxPrice);

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
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  };

  // const handleSelectCategory = (categoryId: string) => {
  //   setCategory(categoryId);
  // };

  return (
    <div className="p-6 space-y-6">
      {/* Card única con todas las métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Resumen del Negocio
            {summaryLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métricas Financieras */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Métricas Financieras
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Valor Inventario</p>
                <p className="text-xl font-bold text-blue-600">
                  {summaryLoading ? "..." : formatToARS(dashboardSummary?.valorInventario || 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Ganancia Neta</p>
                <p className="text-xl font-bold text-green-600">
                  {summaryLoading ? "..." : formatToARS(dashboardSummary?.gananciaNeta || 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Ingresos Ventas</p>
                <p className="text-xl font-bold text-emerald-600">
                  {summaryLoading ? "..." : formatToARS(dashboardSummary?.ingresosPorVentas || 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Margen Real</p>
                <p className="text-xl font-bold text-purple-600">
                  {summaryLoading ? "..." : `${(dashboardSummary?.margenGananciaReal || 0).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Inventario y Catálogo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Total Stock</p>
                <p className="text-xl font-bold text-gray-700">
                  {summaryLoading ? "..." : dashboardSummary?.totalStock || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Total Productos</p>
                <p className="text-xl font-bold text-gray-700">
                  {summaryLoading ? "..." : dashboardSummary?.totalProductos || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Publicados</p>
                <p className="text-xl font-bold text-green-600">
                  {summaryLoading ? "..." : dashboardSummary?.productosPublicados || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Ocultos</p>
                <p className="text-xl font-bold text-gray-500">
                  {summaryLoading ? "..." : dashboardSummary?.productosOcultos || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Alertas de Stock */}
          {!summaryLoading && (
            (dashboardSummary?.productosSinStock || 0) > 0 ||
            (dashboardSummary?.productosStockBajo || 0) > 0
          ) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <span className="text-red-500">⚠️</span> Alertas de Stock
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(dashboardSummary?.productosSinStock || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Productos sin stock</p>
                      <p className="text-lg font-bold text-red-600">
                        {dashboardSummary?.productosSinStock}
                      </p>
                    </div>
                    <div className="text-2xl">🔴</div>
                  </div>
                )}
                {(dashboardSummary?.productosStockBajo || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Stock bajo (&lt;5 unidades)</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {dashboardSummary?.productosStockBajo}
                      </p>
                    </div>
                    <div className="text-2xl">⚠️</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Botón Flotante de Vista Previa */}
      <StorePreviewButton />
    </div>
  );
}

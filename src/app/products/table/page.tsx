"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductTable from "@/components/table/Table";
import SaleModal from "@/components/SaleModal";
import { Pagination } from "@/components/ui/pagination";
import { useFetch } from "@/hooks/useFetch";
import { formatToARS, tokenDecode } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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

export default function ProductDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
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

  const {
    data: productsData,
    fetchData: fetchProducts,
    loading,
  } = useFetch<Product[]>();
  const { data: salesData, fetchData: fetchSales } = useFetch<SaleProduct[]>();
  const {
    data: saleUpdateData,
    fetchData: createSale,
    loading: loadingSale,
  } = useFetch<SaleProduct>();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Fetch initial data
  useEffect(() => {
    loadProducts(1);

    const token = localStorage.getItem("token");
    fetchSales(`/api/saleProduct`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, [fetchProducts, fetchSales]);

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
    }
  }, [productsData, saleUpdateData, toast]);

  // Calculate total sales
  useEffect(() => {
    if (salesData) {
      const total = salesData.reduce(
        (acc, sale) => acc + Number(sale.sellPrice) * sale.stock,
        0
      );
      setTotalSales(total);
    }
  }, [salesData]);

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

  const loadProducts = async (page: number = 1) => {
    const user = tokenDecode();
    if (user) {
      setPaginationLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/products?slug=${user.slug}&page=${page}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProducts(data.products);
          setPagination(data.pagination);
          setCurrentPage(page);
        }
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setPaginationLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadProducts(1);
  };

  const handlePageChange = (page: number) => {
    loadProducts(page);
  };

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

  const totals = products.reduce(
    (acc, product) => {
      const profit = parseFloat(product.sellPrice) * product.stock;
      const cost = parseFloat(product.buyPrice) * product.stock;
      return {
        totalProfit: acc.totalProfit + profit,
        totalCost: acc.totalCost + cost,
        totalStock: acc.totalStock + product.stock,
      };
    },
    { totalProfit: 0, totalCost: 0, totalStock: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            title: "Total Ganancias Estimada",
            value: totals.totalProfit,
            color: "green-600",
            type: "number",
          },
          {
            title: "Ganancias",
            value: totalSales,
            color: "green-600",
            type: "number",
          },
          {
            title: "Total Costo",
            value: totals.totalCost,
            color: "red-600",
            type: "number",
          },
          {
            title: "Total Stock",
            value: totals.totalStock,
            color: "black",
            type: "text",
          },
        ].map(({ title, value, color, type }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold text-${color}`}>
                {type === "number" ? formatToARS(value) : value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex justify-between">
          <Card className="relative mb-4">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
              <Search className="h-5 w-5" />
            </span>
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </Card>
        </div>
        <div className="relative">
          <ProductTable
            loading={loading}
            products={filteredProducts}
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

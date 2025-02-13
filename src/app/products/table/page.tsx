"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductTable from "@/components/table/Table";
import SaleModal from "@/components/SaleModal";
import { useFetch } from "@/hooks/useFetch";
import { formatToARS } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Product {
  _id: string;
  name: string;
  image?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
}

interface SaleProduct {
  _id: string;
  idProduct: string;
  sellPrice: number;
  stock: number;
  category: string;
}

export default function ProductDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [category, setCategory] = useState<string>("makeup");
  const [editingCell, setEditingCell] = useState<{
    _id: string;
    field: string;
  }>({
    _id: "",
    field: "",
  });

  const {
    data: productsData,
    fetchData: fetchProducts,
    loading,
  } = useFetch<Product[]>();
  const { data: salesData, fetchData: fetchSales } = useFetch<SaleProduct[]>();
  const { data: saleUpdateData, fetchData: createSale } =
    useFetch<SaleProduct>();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Fetch initial data
  useEffect(() => {
    fetchProducts(`http://localhost:3000/api/products?category=${category}`);
    fetchSales(`http://localhost:3000/api/saleProduct?category=${category}`);
  }, [fetchProducts, fetchSales, category]);

  // Update products list and handle sales updates
  useEffect(() => {
    if (productsData?.length) setProducts(productsData);

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

  const handleEdit = useCallback(
    (id: string, field: string, value: string | number) => {
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === id
            ? { ...product, [field]: field === "name" ? value : Number(value) }
            : product
        )
      );

      const updatedData = { [field]: field === "name" ? value : Number(value) };
      fetchProducts(`http://localhost:3000/api/products?id=${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });

      setEditingCell({ _id: "", field: "" });
    },
    [fetchProducts]
  );

  const handleDelete = useCallback(
    (id: string) => {
      fetchProducts(`http://localhost:3000/api/products?id=${id}`, {
        method: "DELETE",
      });
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product._id !== id)
      );
    },
    [fetchProducts]
  );

  const calculateMargin = (buyPrice: number, sellPrice: number) =>
    (((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2) || "0";

  const handleOpenSaleModal = (productId: string) =>
    setSelectedProduct(products.find((p) => p._id === productId) || null);

  const handleConfirmSale = (sale: { productId: string; quantity: number }) => {
    const product = products.find((p) => p._id === sale.productId);
    if (!product) return;

    const saleData = {
      idProduct: product._id,
      sellPrice: product.sellPrice,
      stock: sale.quantity,
      category: product.category,
    };

    createSale("http://localhost:3000/api/saleProduct", {
      method: "POST",
      body: JSON.stringify(saleData),
    });
  };

  const handleSelectCategory = (categoryId: string) => {
    setCategory(categoryId);
  };

  const totals = products.reduce(
    (acc, product) => {
      const profit = product.sellPrice * product.stock;
      const cost = product.buyPrice * product.stock;
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
          <Card className="mb-4 w-72">
            <Select value={category} onValueChange={handleSelectCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="makeup">Maquillaje</SelectItem>
                <SelectItem value="jewel">Joya</SelectItem>
              </SelectContent>
            </Select>
          </Card>
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
        <ProductTable
          loading={loading}
          products={filteredProducts}
          editingCell={editingCell}
          setEditingCell={setEditingCell}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          calculateMargin={calculateMargin}
          handleOpenSaleModal={handleOpenSaleModal}
        />
      </div>

      <SaleModal
        onClose={() => setSelectedProduct(null)}
        onConfirm={handleConfirmSale}
        product={selectedProduct}
      />
    </div>
  );
}

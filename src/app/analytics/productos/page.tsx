"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/useFetch";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Search, TrendingUp } from "lucide-react";

interface ProductViewsRow {
  _id: string;
  name: string;
  image?: string;
  published: boolean;
  views: number;
  share: number;
}

interface ProductViewsResponse {
  success: boolean;
  totals: {
    views: number;
    products: number;
    withoutViews: number;
    maxViews: number;
  };
  products: ProductViewsRow[];
}

type SortKey = "views" | "name";

export default function ProductViewsPage() {
  const { data, error, fetchData, loading } = useFetch<ProductViewsResponse>();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [hideEmpty, setHideEmpty] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    if (token) {
      await fetchData("/api/analytics/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isBusy = loading || refreshing;
  const products = useMemo(() => data?.products ?? [], [data]);
  const totals = data?.totals;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (hideEmpty && p.views === 0) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term);
    });

    // Copia antes de ordenar: products viene del estado de useMemo.
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "es");
      return b.views - a.views || a.name.localeCompare(b.name, "es");
    });
  }, [products, search, sortKey, hideEmpty]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Vistas por Producto
          </h1>
          <p className="text-gray-500 mt-1">
            Cuántas visitas registró cada producto por separado, no el total global.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="flex items-center gap-2">
            <Link href="/analytics">
              <ArrowLeft className="h-4 w-4" />
              Analíticas
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isBusy}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          <EyeOff className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">No se pudieron cargar las vistas por producto</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Vistas totales</p>
            <h3 className="text-2xl font-bold">{totals?.views ?? 0}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Productos</p>
            <h3 className="text-2xl font-bold">{totals?.products ?? 0}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Sin ninguna visita</p>
            <h3 className="text-2xl font-bold text-amber-600">
              {totals?.withoutViews ?? 0}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Detalle por producto</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="pl-8 w-56"
                />
              </div>
              <Button
                variant={sortKey === "views" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortKey("views")}
              >
                Por vistas
              </Button>
              <Button
                variant={sortKey === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortKey("name")}
              >
                Por nombre
              </Button>
              <Button
                variant={hideEmpty ? "default" : "outline"}
                size="sm"
                onClick={() => setHideEmpty((v) => !v)}
              >
                Solo con vistas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isBusy ? (
            <div className="py-8 text-center text-gray-400">Cargando datos...</div>
          ) : visible.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>
                {products.length === 0
                  ? "Todavía no tenés productos."
                  : "Ningún producto coincide con el filtro."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-24 text-right">Vistas</TableHead>
                  <TableHead className="w-48">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((product, i) => (
                  <TableRow key={product._id}>
                    <TableCell className="text-gray-400">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-9 w-9 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded bg-gray-100 shrink-0" />
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.published ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Publicado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
                          <EyeOff className="h-3 w-3" />
                          Oculto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {product.views.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${
                                totals && totals.maxViews > 0
                                  ? (product.views / totals.maxViews) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {product.share}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <p className="text-sm text-gray-500">
          Mostrando {visible.length} de {products.length} productos. La barra es
          relativa al producto con más visitas y el porcentaje es sobre el total de
          vistas del usuario.
        </p>
      )}
    </div>
  );
}

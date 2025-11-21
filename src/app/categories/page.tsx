"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  TrendingUp,
  DollarSign,
  Loader2,
  Filter,
  X,
  Store,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  orden: number;
  totalProducts: number;
  publicProductCount: number;
  privateProductCount: number;
  totalStock: number;
  totalValue: string;
  store?: {
    _id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StoreType {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [reorderList, setReorderList] = useState<Category[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "📦",
    isActive: true,
    store: "",
    orden: 0,
  });

  const { toast } = useToast();
  const { user } = useUser();

  // Cargar categorías
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories/private?includeInactive=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setFilteredCategories(data.categories);
      } else {
        throw new Error("Error al cargar categorías");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar tiendas
  const fetchStores = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stores", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data.stores);
      } else {
        throw new Error("Error al cargar tiendas");
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tiendas",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStores();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...categories];

    // Filtro por estado (activo/inactivo)
    if (statusFilter === "active") {
      filtered = filtered.filter((cat) => cat.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((cat) => !cat.isActive);
    }

    // Filtro por tienda
    if (storeFilter !== "all") {
      filtered = filtered.filter((cat) => cat.store?._id === storeFilter);
    }

    // Búsqueda por nombre
    if (searchQuery.trim()) {
      filtered = filtered.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  }, [statusFilter, storeFilter, searchQuery, categories]);

  // Crear categoría
  const handleCreateCategory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Categoría creada exitosamente",
          variant: "default",
        });
        setIsCreateModalOpen(false);
        resetForm();
        fetchCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al crear categoría: ${error}`,
        variant: "destructive",
      });
    }
  };

  // Actualizar categoría
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: editingCategory._id,
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Categoría actualizada exitosamente",
          variant: "default",
        });
        setIsEditModalOpen(false);
        setEditingCategory(null);
        resetForm();
        fetchCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al actualizar categoría: ${error}`,
        variant: "destructive",
      });
    }
  };

  // Eliminar categoría
  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/categories?id=${deleteCategory._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Categoría eliminada exitosamente",
          variant: "default",
        });
        setDeleteCategory(null);
        fetchCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al eliminar categoría: ${error}`,
        variant: "destructive",
      });
    }
  };

  // Abrir modal de edición
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      isActive: category.isActive,
      store: category.store?._id || "",
      orden: category.orden,
    });
    setIsEditModalOpen(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "📦",
      isActive: true,
      store: "",
      orden: 0,
    });
  };

  // Abrir modal de reordenamiento
  const openReorderModal = () => {
    setReorderList([...filteredCategories]);
    setIsReorderModalOpen(true);
  };

  // Funciones de drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newList = [...reorderList];
    const draggedItem = newList[draggedIndex];

    // Remover el item de su posición original
    newList.splice(draggedIndex, 1);
    // Insertarlo en la nueva posición
    newList.splice(index, 0, draggedItem);

    setReorderList(newList);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Mover categoría hacia arriba
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...reorderList];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setReorderList(newList);
  };

  // Mover categoría hacia abajo
  const moveDown = (index: number) => {
    if (index === reorderList.length - 1) return;
    const newList = [...reorderList];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setReorderList(newList);
  };

  // Guardar nuevo orden
  const handleSaveOrder = async () => {
    try {
      const token = localStorage.getItem("token");

      // Crear un array con los IDs en el nuevo orden
      const orderedIds = reorderList.map(cat => cat._id);

      const response = await fetch("/api/categories/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedIds }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Orden de categorías actualizado exitosamente",
          variant: "default",
        });
        setIsReorderModalOpen(false);
        fetchCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al actualizar el orden: ${error}`,
        variant: "destructive",
      });
    }
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setStatusFilter("all");
    setStoreFilter("all");
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (storeFilter !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Categorías</h1>
          <p className="text-gray-600">
            Administra las categorías de tus productos por tienda
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openReorderModal}
            disabled={filteredCategories.length === 0}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Reordenar
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Categoría</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descripción opcional"
                />
              </div>
              <div>
                <Label htmlFor="store">Tienda</Label>
                <Select
                  value={formData.store || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, store: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tienda (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin tienda</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Icono</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="📦"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="orden">Orden de visualización</Label>
                <Input
                  id="orden"
                  type="number"
                  min="0"
                  value={formData.orden}
                  onChange={(e) =>
                    setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número que define el orden de visualización (menor número = aparece primero)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Categoría activa</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateCategory}>Crear</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount}</Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div>
              <Label htmlFor="search">Buscar por nombre</Label>
              <Input
                id="search"
                placeholder="Buscar categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtro por estado */}
            <div>
              <Label htmlFor="status-filter">Estado</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "inactive") =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por tienda */}
            <div>
              <Label htmlFor="store-filter">Tienda</Label>
              <Select
                value={storeFilter}
                onValueChange={(value) => setStoreFilter(value)}
              >
                <SelectTrigger id="store-filter">
                  <SelectValue placeholder="Filtrar por tienda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tiendas</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categorías
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCategories.length}</div>
            <p className="text-xs text-muted-foreground">
              de {categories.length} totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categorías Activas
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCategories.filter((c) => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Con Productos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCategories.filter((c) => c.totalProducts > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {filteredCategories
                .reduce((sum, c) => sum + parseFloat(c.totalValue), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Categorías */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No se encontraron categorías con los filtros aplicados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      style={{ color: category.color }}
                      className="text-2xl"
                    >
                      {category.icon}
                    </span>
                    <div>
                      <CardTitle className="text-lg">
                        {category.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {category.description}
                      </p>
                      {category.store && (
                        <Badge variant="outline" className="mt-1">
                          <Store className="h-3 w-3 mr-1" />
                          {category.store.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    {category.isActive ? (
                      <Badge variant="default">
                        <Eye className="h-3 w-3 mr-1" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Inactiva
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Productos:</span>
                    <span className="font-medium">
                      {category.totalProducts}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Públicos:</span>
                    <span className="font-medium text-green-600">
                      {category.publicProductCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Privados:</span>
                    <span className="font-medium text-orange-600">
                      {category.privateProductCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Stock Total:</span>
                    <span className="font-medium">{category.totalStock}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor Total:</span>
                    <span className="font-medium">
                      ${category.totalValue}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(category)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteCategory(category)}
                      disabled={category.totalProducts > 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción opcional"
              />
            </div>
            <div>
              <Label htmlFor="edit-store">Tienda</Label>
              <Select
                value={formData.store || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, store: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="edit-store">
                  <SelectValue placeholder="Seleccionar tienda (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tienda</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-icon">Icono</Label>
                <Input
                  id="edit-icon"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="📦"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-orden">Orden de visualización</Label>
              <Input
                id="edit-orden"
                type="number"
                min="0"
                value={formData.orden}
                onChange={(e) =>
                  setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número que define el orden de visualización (menor número = aparece primero)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Categoría activa</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateCategory}>Actualizar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminación */}
      <AlertDialog
        open={!!deleteCategory}
        onOpenChange={() => setDeleteCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              categoría "{deleteCategory?.name}".
              {deleteCategory && deleteCategory.totalProducts > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-600 font-medium">
                    Esta categoría tiene {deleteCategory.totalProducts}{" "}
                    producto(s) asociado(s).
                  </p>
                  <p className="text-red-600 text-sm">
                    Primero debes mover o eliminar los productos antes de
                    eliminar la categoría.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={!!(deleteCategory && deleteCategory.totalProducts > 0)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Reordenamiento */}
      <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reordenar Categorías</DialogTitle>
            <p className="text-sm text-gray-600">
              Arrastra las categorías para cambiar su orden de visualización
            </p>
          </DialogHeader>
          <div className="space-y-2">
            {reorderList.map((category, index) => (
              <div
                key={category._id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <span
                    style={{ color: category.color }}
                    className="text-xl"
                  >
                    {category.icon}
                  </span>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-500">
                      {category.totalProducts} productos
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === reorderList.length - 1}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsReorderModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveOrder}>
              Guardar Orden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings,
  Tags,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Building2,
  Monitor,
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  totalProducts: number;
  publicProductCount: number;
  privateProductCount: number;
  totalStock: number;
  totalValue: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "📦",
    isActive: true,
  });
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    slug: "",
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [themeData, setThemeData] = useState({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    accentColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    textColor: "#1F2937",
    cardBackground: "#F9FAFB",
    borderColor: "#E5E7EB",
    logoUrl: "",
    faviconUrl: "",
    customCss: "",
  });
  const { toast } = useToast();
  const { user } = useUser();

  // Cargar categorías
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories/private", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
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
    if (user) {
      setUserFormData({
        name: user.name || "",
        email: user.email || "",
        slug: user.slug || "",
      });
    }
  }, [user]);

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
        setFormData({
          name: "",
          description: "",
          color: "#3B82F6",
          icon: "📦",
          isActive: true,
        });
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
        setFormData({
          name: "",
          description: "",
          color: "#3B82F6",
          icon: "📦",
          isActive: true,
        });
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
    });
  };

  // Actualizar perfil de usuario
  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      // No enviar el slug para la cuenta principal
      const { slug, ...updateData } = userFormData;
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Perfil actualizado exitosamente",
          variant: "default",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al actualizar perfil: ${error}`,
        variant: "destructive",
      });
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Contraseña cambiada exitosamente",
          variant: "default",
        });
        setPasswordFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al cambiar contraseña: ${error}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
          <p className="text-gray-600">
            Administra todos los módulos y configuraciones de tu tienda
          </p>
        </div>
      </div>

      {/* Tabs de Configuración */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Negocios
          </TabsTrigger>
          <TabsTrigger value="page" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Página
          </TabsTrigger>
        </TabsList>

        {/* Tab de Categorías */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Gestión de Categorías</h2>
              <p className="text-gray-600">
                Administra las categorías de tus productos
              </p>
            </div>
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
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

          {/* Estadísticas de Categorías */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Categorías
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
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
                  {categories.filter((c) => c.isActive).length}
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
                  {categories.filter((c) => c.totalProducts > 0).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Valor Total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {categories
                    .reduce((sum, c) => sum + parseFloat(c.totalValue), 0)
                    .toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
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
        </TabsContent>

        {/* Tab de Productos */}
        <TabsContent value="products" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">
              Configuración de Productos
            </h2>
            <p className="text-gray-600">
              Configura las opciones generales para la gestión de productos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Configuración General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generate-codes">
                    Generar códigos automáticamente
                  </Label>
                  <Switch id="auto-generate-codes" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generate-barcodes">
                    Generar códigos de barras automáticamente
                  </Label>
                  <Switch id="auto-generate-barcodes" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-images">Requerir imágenes</Label>
                  <Switch id="require-images" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-negative-stock">
                    Permitir stock negativo
                  </Label>
                  <Switch id="allow-negative-stock" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Apariencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="default-currency">Moneda por defecto</Label>
                  <Input id="default-currency" defaultValue="ARS" />
                </div>
                <div>
                  <Label htmlFor="price-precision">Precisión de precios</Label>
                  <Input id="price-precision" type="number" defaultValue="2" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-margins">Mostrar márgenes</Label>
                  <Switch id="show-margins" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Usuarios */}
        <TabsContent value="users" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">
              Configuración de Usuarios
            </h2>
            <p className="text-gray-600">
              Gestiona tu perfil y configuraciones de seguridad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil de Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user-name">Nombre</Label>
                  <Input
                    id="user-name"
                    value={userFormData.name}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, name: e.target.value })
                    }
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userFormData.email}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        email: e.target.value,
                      })
                    }
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="user-slug">Slug público</Label>
                  <Input
                    id="user-slug"
                    value={userFormData.slug}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, slug: e.target.value })
                    }
                    placeholder="tu-slug-publico"
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El slug de la cuenta principal no se puede modificar
                  </p>
                </div>
                <Button className="w-full" onClick={handleUpdateProfile}>
                  Actualizar Perfil
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={(e) =>
                      setPasswordFormData({
                        ...passwordFormData,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={(e) =>
                      setPasswordFormData({
                        ...passwordFormData,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) =>
                      setPasswordFormData({
                        ...passwordFormData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <Button className="w-full" onClick={handleChangePassword}>
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Negocios */}
        <TabsContent value="business" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Gestión de Negocios</h2>
            <p className="text-gray-600">
              Administra la configuración general de tu negocio y accede a
              herramientas avanzadas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gestión de Tiendas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Administra todas tus tiendas, cada una con sus propios
                  productos, categorías y configuraciones personalizadas.
                </p>
                <Button
                  className="w-full"
                  onClick={() => (window.location.href = "/stores")}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Ir a Gestión de Tiendas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles y Permisos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded">
                    <h4 className="font-medium">Administrador</h4>
                    <p className="text-sm text-gray-500">Acceso completo</p>
                    <Badge variant="default" className="mt-2">
                      Tu rol actual
                    </Badge>
                  </div>
                  <div className="p-4 border rounded">
                    <h4 className="font-medium">Editor</h4>
                    <p className="text-sm text-gray-500">
                      Gestionar productos y ventas
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Asignar
                    </Button>
                  </div>
                  <div className="p-4 border rounded">
                    <h4 className="font-medium">Vendedor</h4>
                    <p className="text-sm text-gray-500">
                      Solo realizar ventas
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Asignar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Herramientas Avanzadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h4 className="font-medium">Migración de Datos</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Herramientas para migrar y sincronizar datos entre tiendas
                  </p>
                  <Button variant="outline" size="sm">
                    Ejecutar Migración
                  </Button>
                </div>
                <div className="p-4 border rounded">
                  <h4 className="font-medium">Respaldo y Restauración</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Crea respaldos de tus datos y restaura desde copias de
                    seguridad
                  </p>
                  <Button variant="outline" size="sm">
                    Gestionar Respaldos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Página - Personalización Estética */}
        <TabsContent value="page" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">
                Personalización de la Tienda
              </h2>
              <p className="text-gray-600">
                Personaliza la apariencia de tu tienda pública con colores,
                logos y estilos personalizados
              </p>
            </div>

            {/* Paleta de Colores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Paleta de Colores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Color Primario */}
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={themeData.primaryColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            primaryColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={themeData.primaryColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            primaryColor: e.target.value,
                          })
                        }
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Usado en botones principales, enlaces y elementos
                      destacados
                    </p>
                  </div>

                  {/* Color Secundario */}
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={themeData.secondaryColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            secondaryColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={themeData.secondaryColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            secondaryColor: e.target.value,
                          })
                        }
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Usado en elementos de éxito, confirmaciones y acentos
                    </p>
                  </div>

                  {/* Color de Acento */}
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Color de Acento</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="accentColor"
                        type="color"
                        value={themeData.accentColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            accentColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={themeData.accentColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            accentColor: e.target.value,
                          })
                        }
                        placeholder="#F59E0B"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Usado en alertas, advertencias y elementos especiales
                    </p>
                  </div>

                  {/* Color de Fondo */}
                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Color de Fondo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={themeData.backgroundColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            backgroundColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={themeData.backgroundColor}
                        onChange={(e) =>
                          setThemeData({
                            ...themeData,
                            backgroundColor: e.target.value,
                          })
                        }
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Color de fondo principal de la página
                    </p>
                  </div>
                </div>

                {/* Vista Previa de Colores */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Vista Previa</h4>
                  <div className="flex flex-wrap gap-3">
                    <div
                      className="px-4 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: themeData.primaryColor }}
                    >
                      Botón Primario
                    </div>
                    <div
                      className="px-4 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: themeData.secondaryColor }}
                    >
                      Botón Secundario
                    </div>
                    <div
                      className="px-4 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: themeData.accentColor }}
                    >
                      Acento
                    </div>
                    <div
                      className="px-4 py-2 rounded border-2"
                      style={{
                        backgroundColor: themeData.backgroundColor,
                        borderColor: themeData.primaryColor,
                        color: themeData.textColor,
                      }}
                    >
                      Fondo
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logos y Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Logos y Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Principal */}
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">URL del Logo Principal</Label>
                    <Input
                      id="logoUrl"
                      value={themeData.logoUrl}
                      onChange={(e) =>
                        setThemeData({ ...themeData, logoUrl: e.target.value })
                      }
                      placeholder="https://ejemplo.com/logo.png"
                    />
                    <p className="text-sm text-gray-500">
                      URL de la imagen del logo para el header de tu tienda
                    </p>
                    {themeData.logoUrl && (
                      <div className="mt-2">
                        <img
                          src={themeData.logoUrl}
                          alt="Vista previa del logo"
                          className="h-16 object-contain border rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl">URL del Favicon</Label>
                    <Input
                      id="faviconUrl"
                      value={themeData.faviconUrl}
                      onChange={(e) =>
                        setThemeData({
                          ...themeData,
                          faviconUrl: e.target.value,
                        })
                      }
                      placeholder="https://ejemplo.com/favicon.ico"
                    />
                    <p className="text-sm text-gray-500">
                      Icono que aparece en la pestaña del navegador
                    </p>
                    {themeData.faviconUrl && (
                      <div className="mt-2">
                        <img
                          src={themeData.faviconUrl}
                          alt="Vista previa del favicon"
                          className="h-8 w-8 object-contain border rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSS Personalizado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  CSS Personalizado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customCss">Código CSS Personalizado</Label>
                  <Textarea
                    id="customCss"
                    value={themeData.customCss}
                    onChange={(e) =>
                      setThemeData({ ...themeData, customCss: e.target.value })
                    }
                    placeholder="/* Tu CSS personalizado aquí */
.custom-button {
  border-radius: 8px;
  font-weight: 600;
}

.product-card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}"
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500">
                    Agrega estilos CSS personalizados para personalizar aún más
                    tu tienda
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setThemeData({
                    primaryColor: "#3B82F6",
                    secondaryColor: "#10B981",
                    accentColor: "#F59E0B",
                    backgroundColor: "#FFFFFF",
                    textColor: "#1F2937",
                    cardBackground: "#F9FAFB",
                    borderColor: "#E5E7EB",
                    logoUrl: "",
                    faviconUrl: "",
                    customCss: "",
                  });
                }}
              >
                Restaurar Valores por Defecto
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Tema Guardado",
                    description:
                      "La configuración de tu tienda ha sido guardada exitosamente",
                  });
                }}
              >
                Guardar Configuración
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Edición de Categorías */}
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

      {/* Modal de Eliminación de Categorías */}
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
                    ⚠️ Esta categoría tiene {deleteCategory.totalProducts}{" "}
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
    </div>
  );
}

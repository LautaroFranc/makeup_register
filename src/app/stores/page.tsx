"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Settings,
  Palette,
  Users,
  BarChart3,
} from "lucide-react";

interface Store {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  isPublic: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    cardBackground: string;
    borderColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCss?: string;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  };
  settings: {
    allowPublicView: boolean;
    requireLogin: boolean;
    showPrices: boolean;
    showStock: boolean;
    enableSearch: boolean;
    enableFilters: boolean;
  };
  metrics: {
    totalProducts: number;
    publishedProducts: number;
    totalCategories: number;
    totalStock: number;
    totalValue: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterPublic, setFilterPublic] = useState<boolean | null>(null);
  const [storeFormData, setStoreFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    isPublic: true,
    theme: {
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
    },
    contact: {
      email: "",
      phone: "",
      address: "",
      socialMedia: {
        instagram: "",
        facebook: "",
        twitter: "",
      },
    },
    settings: {
      allowPublicView: true,
      requireLogin: false,
      showPrices: true,
      showStock: true,
      enableSearch: true,
      enableFilters: true,
    },
  });

  const { toast } = useToast();

  // Cargar tiendas
  const fetchStores = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Crear tienda
  const handleCreateStore = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeFormData),
      });

      if (response.ok) {
        const data = await response.json();
        setStores([...stores, data.store]);
        setStoreFormData({
          name: "",
          description: "",
          isActive: true,
          isPublic: true,
          theme: {
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
          },
          contact: {
            email: "",
            phone: "",
            address: "",
            socialMedia: {
              instagram: "",
              facebook: "",
              twitter: "",
            },
          },
          settings: {
            allowPublicView: true,
            requireLogin: false,
            showPrices: true,
            showStock: true,
            enableSearch: true,
            enableFilters: true,
          },
        });
        setIsCreateModalOpen(false);
        toast({
          title: "Éxito",
          description: "Tienda creada exitosamente",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear tienda");
      }
    } catch (error: any) {
      console.error("Error creating store:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la tienda",
        variant: "destructive",
      });
    }
  };

  // Editar tienda
  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreFormData({
      name: store.name,
      description: store.description || "",
      isActive: store.isActive,
      isPublic: store.isPublic,
      theme: {
        ...store.theme,
        logoUrl: store.theme.logoUrl || "",
        faviconUrl: store.theme.faviconUrl || "",
        customCss: store.theme.customCss || "",
      },
      contact: {
        email: store.contact?.email || "",
        phone: store.contact?.phone || "",
        address: store.contact?.address || "",
        socialMedia: {
          instagram: store.contact?.socialMedia?.instagram || "",
          facebook: store.contact?.socialMedia?.facebook || "",
          twitter: store.contact?.socialMedia?.twitter || "",
        },
      },
      settings: store.settings,
    });
    setIsEditModalOpen(true);
  };

  // Actualizar tienda
  const handleUpdateStore = async () => {
    if (!editingStore) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stores?id=${editingStore._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeFormData),
      });

      if (response.ok) {
        const data = await response.json();
        setStores(
          stores.map((store) =>
            store._id === editingStore._id ? data.store : store
          )
        );
        setIsEditModalOpen(false);
        setEditingStore(null);
        toast({
          title: "Éxito",
          description: "Tienda actualizada exitosamente",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar tienda");
      }
    } catch (error: any) {
      console.error("Error updating store:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la tienda",
        variant: "destructive",
      });
    }
  };

  // Eliminar tienda
  const handleDeleteStore = async () => {
    if (!deleteStore) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stores?id=${deleteStore._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStores(stores.filter((store) => store._id !== deleteStore._id));
        setDeleteStore(null);
        toast({
          title: "Éxito",
          description: "Tienda eliminada exitosamente",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar tienda");
      }
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la tienda",
        variant: "destructive",
      });
    }
  };

  // Filtrar tiendas
  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesActive =
      filterActive === null || store.isActive === filterActive;
    const matchesPublic =
      filterPublic === null || store.isPublic === filterPublic;

    return matchesSearch && matchesActive && matchesPublic;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tiendas</h1>
          <p className="text-gray-600">
            Administra todas tus tiendas y sus configuraciones
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tienda
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tiendas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(null)}
              >
                Todas
              </Button>
              <Button
                variant={filterActive === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(true)}
              >
                Activas
              </Button>
              <Button
                variant={filterActive === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(false)}
              >
                Inactivas
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterPublic === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPublic(null)}
              >
                Todas
              </Button>
              <Button
                variant={filterPublic === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPublic(true)}
              >
                Públicas
              </Button>
              <Button
                variant={filterPublic === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPublic(false)}
              >
                Privadas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tiendas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store) => (
          <Card key={store._id} className="relative group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {store.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={store.isActive ? "default" : "secondary"}>
                    {store.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                  <Badge variant={store.isPublic ? "outline" : "destructive"}>
                    {store.isPublic ? "Pública" : "Privada"}
                  </Badge>
                </div>
              </div>
              {store.description && (
                <p className="text-sm text-gray-600">{store.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Productos</p>
                  <p className="font-medium">
                    {store.metrics?.totalProducts || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Categorías</p>
                  <p className="font-medium">
                    {store.metrics?.totalCategories || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Stock Total</p>
                  <p className="font-medium">
                    {store.metrics?.totalStock || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Valor Total</p>
                  <p className="font-medium">
                    ${Number(store.metrics?.totalValue || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditStore(store)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/store/${store.slug}`, "_blank")}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteStore(store)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredStores.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterActive !== null || filterPublic !== null
                ? "No se encontraron tiendas"
                : "No tienes tiendas creadas"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterActive !== null || filterPublic !== null
                ? "Intenta ajustar los filtros de búsqueda"
                : "Crea tu primera tienda para comenzar"}
            </p>
            {!searchTerm && filterActive === null && filterPublic === null && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Tienda
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Crear Tienda */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tienda</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store-name">Nombre de la Tienda *</Label>
                  <Input
                    id="store-name"
                    value={storeFormData.name}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Mi Tienda Online"
                  />
                </div>
                <div>
                  <Label htmlFor="store-description">Descripción</Label>
                  <Input
                    id="store-description"
                    value={storeFormData.description}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción de la tienda"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Visibilidad */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuración</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="store-active">Tienda Activa</Label>
                  <Switch
                    id="store-active"
                    checked={storeFormData.isActive}
                    onCheckedChange={(checked) =>
                      setStoreFormData({ ...storeFormData, isActive: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="store-public">Tienda Pública</Label>
                  <Switch
                    id="store-public"
                    checked={storeFormData.isPublic}
                    onCheckedChange={(checked) =>
                      setStoreFormData({ ...storeFormData, isPublic: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Tema */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tema y Colores</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="store-primary-color">Color Primario</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="store-primary-color"
                      type="color"
                      value={storeFormData.theme.primaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.primaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="store-secondary-color">
                    Color Secundario
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="store-secondary-color"
                      type="color"
                      value={storeFormData.theme.secondaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            secondaryColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.secondaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            secondaryColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="store-accent-color">Color de Acento</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="store-accent-color"
                      type="color"
                      value={storeFormData.theme.accentColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            accentColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.accentColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            accentColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store-email">Email de Contacto</Label>
                  <Input
                    id="store-email"
                    type="email"
                    value={storeFormData.contact.email}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="contacto@mitienda.com"
                  />
                </div>
                <div>
                  <Label htmlFor="store-phone">Teléfono</Label>
                  <Input
                    id="store-phone"
                    value={storeFormData.contact.phone}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          phone: e.target.value,
                        },
                      })
                    }
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="store-address">Dirección</Label>
                  <Input
                    id="store-address"
                    value={storeFormData.contact.address}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          address: e.target.value,
                        },
                      })
                    }
                    placeholder="Av. Corrientes 1234, CABA, Argentina"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateStore}>Crear Tienda</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Tienda */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tienda</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-store-name">Nombre de la Tienda *</Label>
                  <Input
                    id="edit-store-name"
                    value={storeFormData.name}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Mi Tienda Online"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-store-description">Descripción</Label>
                  <Input
                    id="edit-store-description"
                    value={storeFormData.description}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción de la tienda"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Visibilidad */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuración</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-store-active">Tienda Activa</Label>
                  <Switch
                    id="edit-store-active"
                    checked={storeFormData.isActive}
                    onCheckedChange={(checked) =>
                      setStoreFormData({ ...storeFormData, isActive: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-store-public">Tienda Pública</Label>
                  <Switch
                    id="edit-store-public"
                    checked={storeFormData.isPublic}
                    onCheckedChange={(checked) =>
                      setStoreFormData({ ...storeFormData, isPublic: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Tema */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tema y Colores</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-store-primary-color">
                    Color Primario
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-store-primary-color"
                      type="color"
                      value={storeFormData.theme.primaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.primaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-store-secondary-color">
                    Color Secundario
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-store-secondary-color"
                      type="color"
                      value={storeFormData.theme.secondaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            secondaryColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.secondaryColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            secondaryColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-store-accent-color">
                    Color de Acento
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-store-accent-color"
                      type="color"
                      value={storeFormData.theme.accentColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            accentColor: e.target.value,
                          },
                        })
                      }
                      className="w-12 h-10"
                    />
                    <Input
                      value={storeFormData.theme.accentColor}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          theme: {
                            ...storeFormData.theme,
                            accentColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-store-email">Email de Contacto</Label>
                  <Input
                    id="edit-store-email"
                    type="email"
                    value={storeFormData.contact.email}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="contacto@mitienda.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-store-phone">Teléfono</Label>
                  <Input
                    id="edit-store-phone"
                    value={storeFormData.contact.phone}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          phone: e.target.value,
                        },
                      })
                    }
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-store-address">Dirección</Label>
                  <Input
                    id="edit-store-address"
                    value={storeFormData.contact.address}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        contact: {
                          ...storeFormData.contact,
                          address: e.target.value,
                        },
                      })
                    }
                    placeholder="Av. Corrientes 1234, CABA, Argentina"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateStore}>Actualizar Tienda</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminación de Tienda */}
      <AlertDialog
        open={!!deleteStore}
        onOpenChange={() => setDeleteStore(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              tienda "{deleteStore?.name}" y todos sus datos asociados.
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 font-medium">
                  ⚠️ Esta acción eliminará:
                </p>
                <ul className="text-red-600 text-sm list-disc list-inside mt-1">
                  <li>Todos los productos de la tienda</li>
                  <li>Todas las categorías de la tienda</li>
                  <li>Todas las métricas y configuraciones</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar Tienda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

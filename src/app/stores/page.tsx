"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { MultiBannerUpload } from "@/components/MultiBannerUpload";
import { PaymentMethodsConfig } from "@/components/PaymentMethodsConfig";
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
  storeName?: string;
  description?: string;
  slug: string;
  customUrl?: string;
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
    bannerUrls?: string[];
    fontFamily?: string;
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
  paymentMethods: {
    directSale: {
      enabled: boolean;
      whatsapp?: string;
      instagram?: string;
      facebook?: string;
      telegram?: string;
    };
    mercadoPago?: {
      enabled: boolean;
      publicKey?: string;
      accessToken?: string;
    };
    bankTransfer?: {
      enabled: boolean;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      accountType?: string;
      cbu?: string;
      alias?: string;
    };
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
    storeName: "",
    description: "",
    customUrl: "",
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
      bannerUrls: [] as string[],
      fontFamily: "Inter, sans-serif",
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
    paymentMethods: {
      directSale: {
        enabled: false,
        whatsapp: "",
        instagram: "",
        facebook: "",
        telegram: "",
      },
      mercadoPago: {
        enabled: false,
        publicKey: "",
        accessToken: "",
      },
      bankTransfer: {
        enabled: false,
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        accountType: "",
        cbu: "",
        alias: "",
      },
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
          storeName: "",
          description: "",
          customUrl: "",
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
            bannerUrls: [],
            fontFamily: "Inter, sans-serif",
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
          paymentMethods: {
            directSale: {
              enabled: false,
              whatsapp: "",
              instagram: "",
              facebook: "",
              telegram: "",
            },
            mercadoPago: {
              enabled: false,
              publicKey: "",
              accessToken: "",
            },
            bankTransfer: {
              enabled: false,
              bankName: "",
              accountNumber: "",
              accountHolder: "",
              accountType: "",
              cbu: "",
              alias: "",
            },
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
      storeName: store.storeName || "",
      description: store.description || "",
      customUrl: store.customUrl || "",
      isActive: store.isActive,
      isPublic: store.isPublic,
      theme: {
        ...store.theme,
        logoUrl: store.theme.logoUrl || "",
        faviconUrl: store.theme.faviconUrl || "",
        bannerUrls: store.theme.bannerUrls || [],
        fontFamily: store.theme.fontFamily || "Inter, sans-serif",
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
      paymentMethods: {
        directSale: {
          enabled: store.paymentMethods?.directSale?.enabled ?? false,
          whatsapp: store.paymentMethods?.directSale?.whatsapp ?? "",
          instagram: store.paymentMethods?.directSale?.instagram ?? "",
          facebook: store.paymentMethods?.directSale?.facebook ?? "",
          telegram: store.paymentMethods?.directSale?.telegram ?? "",
        },
        mercadoPago: {
          enabled: store.paymentMethods?.mercadoPago?.enabled ?? false,
          publicKey: store.paymentMethods?.mercadoPago?.publicKey ?? "",
          accessToken: store.paymentMethods?.mercadoPago?.accessToken ?? "",
        },
        bankTransfer: {
          enabled: store.paymentMethods?.bankTransfer?.enabled ?? false,
          bankName: store.paymentMethods?.bankTransfer?.bankName ?? "",
          accountNumber: store.paymentMethods?.bankTransfer?.accountNumber ?? "",
          accountHolder: store.paymentMethods?.bankTransfer?.accountHolder ?? "",
          accountType: store.paymentMethods?.bankTransfer?.accountType ?? "",
          cbu: store.paymentMethods?.bankTransfer?.cbu ?? "",
          alias: store.paymentMethods?.bankTransfer?.alias ?? "",
        },
      },
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tienda</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="design">Diseño</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
            </TabsList>

            {/* Tab: Información Básica */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="store-name">Nombre Interno *</Label>
                  <Input
                    id="store-name"
                    value={storeFormData.name}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Mi Tienda de Maquillaje"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre interno para tu administración</p>
                </div>

                <div>
                  <Label htmlFor="store-public-name">Nombre Público</Label>
                  <Input
                    id="store-public-name"
                    value={storeFormData.storeName}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        storeName: e.target.value,
                      })
                    }
                    placeholder="Glam Beauty Store"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre que verán tus clientes</p>
                </div>

                <div>
                  <Label htmlFor="store-custom-url">URL Personalizada</Label>
                  <Input
                    id="store-custom-url"
                    value={storeFormData.customUrl}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        customUrl: e.target.value,
                      })
                    }
                    placeholder="https://mitienda.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional: URL personalizada de tu tienda</p>
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
                    placeholder="Descripción de tu tienda..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
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
            </TabsContent>

            {/* Tab: Diseño */}
            <TabsContent value="design" className="space-y-4">
              <MultiBannerUpload
                bannerUrls={storeFormData.theme.bannerUrls}
                onBannerUrlsChange={(urls) =>
                  setStoreFormData({
                    ...storeFormData,
                    theme: { ...storeFormData.theme, bannerUrls: urls },
                  })
                }
              />

              <div>
                <Label htmlFor="font-family">Tipografía</Label>
                <select
                  id="font-family"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={storeFormData.theme.fontFamily}
                  onChange={(e) =>
                    setStoreFormData({
                      ...storeFormData,
                      theme: { ...storeFormData.theme, fontFamily: e.target.value },
                    })
                  }
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                  <option value="Playfair Display, serif">Playfair Display</option>
                </select>
              </div>
            </TabsContent>

            {/* Tab: Contacto */}
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2">
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
            </TabsContent>

            {/* Tab: Métodos de Pago */}
            <TabsContent value="payments" className="space-y-4">
              <PaymentMethodsConfig
                paymentMethods={storeFormData.paymentMethods}
                onPaymentMethodsChange={(methods) =>
                  setStoreFormData({ ...storeFormData, paymentMethods: methods as any })
                }
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateStore}>Crear Tienda</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Tienda */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tienda</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="design">Diseño</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
            </TabsList>

            {/* Tab: Información Básica */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-storeName">
                      Nombre Público de la Tienda
                    </Label>
                    <Input
                      id="edit-storeName"
                      value={storeFormData.storeName}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          storeName: e.target.value,
                        })
                      }
                      placeholder="Nombre que verán los clientes"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Este es el nombre que se mostrará en tu tienda pública
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="edit-customUrl">URL Personalizada</Label>
                    <Input
                      id="edit-customUrl"
                      value={storeFormData.customUrl}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          customUrl: e.target.value,
                        })
                      }
                      placeholder="mi-tienda-online"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL personalizada para tu tienda
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-name">Nombre Interno *</Label>
                  <Input
                    id="edit-name"
                    value={storeFormData.name}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Mi Tienda"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre para tu gestión interna
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Input
                    id="edit-description"
                    value={storeFormData.description}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción de tu tienda"
                  />
                </div>

                {/* Switches de configuración */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Tienda Activa</Label>
                      <p className="text-sm text-gray-500">
                        La tienda estará disponible para gestión
                      </p>
                    </div>
                    <Switch
                      checked={storeFormData.isActive}
                      onCheckedChange={(checked) =>
                        setStoreFormData({
                          ...storeFormData,
                          isActive: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Tienda Pública</Label>
                      <p className="text-sm text-gray-500">
                        La tienda será visible públicamente
                      </p>
                    </div>
                    <Switch
                      checked={storeFormData.isPublic}
                      onCheckedChange={(checked) =>
                        setStoreFormData({
                          ...storeFormData,
                          isPublic: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Diseño */}
            <TabsContent value="design" className="space-y-4">
              <div className="space-y-4">
                {/* Multi Banner Upload */}
                <div>
                  <Label>Banners de la Tienda</Label>
                  <MultiBannerUpload
                    bannerUrls={storeFormData.theme.bannerUrls}
                    onBannerUrlsChange={(urls) =>
                      setStoreFormData({
                        ...storeFormData,
                        theme: {
                          ...storeFormData.theme,
                          bannerUrls: urls,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sube hasta 5 imágenes para el carrusel de banners
                  </p>
                </div>

                {/* Fuente */}
                <div>
                  <Label htmlFor="edit-fontFamily">Fuente</Label>
                  <select
                    id="edit-fontFamily"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={storeFormData.theme.fontFamily}
                    onChange={(e) =>
                      setStoreFormData({
                        ...storeFormData,
                        theme: {
                          ...storeFormData.theme,
                          fontFamily: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Open Sans, sans-serif">Open Sans</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="Lato, sans-serif">Lato</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                  </select>
                </div>

                {/* Paleta de Colores */}
                <div>
                  <Label className="mb-2 block">Paleta de Colores</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-primaryColor" className="text-xs">
                        Color Primario
                      </Label>
                      <Input
                        id="edit-primaryColor"
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-secondaryColor" className="text-xs">
                        Color Secundario
                      </Label>
                      <Input
                        id="edit-secondaryColor"
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-accentColor" className="text-xs">
                        Color de Acento
                      </Label>
                      <Input
                        id="edit-accentColor"
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-backgroundColor" className="text-xs">
                        Color de Fondo
                      </Label>
                      <Input
                        id="edit-backgroundColor"
                        type="color"
                        value={storeFormData.theme.backgroundColor}
                        onChange={(e) =>
                          setStoreFormData({
                            ...storeFormData,
                            theme: {
                              ...storeFormData.theme,
                              backgroundColor: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-textColor" className="text-xs">
                        Color de Texto
                      </Label>
                      <Input
                        id="edit-textColor"
                        type="color"
                        value={storeFormData.theme.textColor}
                        onChange={(e) =>
                          setStoreFormData({
                            ...storeFormData,
                            theme: {
                              ...storeFormData.theme,
                              textColor: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cardBackground" className="text-xs">
                        Fondo de Tarjetas
                      </Label>
                      <Input
                        id="edit-cardBackground"
                        type="color"
                        value={storeFormData.theme.cardBackground}
                        onChange={(e) =>
                          setStoreFormData({
                            ...storeFormData,
                            theme: {
                              ...storeFormData.theme,
                              cardBackground: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Contacto */}
            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
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
                      placeholder="contacto@tienda.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-phone">Teléfono</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
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
                </div>

                <div>
                  <Label htmlFor="edit-address">Dirección</Label>
                  <Input
                    id="edit-address"
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
                    placeholder="Calle 123, Ciudad"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-instagram">Instagram</Label>
                    <Input
                      id="edit-instagram"
                      value={storeFormData.contact.socialMedia?.instagram || ""}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          contact: {
                            ...storeFormData.contact,
                            socialMedia: {
                              ...storeFormData.contact.socialMedia,
                              instagram: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="@mitienda"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-facebook">Facebook</Label>
                    <Input
                      id="edit-facebook"
                      value={storeFormData.contact.socialMedia?.facebook || ""}
                      onChange={(e) =>
                        setStoreFormData({
                          ...storeFormData,
                          contact: {
                            ...storeFormData.contact,
                            socialMedia: {
                              ...storeFormData.contact.socialMedia,
                              facebook: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="facebook.com/mitienda"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Métodos de Pago */}
            <TabsContent value="payments" className="space-y-4">
              <PaymentMethodsConfig
                paymentMethods={storeFormData.paymentMethods}
                onPaymentMethodsChange={(methods) =>
                  setStoreFormData({
                    ...storeFormData,
                    paymentMethods: methods as any,
                  })
                }
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateStore}>Actualizar Tienda</Button>
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

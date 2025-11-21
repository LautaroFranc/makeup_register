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
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import {
  Package,
  Loader2,
  Settings,
  User,
  Shield,
  Palette,
  Building2,
  Monitor,
} from "lucide-react";

export default function SettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchStores();
    setLoading(false);
    if (user) {
      setUserFormData({
        name: user.name || "",
        email: user.email || "",
        slug: user.slug || "",
      });
    }
  }, [user]);

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
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
    </div>
  );
}

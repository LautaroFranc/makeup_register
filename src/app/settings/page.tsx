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
  Mail,
} from "lucide-react";
import { buildEmailTemplate } from "@/lib/emailTemplate";

export default function SettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para plantilla de bienvenida personalizada
  const [welcomeSubject, setWelcomeSubject] = useState("¡Gracias por registrarte!");
  const [welcomeTemplate, setWelcomeTemplate] = useState("");
  const [savingWelcomeEmail, setSavingWelcomeEmail] = useState(false);
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
  const [heroData, setHeroData] = useState({
    title: "",
    subtitle: "",
    ctaText: "",
    tagline: "",
  });
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
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

        // Si hay al menos una tienda, pedir detalle para cargar configuraciones completas
        if (data.stores && data.stores.length > 0) {
          const firstStoreId = data.stores[0]._id;
          const detailRes = await fetch(`/api/stores?id=${firstStoreId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const detailData = await detailRes.json();
          if (detailData.success && detailData.store?.settings) {
            setWelcomeSubject(
              detailData.store.settings.welcomeEmailSubject || "¡Gracias por registrarte!"
            );
            setWelcomeTemplate(
              detailData.store.settings.welcomeEmailTemplate || ""
            );
          }
        }
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

  // Guardar plantilla de email de bienvenida
  const handleSaveWelcomeEmail = async () => {
    if (!stores || stores.length === 0) {
      toast({
        title: "Error",
        description: "No se encontró una tienda asociada para guardar",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingWelcomeEmail(true);
      const token = localStorage.getItem("token");
      const storeId = stores[0]._id;

      const response = await fetch(`/api/stores?id=${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            welcomeEmailSubject: welcomeSubject,
            welcomeEmailTemplate: welcomeTemplate,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "¡Plantilla Guardada!",
          description: "La plantilla del correo de bienvenida ha sido actualizada exitosamente.",
        });
      } else {
        throw new Error(result.error || "No se pudo actualizar la plantilla");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al guardar la plantilla: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setSavingWelcomeEmail(false);
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
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Bienvenida
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
              <h2 className="text-2xl font-bold">Personalización de la Tienda</h2>
              <p className="text-gray-600">
                Editá los textos del hero, los banners y los colores de tu tienda pública
              </p>
            </div>

            {/* Hero Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Textos del Hero / Portada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Título principal</Label>
                    <Input
                      id="heroTitle"
                      value={heroData.title}
                      onChange={(e) => setHeroData({ ...heroData, title: e.target.value })}
                      placeholder="Ej: Bienvenida a nuestra tienda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroTagline">Tagline (frase corta)</Label>
                    <Input
                      id="heroTagline"
                      value={heroData.tagline}
                      onChange={(e) => setHeroData({ ...heroData, tagline: e.target.value })}
                      placeholder="Ej: Belleza que inspira"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Subtítulo / descripción</Label>
                  <Textarea
                    id="heroSubtitle"
                    rows={3}
                    value={heroData.subtitle}
                    onChange={(e) => setHeroData({ ...heroData, subtitle: e.target.value })}
                    placeholder="Ej: Encontrá los mejores productos de maquillaje con envío a todo el país"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroCta">Texto del botón CTA</Label>
                  <Input
                    id="heroCta"
                    value={heroData.ctaText}
                    onChange={(e) => setHeroData({ ...heroData, ctaText: e.target.value })}
                    placeholder="Ej: Ver productos"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Banners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Imágenes del Banner / Hero
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Subí hasta 5 imágenes. Se usan como slider o imagen principal en tu tienda pública.
                </p>
                {bannerUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {bannerUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border">
                        <img src={url} alt={`Banner ${idx + 1}`} className="w-full h-28 object-cover" />
                        <button
                          onClick={() => setBannerUrls(bannerUrls.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {bannerUrls.length < 5 && (
                  <label
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      uploadingBanner ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingBanner}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingBanner(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/upload-image", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.success) {
                            setBannerUrls((prev) => [...prev, data.url]);
                          } else {
                            toast({ title: "Error al subir imagen", description: data.error, variant: "destructive" });
                          }
                        } catch {
                          toast({ title: "Error de red", description: "No se pudo subir la imagen", variant: "destructive" });
                        } finally {
                          setUploadingBanner(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    {uploadingBanner ? (
                      <div className="flex items-center gap-2 text-blue-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Subiendo imagen...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Package className="h-8 w-8" />
                        <span className="text-sm font-medium">Hacé clic para subir una imagen</span>
                        <span className="text-xs">PNG, JPG, WEBP · Máx. 5 MB</span>
                      </div>
                    )}
                  </label>
                )}
              </CardContent>
            </Card>

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
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex items-center gap-3">
                      <Input id="primaryColor" type="color" value={themeData.primaryColor}
                        onChange={(e) => setThemeData({ ...themeData, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded" />
                      <Input value={themeData.primaryColor}
                        onChange={(e) => setThemeData({ ...themeData, primaryColor: e.target.value })}
                        placeholder="#3B82F6" className="flex-1" />
                    </div>
                    <p className="text-sm text-gray-500">Usado en botones principales y enlaces</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                    <div className="flex items-center gap-3">
                      <Input id="secondaryColor" type="color" value={themeData.secondaryColor}
                        onChange={(e) => setThemeData({ ...themeData, secondaryColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded" />
                      <Input value={themeData.secondaryColor}
                        onChange={(e) => setThemeData({ ...themeData, secondaryColor: e.target.value })}
                        placeholder="#10B981" className="flex-1" />
                    </div>
                    <p className="text-sm text-gray-500">Usado en confirmaciones y acentos</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Color de Acento</Label>
                    <div className="flex items-center gap-3">
                      <Input id="accentColor" type="color" value={themeData.accentColor}
                        onChange={(e) => setThemeData({ ...themeData, accentColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded" />
                      <Input value={themeData.accentColor}
                        onChange={(e) => setThemeData({ ...themeData, accentColor: e.target.value })}
                        placeholder="#F59E0B" className="flex-1" />
                    </div>
                    <p className="text-sm text-gray-500">Alertas y elementos especiales</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Color de Fondo</Label>
                    <div className="flex items-center gap-3">
                      <Input id="backgroundColor" type="color" value={themeData.backgroundColor}
                        onChange={(e) => setThemeData({ ...themeData, backgroundColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded" />
                      <Input value={themeData.backgroundColor}
                        onChange={(e) => setThemeData({ ...themeData, backgroundColor: e.target.value })}
                        placeholder="#FFFFFF" className="flex-1" />
                    </div>
                    <p className="text-sm text-gray-500">Color de fondo principal</p>
                  </div>
                </div>
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Vista Previa</h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: themeData.primaryColor }}>Primario</div>
                    <div className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: themeData.secondaryColor }}>Secundario</div>
                    <div className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: themeData.accentColor }}>Acento</div>
                    <div className="px-4 py-2 rounded border-2" style={{ backgroundColor: themeData.backgroundColor, borderColor: themeData.primaryColor, color: themeData.textColor }}>Fondo</div>
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
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">URL del Logo Principal</Label>
                    <Input id="logoUrl" value={themeData.logoUrl}
                      onChange={(e) => setThemeData({ ...themeData, logoUrl: e.target.value })}
                      placeholder="https://ejemplo.com/logo.png" />
                    <p className="text-sm text-gray-500">Logo para el header de tu tienda</p>
                    {themeData.logoUrl && (
                      <img src={themeData.logoUrl} alt="Logo" className="h-16 object-contain border rounded mt-2"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl">URL del Favicon</Label>
                    <Input id="faviconUrl" value={themeData.faviconUrl}
                      onChange={(e) => setThemeData({ ...themeData, faviconUrl: e.target.value })}
                      placeholder="https://ejemplo.com/favicon.ico" />
                    <p className="text-sm text-gray-500">Icono de la pestaña del navegador</p>
                    {themeData.faviconUrl && (
                      <img src={themeData.faviconUrl} alt="Favicon" className="h-8 w-8 object-contain border rounded mt-2"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
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
                  <Textarea id="customCss" value={themeData.customCss}
                    onChange={(e) => setThemeData({ ...themeData, customCss: e.target.value })}
                    placeholder={`/* Tu CSS personalizado aquí */\n.custom-button { border-radius: 8px; }`}
                    rows={8} className="font-mono text-sm" />
                </div>
              </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setThemeData({ primaryColor: "#3B82F6", secondaryColor: "#10B981", accentColor: "#F59E0B",
                    backgroundColor: "#FFFFFF", textColor: "#1F2937", cardBackground: "#F9FAFB",
                    borderColor: "#E5E7EB", logoUrl: "", faviconUrl: "", customCss: "" });
                  setHeroData({ title: "", subtitle: "", ctaText: "", tagline: "" });
                  setBannerUrls([]);
                }}
              >
                Restaurar Valores por Defecto
              </Button>
              <Button
                disabled={savingPage}
                onClick={async () => {
                  if (!stores || stores.length === 0) {
                    toast({ title: "Error", description: "No hay tienda asociada", variant: "destructive" });
                    return;
                  }
                  setSavingPage(true);
                  try {
                    const token = localStorage.getItem("token");
                    const storeId = stores[0]._id;
                    const res = await fetch(`/api/stores?id=${storeId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ theme: { ...themeData, bannerUrls }, hero: heroData }),
                    });
                    const result = await res.json();
                    if (result.success) {
                      toast({ title: "¡Guardado!", description: "La apariencia de tu tienda fue actualizada." });
                    } else {
                      throw new Error(result.error);
                    }
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message || "No se pudo guardar", variant: "destructive" });
                  } finally {
                    setSavingPage(false);
                  }
                }}
              >
                {savingPage ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>) : "Guardar Configuración"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab de Email de Bienvenida */}
        <TabsContent value="email" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Correo de Bienvenida Automático</h2>
            <p className="text-gray-600">
              Personaliza el correo electrónico que reciben automáticamente tus nuevos clientes al registrarse.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Configurar Mensaje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcomeSubject">Asunto del Correo</Label>
                  <Input
                    id="welcomeSubject"
                    value={welcomeSubject}
                    onChange={(e) => setWelcomeSubject(e.target.value)}
                    placeholder="Ej: ¡Gracias por sumarte a nuestra comunidad!"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="welcomeTemplate">Cuerpo del Correo (HTML o Texto)</Label>
                    <span className="text-xs text-purple-600 font-medium">
                      Variables: {"{name}"}, {"{tienda}"}
                    </span>
                  </div>
                  <Textarea
                    id="welcomeTemplate"
                    rows={12}
                    value={welcomeTemplate}
                    onChange={(e) => setWelcomeTemplate(e.target.value)}
                    placeholder="<h2>¡Hola {name}!</h2>\n<p>Gracias por registrarte en {tienda}. Disfruta de nuestras promociones...</p>"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si dejas este campo vacío, se enviará el diseño de bienvenida estándar por defecto.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveWelcomeEmail}
                    disabled={savingWelcomeEmail}
                  >
                    {savingWelcomeEmail ? "Guardando..." : "Guardar Plantilla"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vista previa */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Vista Previa del Email</span>
                  <Badge variant="outline" className="text-xs">En Vivo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-3 bg-muted/20 min-h-[400px]">
                <div className="w-full h-full min-h-[380px] rounded-lg border bg-white overflow-hidden shadow-xs">
                  <iframe
                    title="Vista Previa Email Bienvenida"
                    srcDoc={buildEmailTemplate({
                      storeName: stores[0]?.name || "Tu Tienda",
                      content: welcomeTemplate
                        ? welcomeTemplate
                            .replace(/{name}/gi, "María Pérez")
                            .replace(/{nombre}/gi, "María Pérez")
                            .replace(/{tienda}/gi, stores[0]?.name || "Tu Tienda")
                        : `<h2 style="color: #d946ef; text-align: center; margin-top: 0;">¡Gracias por registrarte, María Pérez!</h2><p style="font-size: 16px; color: #333;">Nos alegra mucho tenerte con nosotros.</p>`,
                      isHtml: true,
                      recipientEmail: "cliente@ejemplo.com",
                    })}
                    className="w-full h-full min-h-[380px] border-0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

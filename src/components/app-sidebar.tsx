import React from "react";
import {
  Calendar,
  Home,
  PackagePlus,
  Star,
  Package,
  Boxes,
  User,
  LogOut,
  Settings,
  Tags,
  Store,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

// Menu items.
const items = [
  {
    title: "inicio",
    url: "/",
    icon: Home,
  },
  {
    title: "Productos",
    icon: Boxes,
    subItems: [
      {
        title: "Agregar producto",
        url: "/products/createProduct",
        icon: PackagePlus,
      },
      {
        title: "Productos",
        url: "/products/table",
        icon: Star,
      },
    ],
  },
  {
    title: "Tiendas",
    url: "/stores",
    icon: Store,
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Planificacion",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Envios",
    url: "#",
    icon: Package,
  },
];

export function AppSidebar() {
  const { user, loading, error, logout, refreshUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Registro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                item.subItems ? (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <subItem.icon />
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer con información del usuario */}
      <SidebarFooter className="p-4">
        {loading ? (
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center p-2 space-y-2">
            <div className="text-red-600 text-sm font-medium">⚠️ Error</div>
            <p className="text-xs text-gray-500">{error}</p>
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={refreshUser}
              >
                Reintentar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700"
                onClick={() => {
                  localStorage.removeItem("token");
                  router.push("/login");
                }}
              >
                Ir a Login
              </Button>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-3">
            {/* Información del usuario */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-xs font-medium">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <Separator />

            {/* Botones de acción */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900"
                onClick={() =>
                  toast({
                    title: "Configuración",
                    description:
                      "Esta funcionalidad estará disponible próximamente",
                  })
                }
              >
                <Settings className="h-4 w-4" />
                Configuración
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-2">
            <p className="text-sm text-gray-500">No hay usuario logueado</p>
            <div className="space-y-1 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push("/login")}
              >
                Iniciar Sesión
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

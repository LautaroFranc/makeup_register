"use client";

import React, { useState } from "react";
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
  Tag,
  Calculator,
  History,
  FolderTree,
  ChevronDown,
  Sparkles,
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

// Secciones del menú agrupadas
const menuGroups = [
  {
    label: "General",
    items: [
      {
        title: "Inicio",
        url: "/",
        icon: Home,
      },
      {
        title: "Tiendas",
        url: "/stores",
        icon: Store,
      },
    ],
  },
  {
    label: "Catálogo y Ventas",
    items: [
      {
        title: "Productos",
        icon: Boxes,
        subItems: [
          {
            title: "Lista de Productos",
            url: "/products/table",
            icon: Star,
          },
          {
            title: "Agregar Producto",
            url: "/products/createProduct",
            icon: PackagePlus,
          },
          {
            title: "Historial de Ventas",
            url: "/products/sales-history",
            icon: History,
          },
        ],
      },
      {
        title: "Categorías",
        url: "/categories",
        icon: FolderTree,
      },
      {
        title: "Promociones",
        icon: Tag,
        subItems: [
          {
            title: "Mis Promociones",
            url: "/promotions",
            icon: Tags,
          },
          {
            title: "Calculadora 2x1",
            url: "/promotions/calculator",
            icon: Calculator,
          },
        ],
      },
    ],
  },
  {
    label: "Clientes & Negocio",
    items: [
      {
        title: "Clientes & Leads",
        url: "/leads",
        icon: User,
      },
      {
        title: "Planificación",
        url: "#",
        icon: Calendar,
      },
      {
        title: "Envíos",
        url: "#",
        icon: Package,
      },
    ],
  },
  {
    label: "Ajustes",
    items: [
      {
        title: "Configuración",
        url: "/settings",
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar() {
  const { user, loading, error, logout, refreshUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // Estado para controlar submenús abiertos
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    Productos: true,
    Promociones: true,
  });

  const toggleSubMenu = (title: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      {/* Header del Sidebar */}
      <SidebarHeader className="p-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">
              Panel de Control
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-4">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx} className="p-0">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.url;
                  const isSubActive = item.subItems?.some(
                    (sub) => pathname === sub.url
                  );

                  const isOpen = openSubMenus[item.title] ?? isSubActive;

                  return item.subItems ? (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => toggleSubMenu(item.title)}
                        className={`w-full justify-between hover:bg-accent/80 transition-colors ${
                          isSubActive ? "font-medium text-primary bg-accent/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 text-muted-foreground transition-colors" />
                          <span>{item.title}</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>

                      {isOpen && (
                        <SidebarMenuSub className="ml-4 pl-2 border-l border-border/60 my-1 space-y-1">
                          {item.subItems.map((subItem) => {
                            const isChildActive = pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={`rounded-md transition-colors ${
                                    isChildActive
                                      ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:text-primary-foreground"
                                      : "hover:bg-accent hover:text-foreground text-muted-foreground"
                                  }`}
                                >
                                  <a
                                    href={subItem.url}
                                    className="flex items-center gap-2 py-1.5"
                                  >
                                    <subItem.icon className="h-3.5 w-3.5" />
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  ) : (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`rounded-md transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:text-primary-foreground"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <a href={item.url} className="flex items-center gap-2.5">
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer con información del usuario */}
      <SidebarFooter className="p-3 border-t border-border/60 bg-muted/20">
        {loading ? (
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-1">
              <div className="h-3.5 bg-muted rounded animate-pulse w-full"></div>
              <div className="h-3 bg-muted rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center p-2 space-y-2">
            <div className="text-destructive text-xs font-medium">⚠️ Error de sesión</div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <div className="space-y-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={refreshUser}
              >
                Reintentar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  localStorage.getItem("token") && localStorage.removeItem("token");
                  router.push("/login");
                }}
              >
                Ir a Login
              </Button>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-1.5 rounded-lg bg-background border border-border/50 shadow-xs">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-3.5 w-3.5" />
                Configuración
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="justify-center text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                onClick={logout}
                title="Cerrar Sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-1">
            <p className="text-xs text-muted-foreground mb-2">No has iniciado sesión</p>
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => router.push("/login")}
            >
              Iniciar Sesión
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

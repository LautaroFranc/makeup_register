"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { UserProviderWrapper } from "@/components/providers/UserProviderWrapper";
import { usePathname } from "next/navigation";
import "./globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  // Rutas públicas: login y el consentimiento OAuth (lo abre un cliente
  // externo y no debe quedar atrapado detrás de la sesión del panel).
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/oauth" ||
    pathname.startsWith("/oauth/");

  useEffect(() => {
    if (isPublicRoute) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [pathname, isPublicRoute, router]);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
      >
        <UserProviderWrapper>
          <SidebarProvider>
            {!isPublicRoute ? <AppSidebar /> : null}

            <main className="w-full">
              {!isPublicRoute ? <SidebarTrigger /> : null}
              {children}
              <Toaster />
            </main>
          </SidebarProvider>
        </UserProviderWrapper>
      </body>
    </html>
  );
}

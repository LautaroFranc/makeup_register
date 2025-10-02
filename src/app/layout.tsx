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

  useEffect(() => {
    if (![pathname].includes("/login")) {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
      }
    }
  }, [pathname]);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
      >
        <UserProviderWrapper>
          <SidebarProvider>
            {![pathname].includes("/login") ? <AppSidebar /> : null}

            <main className="w-full">
              <SidebarTrigger />
              {children}
              <Toaster />
            </main>
          </SidebarProvider>
        </UserProviderWrapper>
      </body>
    </html>
  );
}

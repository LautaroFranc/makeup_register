"use client";

import { UserProvider } from "@/contexts/UserContext";
import { ReactNode } from "react";

interface UserProviderWrapperProps {
  children: ReactNode;
}

export function UserProviderWrapper({ children }: UserProviderWrapperProps) {
  return <UserProvider>{children}</UserProvider>;
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export type UserRole = "admin" | "manager" | "employee";

interface User {
  _id: string;
  name: string;
  email: string;
  slug: string;
  role: UserRole; // 👈 Agregar rol al usuario
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => void;
  hasRole: (roles: UserRole[]) => boolean; // 👈 Helper para verificar roles
  isAdmin: () => boolean; // 👈 Helper para verificar si es admin
  isManager: () => boolean; // 👈 Helper para verificar si es manager
  isEmployee: () => boolean; // 👈 Helper para verificar si es empleado
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchUserData = async () => {
    try {
      setError(null);
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Solo cerrar sesión si el token es inválido o expirado
        localStorage.removeItem("token");
        setUser(null);
        setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
      } else {
        // Para otros errores, mostrar mensaje de error
        setUser(null);
        setError("Error al cargar los datos del usuario");
      }
    } catch (error) {
      setUser(null);
      setError("Error de conexión. Verifica tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string) => {
    localStorage.setItem("token", token);
    fetchUserData();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setError(null);
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    });
    router.push("/login");
  };

  const refreshUser = () => {
    fetchUserData();
  };

  // 👇 Funciones helper para verificar roles
  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = () => hasRole(["admin"]);
  const isManager = () => hasRole(["manager"]);
  const isEmployee = () => hasRole(["employee"]);

  useEffect(() => {
    // Solo cargar datos si no se ha inicializado aún
    if (!initialized) {
      fetchUserData();
      setInitialized(true);
    }
  }, [initialized]);

  const value: UserContextType = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refreshUser,
      hasRole,
      isAdmin,
      isManager,
      isEmployee,
    }),
    [user, loading, error]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

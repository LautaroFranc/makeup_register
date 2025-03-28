import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { jwtDecode } from "jwt-decode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatToARS = (amount: number): string => {
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function formatDate(date: string | Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  return new Date(date).toLocaleDateString("es-ES", options).replace(".", "");
}

export function tokenDecode(): { name: string; slug: string } | null {
  const token = localStorage.getItem("token");

  if (token) {
    const decoded = jwtDecode(token) as { name: string; slug: string };
    return decoded;
  }
  return null;
}

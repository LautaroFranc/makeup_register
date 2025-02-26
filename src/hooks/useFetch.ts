import { useState, useCallback } from "react";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: HeadersInit;
  body?: BodyInit | null;
}

interface FetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchData: (url: string, options?: FetchOptions) => Promise<void>;
}
const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.URL_PROD
    : "http://localhost:3000/";

export function useFetch<T = unknown>(): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(
    async (url: string, options: FetchOptions = { method: "GET" }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(baseUrl + url, options);
console.log(url,baseUrl)
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Error en la petición");
        }

        const jsonData: T = await response.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, error, loading, fetchData };
}

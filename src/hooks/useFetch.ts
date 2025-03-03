import { useState, useCallback } from "react";
import axios, { AxiosRequestConfig } from "axios";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
}

interface FetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchData: (url: string, options?: FetchOptions) => Promise<void>;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.URL_PROD || "https://makeup-register.vercel.app"
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
        const axiosConfig: AxiosRequestConfig = {
          url: baseUrl + url,
          method: options?.method || "GET",
          headers: {
            ...(options?.headers || {}),
          },
          data:
            options?.body instanceof FormData
              ? options.body
              : JSON.stringify(options?.body),
        };

        const response = await axios(axiosConfig);
        setData(response.data);
      } catch (err: any) {
        setError(
          err.response?.data?.error || err.message || "Error desconocido"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, error, loading, fetchData };
}

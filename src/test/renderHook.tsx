import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * renderHook wrapped in a fresh QueryClient per call.
 *
 * retry:false matters: without it a hook under test that errors would sit in
 * react-query's retry backoff and the assertion would time out instead of
 * seeing the error state.
 */
export function renderHookWithQuery<T>(hook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...renderHook(hook, { wrapper }), queryClient };
}

export { waitFor };

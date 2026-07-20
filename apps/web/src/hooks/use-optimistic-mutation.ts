import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toUserMessage } from "@/lib/api-client";
import { useToastOptional } from "@/components/ui/toast";

/**
 * Platform standard for mutations that should feel instant.
 *
 * The optimistic recipe (cancel -> snapshot -> patch -> rollback -> reconcile)
 * is error-prone to hand-roll on every call site, so this hook standardizes it:
 *
 *  - `optimisticUpdate` runs in `onMutate`: cancel affected queries, snapshot
 *    current data, patch the cache, and return a rollback context.
 *  - `rollback` restores the snapshot on error.
 *  - Errors are mapped to customer-safe copy via `toUserMessage` and toasted
 *    automatically (pass `errorMessage: false` to opt out).
 *  - `reconcile` runs in `onSettled` — prefer a targeted `setQueryData` here,
 *    or a scoped invalidation, over broad cache busting.
 */
export interface OptimisticMutationConfig<TData, TVars, TContext> {
  mutationFn: (variables: TVars) => Promise<TData>;
  /** Cancel queries, snapshot, patch the cache; return a rollback context. */
  optimisticUpdate?: (queryClient: QueryClient, variables: TVars) => Promise<TContext> | TContext;
  /** Restore the snapshot returned by `optimisticUpdate`. */
  rollback?: (queryClient: QueryClient, context: TContext | undefined, variables: TVars) => void;
  /** Reconcile server truth after settle (targeted setQueryData preferred). */
  reconcile?: (queryClient: QueryClient, variables: TVars) => void;
  /** Error copy. String, deriver, or `false` to suppress the toast. */
  errorMessage?: string | ((error: unknown) => string) | false;
  onSuccess?: (data: TData, variables: TVars, context: TContext | undefined) => void;
  onError?: (error: unknown, variables: TVars, context: TContext | undefined) => void;
}

export function useOptimisticMutation<TData = unknown, TVars = void, TContext = unknown>(
  config: OptimisticMutationConfig<TData, TVars, TContext>,
) {
  const queryClient = useQueryClient();
  const toast = useToastOptional();
  const {
    mutationFn,
    optimisticUpdate,
    rollback,
    reconcile,
    errorMessage,
    onSuccess,
    onError,
  } = config;

  return useMutation<TData, unknown, TVars, TContext>({
    mutationFn,
    onMutate: optimisticUpdate
      ? (variables) => Promise.resolve(optimisticUpdate(queryClient, variables))
      : undefined,
    onError: (error, variables, context) => {
      if (rollback) rollback(queryClient, context, variables);
      if (errorMessage !== false) {
        const message =
          typeof errorMessage === "function"
            ? errorMessage(error)
            : (errorMessage ?? toUserMessage(error));
        toast.error(message);
      }
      onError?.(error, variables, context);
    },
    onSuccess: onSuccess
      ? (data, variables, context) => onSuccess(data, variables, context)
      : undefined,
    onSettled: reconcile ? (_data, _error, variables) => reconcile(queryClient, variables) : undefined,
  });
}

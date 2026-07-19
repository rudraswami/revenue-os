import type { UseMutationResult } from "@tanstack/react-query";

/** Returns the in-flight mutation variable (e.g. selected tile id) while pending. */
export function useMutationPendingId<TVariables>(
  mutation: Pick<UseMutationResult<unknown, Error, TVariables>, "isPending" | "variables">,
): TVariables | undefined {
  return mutation.isPending ? mutation.variables : undefined;
}

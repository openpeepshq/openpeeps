import type { QueryObserverResult } from "@tanstack/svelte-query";
import type { PartialQueryObserverResult } from "@openpeeps/ui";

export const mergeQueryResults = <T extends object>(
    queries: { [K in keyof T]: QueryObserverResult<T[K], unknown> }
): PartialQueryObserverResult<T> => {
    const result = [...Object.values(queries)] as QueryObserverResult<unknown, unknown>[];
    return {
        data: Object.fromEntries(Object.entries(queries).map(([key, value]) => [key, (value as QueryObserverResult<unknown, unknown>).data])) as T,
        isPending: result.some(r => r.isPending),
        isSuccess: result.every(r => r.isSuccess),
    }
}
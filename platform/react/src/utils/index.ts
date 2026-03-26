import { useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Checks if a query key matches a pattern (partial or exact).
 * Uses the same matching logic as TanStack Query's invalidateQueries, refetchQueries, etc.
 * 
 * @param queryKey - The query key to check
 * @param pattern - The pattern to match against (partial match by default)
 * @param exact - If true, requires exact match. If false, matches if queryKey starts with pattern.
 * @returns true if the query key matches the pattern
 */
export const queryKeyMatches = (
    queryKey: QueryKey,
    pattern: QueryKey,
    exact: boolean = false
): boolean => {
    if (exact) {
        // Exact match: arrays must be identical
        if (queryKey.length !== pattern.length) return false;
        return queryKey.every((key, index) => {
            const patternKey = pattern[index];
            if (typeof key === 'object' && typeof patternKey === 'object' && key !== null && patternKey !== null) {
                return JSON.stringify(key) === JSON.stringify(patternKey);
            }
            return key === patternKey;
        });
    } else {
        // Partial match: queryKey must start with pattern
        if (queryKey.length < pattern.length) return false;
        return pattern.every((patternKey, index) => {
            const key = queryKey[index];
            if (typeof key === 'object' && typeof patternKey === 'object' && key !== null && patternKey !== null) {
                return JSON.stringify(key) === JSON.stringify(patternKey);
            }
            return key === patternKey;
        });
    }
};


export const useRefetchOnInvalidate = <R, E>(query: UseQueryResult<R, E>) => {
    const { refetch } = query;
    const queryClient = useQueryClient()
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (
                queryKeyMatches(event.query.queryKey, (query as unknown as { queryKey: QueryKey }).queryKey) &&
                event.type === 'updated' &&
                event.action.type === 'invalidate'
            ) {
                refetch();
            }
        });
        return () => unsubscribe();
    }, [query]);
};
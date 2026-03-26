import { logger } from "../log";

export const logTime = <T extends (...args: any[]) => any>(fn: T, category: string): T => {
    const log = logger(`allpeep:performance:${category}`);
    return (async (...args: Parameters<T>) => {
        const start = performance.now();
        const result = await fn(...args);
        const end = performance.now();
        log.info(`${end - start}ms`);
        return result;
    }) as T;
};  
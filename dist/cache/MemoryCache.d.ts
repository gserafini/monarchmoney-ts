export declare class MemoryCache {
    private cache;
    private maxSize;
    private defaultTTL;
    constructor(maxSize?: number, defaultTTL?: number);
    set<T>(key: string, value: T, ttlMs?: number): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    private evictOldest;
    cleanup(): number;
    getStats(): {
        size: number;
        maxSize: number;
        hitRate?: number;
        memoryUsage?: number;
    };
    invalidatePattern(pattern: string | RegExp): number;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
}
//# sourceMappingURL=MemoryCache.d.ts.map
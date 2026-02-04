export declare class PersistentCache {
    private cacheIndex;
    private encryptionKey;
    private cacheDir;
    private cacheFile;
    private saveScheduled;
    constructor(encryptionKey?: string, cacheDir?: string);
    private generateOrGetKey;
    private initializeCache;
    private scheduleSave;
    set<T>(key: string, value: T, ttlMs?: number): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    cleanup(): number;
    getStats(): {
        size: number;
        totalEntries: number;
        expiredEntries: number;
    };
    invalidatePattern(pattern: string | RegExp): number;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
    close(): void;
}
//# sourceMappingURL=PersistentCache.d.ts.map
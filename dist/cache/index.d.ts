import { MemoryCache } from './MemoryCache';
import { PersistentCache } from './PersistentCache';
import { CacheConfig } from '../types';
export { MemoryCache } from './MemoryCache';
export { PersistentCache } from './PersistentCache';
export interface CacheInterface<T = unknown> {
    set(key: string, value: T, ttlMs?: number): void | Promise<void>;
    get<U extends T>(key: string): U | undefined | Promise<U | undefined>;
    has(key: string): boolean | Promise<boolean>;
    delete(key: string): boolean | Promise<boolean>;
    clear(): void | Promise<void>;
    size(): number | Promise<number>;
    keys(): string[] | Promise<string[]>;
    cleanup(): number | Promise<number>;
    invalidatePattern(pattern: string | RegExp): number | Promise<number>;
    getOrSet<U extends T>(key: string, factory: () => Promise<U>, ttlMs?: number): Promise<U>;
}
export declare class MultiLevelCache implements CacheInterface {
    private memoryCache;
    private persistentCache?;
    private config;
    constructor(config: CacheConfig, encryptionKey?: string);
    private startCleanupInterval;
    private getCacheKey;
    private getTTL;
    set<T>(key: string, value: T, ttlMs?: number): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    cleanup(): number;
    invalidatePattern(pattern: string | RegExp): number;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
    cacheOperation<T>(operation: string, params: Record<string, unknown> | undefined, factory: () => Promise<T>): Promise<T>;
    invalidateOperation(operation: string, params?: Record<string, unknown>): void;
    invalidateRelated(operation: string, data?: Record<string, unknown>): void;
    getStats(): {
        memory: ReturnType<MemoryCache['getStats']>;
        persistent?: ReturnType<PersistentCache['getStats']>;
        total: {
            size: number;
            hitRate?: number;
        };
    };
    preloadCache(operations: Array<{
        operation: string;
        params?: Record<string, unknown>;
        factory: () => Promise<unknown>;
    }>): Promise<void>;
    close(): void;
}
//# sourceMappingURL=index.d.ts.map
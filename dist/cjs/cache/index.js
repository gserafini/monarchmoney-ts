"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLevelCache = exports.PersistentCache = exports.MemoryCache = void 0;
const MemoryCache_1 = require("./MemoryCache");
const PersistentCache_1 = require("./PersistentCache");
const utils_1 = require("../utils");
var MemoryCache_2 = require("./MemoryCache");
Object.defineProperty(exports, "MemoryCache", { enumerable: true, get: function () { return MemoryCache_2.MemoryCache; } });
var PersistentCache_2 = require("./PersistentCache");
Object.defineProperty(exports, "PersistentCache", { enumerable: true, get: function () { return PersistentCache_2.PersistentCache; } });
class MultiLevelCache {
    constructor(config, encryptionKey) {
        this.config = config;
        // Initialize memory cache
        this.memoryCache = new MemoryCache_1.MemoryCache(Math.floor(config.maxMemorySize * 0.7), // Use 70% of max size for entries count estimate
        Math.min(...Object.values(config.memoryTTL)) // Use shortest TTL as default
        );
        // Initialize persistent cache if enabled
        if (config.autoInvalidate) {
            this.persistentCache = new PersistentCache_1.PersistentCache(encryptionKey);
        }
        // Start cleanup interval
        this.startCleanupInterval();
    }
    startCleanupInterval() {
        const interval = Math.min(...Object.values(this.config.memoryTTL)) / 2;
        setInterval(() => {
            this.memoryCache.cleanup();
            this.persistentCache?.cleanup();
        }, interval);
    }
    getCacheKey(operation, params) {
        if (!params)
            return operation;
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((sorted, key) => {
            sorted[key] = params[key];
            return sorted;
        }, {});
        return `${operation}:${JSON.stringify(sortedParams)}`;
    }
    getTTL(operation) {
        // Map operation types to TTL configuration
        if (operation.includes('account')) {
            return this.config.memoryTTL.accounts;
        }
        if (operation.includes('category')) {
            return this.config.memoryTTL.categories;
        }
        if (operation.includes('transaction')) {
            return this.config.memoryTTL.transactions;
        }
        if (operation.includes('budget')) {
            return this.config.memoryTTL.budgets;
        }
        return this.config.memoryTTL.transactions; // Default to shortest TTL
    }
    set(key, value, ttlMs) {
        const ttl = ttlMs || this.getTTL(key);
        // Store in memory cache
        this.memoryCache.set(key, value, ttl);
        // Store in persistent cache with longer TTL
        if (this.persistentCache) {
            const persistentTTL = ttl * 2; // Persistent cache lives longer
            this.persistentCache.set(key, value, persistentTTL);
        }
    }
    get(key) {
        // Try memory cache first
        let value = this.memoryCache.get(key);
        if (value !== undefined) {
            utils_1.logger.debug(`Multi-level cache HIT (memory): ${key}`);
            return value;
        }
        // Try persistent cache
        if (this.persistentCache) {
            value = this.persistentCache.get(key);
            if (value !== undefined) {
                // Promote to memory cache
                const ttl = this.getTTL(key);
                this.memoryCache.set(key, value, ttl);
                utils_1.logger.debug(`Multi-level cache HIT (persistent): ${key}`);
                return value;
            }
        }
        utils_1.logger.debug(`Multi-level cache MISS: ${key}`);
        return undefined;
    }
    has(key) {
        return this.memoryCache.has(key) || (this.persistentCache?.has(key) ?? false);
    }
    delete(key) {
        const memoryDeleted = this.memoryCache.delete(key);
        const persistentDeleted = this.persistentCache?.delete(key) ?? false;
        return memoryDeleted || persistentDeleted;
    }
    clear() {
        this.memoryCache.clear();
        this.persistentCache?.clear();
    }
    size() {
        return this.memoryCache.size() + (this.persistentCache?.size() ?? 0);
    }
    keys() {
        const memoryKeys = this.memoryCache.keys();
        const persistentKeys = this.persistentCache?.keys() ?? [];
        // Return unique keys
        return [...new Set([...memoryKeys, ...persistentKeys])];
    }
    cleanup() {
        const memoryCleaned = this.memoryCache.cleanup();
        const persistentCleaned = this.persistentCache?.cleanup() ?? 0;
        return memoryCleaned + persistentCleaned;
    }
    invalidatePattern(pattern) {
        const memoryInvalidated = this.memoryCache.invalidatePattern(pattern);
        const persistentInvalidated = this.persistentCache?.invalidatePattern(pattern) ?? 0;
        return memoryInvalidated + persistentInvalidated;
    }
    async getOrSet(key, factory, ttlMs) {
        // Check memory cache first
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }
        // Call factory and cache result
        const value = await factory();
        this.set(key, value, ttlMs);
        return value;
    }
    // Cache operations by operation type
    cacheOperation(operation, params, factory) {
        const key = this.getCacheKey(operation, params);
        const ttl = this.getTTL(operation);
        return this.getOrSet(key, factory, ttl);
    }
    // Invalidate cache for specific operations
    invalidateOperation(operation, params) {
        if (params) {
            const key = this.getCacheKey(operation, params);
            this.delete(key);
        }
        else {
            // Invalidate all keys starting with operation
            this.invalidatePattern(`^${operation}`);
        }
    }
    // Smart invalidation based on data changes
    invalidateRelated(operation, data) {
        const patterns = [];
        if (operation.includes('transaction') && data?.accountId) {
            patterns.push(`get_transactions.*accountIds.*${data.accountId}`);
            patterns.push(`get_account_.*${data.accountId}`);
            patterns.push('get_cashflow');
        }
        if (operation.includes('account')) {
            patterns.push('get_accounts');
            patterns.push('get_net_worth');
        }
        if (operation.includes('budget')) {
            patterns.push('get_budgets');
            patterns.push('get_cashflow');
        }
        for (const pattern of patterns) {
            this.invalidatePattern(pattern);
        }
    }
    // Get comprehensive cache statistics
    getStats() {
        const memoryStats = this.memoryCache.getStats();
        const persistentStats = this.persistentCache?.getStats();
        return {
            memory: memoryStats,
            persistent: persistentStats,
            total: {
                size: memoryStats.size + (persistentStats?.size ?? 0),
            }
        };
    }
    // Preload common data into cache
    async preloadCache(operations) {
        utils_1.logger.info(`Preloading cache with ${operations.length} operations`);
        const promises = operations.map(async ({ operation, params, factory }) => {
            try {
                await this.cacheOperation(operation, params, factory);
            }
            catch (error) {
                utils_1.logger.warn(`Failed to preload cache for ${operation}`, error);
            }
        });
        await Promise.allSettled(promises);
        utils_1.logger.info('Cache preloading completed');
    }
    close() {
        this.persistentCache?.close();
    }
}
exports.MultiLevelCache = MultiLevelCache;
//# sourceMappingURL=index.js.map
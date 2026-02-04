import { logger } from '../utils';
export class MemoryCache {
    constructor(maxSize = 100, defaultTTL = 300000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }
    set(key, value, ttlMs) {
        const ttl = ttlMs || this.defaultTTL;
        const now = Date.now();
        // If cache is full, remove oldest entry
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        const entry = {
            data: value,
            expiresAt: now + ttl,
            createdAt: now
        };
        this.cache.set(key, entry);
        logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            logger.debug(`Cache MISS: ${key}`);
            return undefined;
        }
        const now = Date.now();
        if (now > entry.expiresAt) {
            this.cache.delete(key);
            logger.debug(`Cache EXPIRED: ${key}`);
            return undefined;
        }
        logger.debug(`Cache HIT: ${key}`);
        return entry.data;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        const now = Date.now();
        if (now > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug(`Cache DELETE: ${key}`);
        }
        return deleted;
    }
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.debug(`Cache CLEAR: Removed ${size} entries`);
    }
    size() {
        return this.cache.size;
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    evictOldest() {
        let oldestKey;
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            logger.debug(`Cache EVICT: ${oldestKey}`);
        }
    }
    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug(`Cache CLEANUP: Removed ${cleaned} expired entries`);
        }
        return cleaned;
    }
    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            // Note: Hit rate tracking would require additional counters
            // Memory usage is estimated (not precise in Node.js)
        };
    }
    // Invalidate entries matching a pattern
    invalidatePattern(pattern) {
        let invalidated = 0;
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        if (invalidated > 0) {
            logger.debug(`Cache INVALIDATE_PATTERN: Removed ${invalidated} entries matching ${pattern}`);
        }
        return invalidated;
    }
    // Get or set pattern - if key doesn't exist, call factory function
    async getOrSet(key, factory, ttlMs) {
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const value = await factory();
        this.set(key, value, ttlMs);
        return value;
    }
}
//# sourceMappingURL=MemoryCache.js.map
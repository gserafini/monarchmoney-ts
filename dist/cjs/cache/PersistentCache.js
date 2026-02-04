"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistentCache = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const encryption_1 = require("../utils/encryption");
const utils_1 = require("../utils");
const errors_1 = require("../utils/errors");
class PersistentCache {
    constructor(encryptionKey, cacheDir) {
        this.cacheIndex = {};
        this.saveScheduled = false;
        this.encryptionKey = encryptionKey || this.generateOrGetKey();
        this.cacheDir = cacheDir || path.join(os.homedir(), '.mm');
        this.cacheFile = path.join(this.cacheDir, 'cache.json');
        this.initializeCache();
    }
    generateOrGetKey() {
        const keyFile = path.join(os.homedir(), '.mm', 'cache.key');
        try {
            if (fs.existsSync(keyFile)) {
                return fs.readFileSync(keyFile, 'utf8').trim();
            }
        }
        catch (error) {
            utils_1.logger.warn('Failed to read existing cache key, generating new one');
        }
        // Generate new key
        const newKey = encryption_1.EncryptionService.generateKey();
        try {
            fs.mkdirSync(path.dirname(keyFile), { recursive: true });
            fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
            utils_1.logger.info('Generated new cache encryption key');
        }
        catch (error) {
            utils_1.logger.warn('Failed to save cache key to file');
        }
        return newKey;
    }
    initializeCache() {
        try {
            fs.mkdirSync(this.cacheDir, { recursive: true });
            if (fs.existsSync(this.cacheFile)) {
                try {
                    const data = fs.readFileSync(this.cacheFile, 'utf8');
                    const decryptedData = encryption_1.EncryptionService.decrypt(data, this.encryptionKey);
                    this.cacheIndex = JSON.parse(decryptedData);
                }
                catch (error) {
                    utils_1.logger.warn('Failed to load existing cache, starting fresh');
                    this.cacheIndex = {};
                }
            }
            utils_1.logger.debug('Persistent cache initialized');
        }
        catch (error) {
            throw new errors_1.MonarchConfigError(`Failed to initialize persistent cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    scheduleSave() {
        if (this.saveScheduled)
            return;
        this.saveScheduled = true;
        setTimeout(() => {
            try {
                const data = JSON.stringify(this.cacheIndex);
                const encryptedData = encryption_1.EncryptionService.encrypt(data, this.encryptionKey);
                fs.writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 });
            }
            catch (error) {
                utils_1.logger.error('Failed to save cache to file', error);
            }
            this.saveScheduled = false;
        }, 1000); // Debounce saves by 1 second
    }
    set(key, value, ttlMs = 3600000) {
        const now = Date.now();
        const record = {
            key,
            value: encryption_1.EncryptionService.encrypt(JSON.stringify(value), this.encryptionKey),
            expires_at: now + ttlMs,
            created_at: now
        };
        this.cacheIndex[key] = record;
        this.scheduleSave();
        utils_1.logger.debug(`Persistent cache SET: ${key}`);
    }
    get(key) {
        const record = this.cacheIndex[key];
        if (!record) {
            return undefined;
        }
        const now = Date.now();
        if (now > record.expires_at) {
            delete this.cacheIndex[key];
            this.scheduleSave();
            return undefined;
        }
        try {
            const decryptedValue = encryption_1.EncryptionService.decrypt(record.value, this.encryptionKey);
            return JSON.parse(decryptedValue);
        }
        catch (error) {
            utils_1.logger.error(`Failed to decrypt cache entry: ${key}`, error);
            delete this.cacheIndex[key];
            this.scheduleSave();
            return undefined;
        }
    }
    has(key) {
        const record = this.cacheIndex[key];
        if (!record)
            return false;
        const now = Date.now();
        if (now > record.expires_at) {
            delete this.cacheIndex[key];
            this.scheduleSave();
            return false;
        }
        return true;
    }
    delete(key) {
        const existed = key in this.cacheIndex;
        delete this.cacheIndex[key];
        if (existed) {
            this.scheduleSave();
            utils_1.logger.debug(`Persistent cache DELETE: ${key}`);
        }
        return existed;
    }
    clear() {
        const count = Object.keys(this.cacheIndex).length;
        this.cacheIndex = {};
        this.scheduleSave();
        utils_1.logger.debug(`Persistent cache CLEAR: Removed ${count} entries`);
    }
    size() {
        const now = Date.now();
        let validCount = 0;
        for (const [key, record] of Object.entries(this.cacheIndex)) {
            if (now > record.expires_at) {
                delete this.cacheIndex[key];
            }
            else {
                validCount++;
            }
        }
        if (Object.keys(this.cacheIndex).length !== validCount) {
            this.scheduleSave();
        }
        return validCount;
    }
    keys() {
        const now = Date.now();
        const validKeys = [];
        for (const [key, record] of Object.entries(this.cacheIndex)) {
            if (now > record.expires_at) {
                delete this.cacheIndex[key];
            }
            else {
                validKeys.push(key);
            }
        }
        return validKeys;
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, record] of Object.entries(this.cacheIndex)) {
            if (now > record.expires_at) {
                delete this.cacheIndex[key];
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.scheduleSave();
            utils_1.logger.debug(`Persistent cache CLEANUP: Removed ${cleaned} expired entries`);
        }
        return cleaned;
    }
    getStats() {
        const now = Date.now();
        let validCount = 0;
        let expiredCount = 0;
        for (const record of Object.values(this.cacheIndex)) {
            if (now > record.expires_at) {
                expiredCount++;
            }
            else {
                validCount++;
            }
        }
        return {
            size: validCount,
            totalEntries: validCount + expiredCount,
            expiredEntries: expiredCount
        };
    }
    invalidatePattern(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        let invalidated = 0;
        for (const key of Object.keys(this.cacheIndex)) {
            if (regex.test(key)) {
                delete this.cacheIndex[key];
                invalidated++;
            }
        }
        if (invalidated > 0) {
            this.scheduleSave();
            utils_1.logger.debug(`Persistent cache INVALIDATE_PATTERN: Removed ${invalidated} entries`);
        }
        return invalidated;
    }
    async getOrSet(key, factory, ttlMs) {
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const value = await factory();
        this.set(key, value, ttlMs);
        return value;
    }
    close() {
        // Force save any pending changes
        if (this.saveScheduled) {
            try {
                const data = JSON.stringify(this.cacheIndex);
                const encryptedData = encryption_1.EncryptionService.encrypt(data, this.encryptionKey);
                fs.writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 });
            }
            catch (error) {
                utils_1.logger.error('Failed to save cache on close', error);
            }
        }
        utils_1.logger.debug('Persistent cache closed');
    }
}
exports.PersistentCache = PersistentCache;
//# sourceMappingURL=PersistentCache.js.map
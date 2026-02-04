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
exports.SessionStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const encryption_1 = require("../../utils/encryption");
const utils_1 = require("../../utils");
const errors_1 = require("../../utils/errors");
class SessionStorage {
    constructor(encryptionKey, sessionDir) {
        this.encryptionKey = encryptionKey;
        this.sessionDir = sessionDir || path.join(os.homedir(), '.mm');
        this.sessionFile = path.join(this.sessionDir, 'session.json');
        this.ensureSessionDir();
    }
    ensureSessionDir() {
        try {
            if (!fs.existsSync(this.sessionDir)) {
                fs.mkdirSync(this.sessionDir, { recursive: true, mode: 0o700 });
            }
        }
        catch (error) {
            utils_1.logger.warn('Failed to create session directory', error);
        }
    }
    saveSession(token, options = {}) {
        const sessionData = {
            token,
            userId: options.userId,
            email: options.email,
            createdAt: Date.now(),
            expiresAt: options.expiresAt,
            deviceUuid: options.deviceUuid || encryption_1.EncryptionService.generateDeviceUUID()
        };
        try {
            let data;
            if (this.encryptionKey) {
                // Encrypt session data
                data = encryption_1.EncryptionService.encrypt(JSON.stringify(sessionData), this.encryptionKey);
            }
            else {
                data = JSON.stringify(sessionData);
            }
            fs.writeFileSync(this.sessionFile, data, { mode: 0o600 });
            this.currentSession = sessionData;
            utils_1.logger.debug('Session saved successfully');
        }
        catch (error) {
            utils_1.logger.error('Failed to save session', error);
            throw new errors_1.MonarchConfigError(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    loadSession() {
        if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
            return this.currentSession;
        }
        try {
            if (!fs.existsSync(this.sessionFile)) {
                utils_1.logger.debug('No session file found');
                return null;
            }
            const data = fs.readFileSync(this.sessionFile, 'utf8');
            let sessionData;
            if (this.encryptionKey) {
                // Decrypt session data
                const decryptedData = encryption_1.EncryptionService.decrypt(data, this.encryptionKey);
                sessionData = JSON.parse(decryptedData);
            }
            else {
                sessionData = JSON.parse(data);
            }
            // Validate session structure
            if (!sessionData.token || !sessionData.createdAt) {
                utils_1.logger.warn('Invalid session data structure');
                this.deleteSession();
                return null;
            }
            // Check if session is expired
            if (this.isSessionExpired(sessionData)) {
                utils_1.logger.debug('Session expired, removing');
                this.deleteSession();
                return null;
            }
            this.currentSession = sessionData;
            utils_1.logger.debug('Session loaded successfully');
            return sessionData;
        }
        catch (error) {
            utils_1.logger.error('Failed to load session', error);
            // Remove corrupted session file
            this.deleteSession();
            return null;
        }
    }
    deleteSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
            }
            this.currentSession = undefined;
            utils_1.logger.debug('Session deleted');
        }
        catch (error) {
            utils_1.logger.error('Failed to delete session file', error);
        }
    }
    hasValidSession() {
        const session = this.loadSession();
        return session !== null && !this.isSessionExpired(session);
    }
    getSessionInfo() {
        const session = this.loadSession();
        if (!session) {
            return {
                isValid: false,
                isStale: true
            };
        }
        const isExpired = this.isSessionExpired(session);
        const isStale = this.isSessionStale(session);
        return {
            isValid: !isExpired,
            createdAt: new Date(session.createdAt).toISOString(),
            lastValidated: session.lastValidated ? new Date(session.lastValidated).toISOString() : undefined,
            isStale,
            expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : undefined,
            token: session.token,
            userId: session.userId,
            email: session.email,
            deviceUuid: session.deviceUuid
        };
    }
    updateLastValidated() {
        if (this.currentSession) {
            this.currentSession.lastValidated = Date.now();
            this.saveSession(this.currentSession.token, {
                userId: this.currentSession.userId,
                email: this.currentSession.email,
                expiresAt: this.currentSession.expiresAt,
                deviceUuid: this.currentSession.deviceUuid
            });
        }
    }
    getToken() {
        const session = this.loadSession();
        return session?.token || null;
    }
    getDeviceUuid() {
        const session = this.loadSession();
        return session?.deviceUuid || null;
    }
    getUserId() {
        const session = this.loadSession();
        return session?.userId || null;
    }
    getEmail() {
        const session = this.loadSession();
        return session?.email || null;
    }
    isSessionExpired(session) {
        if (!session.expiresAt) {
            // If no expiration date, consider session valid for 7 days
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            return Date.now() - session.createdAt > maxAge;
        }
        return Date.now() > session.expiresAt;
    }
    isSessionStale(session) {
        // Consider session stale if not validated in last hour
        const staleThreshold = 60 * 60 * 1000; // 1 hour
        const lastCheck = session.lastValidated || session.createdAt;
        return Date.now() - lastCheck > staleThreshold;
    }
    // Legacy support for pickle-like sessions (from Python library)
    loadLegacySession() {
        const legacyFile = path.join(this.sessionDir, 'mm_session.pickle');
        try {
            if (!fs.existsSync(legacyFile)) {
                return null;
            }
            // For now, we can't directly read pickle files
            // This would need a Python interop or manual conversion
            utils_1.logger.warn('Legacy pickle session found but cannot be read directly');
            return null;
        }
        catch (error) {
            utils_1.logger.error('Failed to load legacy session', error);
            return null;
        }
    }
    // Migration utility
    migrateFromLegacy() {
        // This would be used to migrate from the Python library's pickle format
        // For now, just return false to indicate no migration was performed
        return false;
    }
}
exports.SessionStorage = SessionStorage;
//# sourceMappingURL=SessionStorage.js.map
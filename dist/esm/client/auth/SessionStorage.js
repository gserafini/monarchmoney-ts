import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EncryptionService } from '../../utils/encryption';
import { logger } from '../../utils';
import { MonarchConfigError } from '../../utils/errors';
export class SessionStorage {
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
            logger.warn('Failed to create session directory', error);
        }
    }
    saveSession(token, options = {}) {
        const sessionData = {
            token,
            userId: options.userId,
            email: options.email,
            createdAt: Date.now(),
            expiresAt: options.expiresAt,
            deviceUuid: options.deviceUuid || EncryptionService.generateDeviceUUID()
        };
        try {
            let data;
            if (this.encryptionKey) {
                // Encrypt session data
                data = EncryptionService.encrypt(JSON.stringify(sessionData), this.encryptionKey);
            }
            else {
                data = JSON.stringify(sessionData);
            }
            fs.writeFileSync(this.sessionFile, data, { mode: 0o600 });
            this.currentSession = sessionData;
            logger.debug('Session saved successfully');
        }
        catch (error) {
            logger.error('Failed to save session', error);
            throw new MonarchConfigError(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    loadSession() {
        if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
            return this.currentSession;
        }
        try {
            if (!fs.existsSync(this.sessionFile)) {
                logger.debug('No session file found');
                return null;
            }
            const data = fs.readFileSync(this.sessionFile, 'utf8');
            let sessionData;
            if (this.encryptionKey) {
                // Decrypt session data
                const decryptedData = EncryptionService.decrypt(data, this.encryptionKey);
                sessionData = JSON.parse(decryptedData);
            }
            else {
                sessionData = JSON.parse(data);
            }
            // Validate session structure
            if (!sessionData.token || !sessionData.createdAt) {
                logger.warn('Invalid session data structure');
                this.deleteSession();
                return null;
            }
            // Check if session is expired
            if (this.isSessionExpired(sessionData)) {
                logger.debug('Session expired, removing');
                this.deleteSession();
                return null;
            }
            this.currentSession = sessionData;
            logger.debug('Session loaded successfully');
            return sessionData;
        }
        catch (error) {
            logger.error('Failed to load session', error);
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
            logger.debug('Session deleted');
        }
        catch (error) {
            logger.error('Failed to delete session file', error);
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
            logger.warn('Legacy pickle session found but cannot be read directly');
            return null;
        }
        catch (error) {
            logger.error('Failed to load legacy session', error);
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
//# sourceMappingURL=SessionStorage.js.map
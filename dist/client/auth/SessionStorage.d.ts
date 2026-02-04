import { SessionInfo } from '../../types';
interface SessionData {
    token: string;
    userId?: string;
    email?: string;
    createdAt: number;
    lastValidated?: number;
    expiresAt?: number;
    deviceUuid?: string;
}
export declare class SessionStorage {
    private sessionDir;
    private sessionFile;
    private encryptionKey?;
    private currentSession?;
    constructor(encryptionKey?: string, sessionDir?: string);
    private ensureSessionDir;
    saveSession(token: string, options?: {
        userId?: string;
        email?: string;
        expiresAt?: number;
        deviceUuid?: string;
    }): void;
    loadSession(): SessionData | null;
    deleteSession(): void;
    hasValidSession(): boolean;
    getSessionInfo(): SessionInfo;
    updateLastValidated(): void;
    getToken(): string | null;
    getDeviceUuid(): string | null;
    getUserId(): string | null;
    getEmail(): string | null;
    private isSessionExpired;
    private isSessionStale;
    loadLegacySession(): SessionData | null;
    migrateFromLegacy(): boolean;
}
export {};
//# sourceMappingURL=SessionStorage.d.ts.map
import { SessionStorage } from './SessionStorage';
import { SessionInfo } from '../../types';
export interface LoginOptions {
    email?: string;
    password?: string;
    useSavedSession?: boolean;
    saveSession?: boolean;
    mfaSecretKey?: string;
    interactive?: boolean;
    maxCaptchaRetries?: number;
}
export interface MFAOptions {
    email: string;
    password: string;
    code: string;
}
export declare class AuthenticationService {
    private baseUrl;
    private sessionStorage;
    private lastRequestTime;
    private readonly minRequestInterval;
    private loginInProgress;
    constructor(baseUrl?: string, sessionStorage?: SessionStorage);
    login(options?: LoginOptions): Promise<void>;
    interactiveLogin(options?: Omit<LoginOptions, 'email' | 'password'>): Promise<void>;
    multiFactorAuthenticate(options: MFAOptions): Promise<void>;
    validateSession(): Promise<boolean>;
    isSessionStale(): boolean;
    ensureValidSession(): Promise<void>;
    getSessionInfo(): SessionInfo;
    getToken(): string | null;
    getDeviceUuid(): string | null;
    saveSession(): void;
    loadSession(): boolean;
    deleteSession(): void;
    private rateLimit;
    private performLoginWithMFA;
    private performMFAAuth;
    private getUserAgent;
    private prompt;
    private promptPassword;
}
//# sourceMappingURL=AuthenticationService.d.ts.map
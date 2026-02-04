import { SessionStorage } from './SessionStorage';
import { SessionInfo } from '../../types';
export interface DirectLoginOptions {
    email: string;
    password: string;
    mfaSecretKey: string;
    saveSession?: boolean;
}
/**
 * Direct authentication service that exactly replicates the working raw approach
 * This bypasses all the complex retry/error handling to ensure authentication works
 */
export declare class DirectAuthenticationService {
    private baseUrl;
    private sessionStorage;
    constructor(baseUrl?: string, sessionStorage?: SessionStorage);
    /**
     * Direct login that exactly matches our working test
     */
    login(options: DirectLoginOptions): Promise<void>;
    getSessionInfo(): SessionInfo;
    getToken(): string | null;
    hasValidSession(): boolean;
    deleteSession(): void;
}
//# sourceMappingURL=DirectAuthenticationService.d.ts.map
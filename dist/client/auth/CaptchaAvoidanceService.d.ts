/**
 * CAPTCHA Avoidance Service
 *
 * Implements aggressive rate limiting and session management to prevent CAPTCHA triggers
 */
export declare class CaptchaAvoidanceService {
    private static instance;
    private lastAuthTime;
    private authAttempts;
    private backoffMultiplier;
    private maxAuthAttemptsPerHour;
    private authTimeWindow;
    private recentAuthAttempts;
    private constructor();
    static getInstance(): CaptchaAvoidanceService;
    /**
     * Check if we should allow an authentication attempt
     */
    canAuthenticate(): boolean;
    /**
     * Record an authentication attempt
     */
    recordAuthAttempt(): void;
    /**
     * Record a CAPTCHA encounter - increase backoff significantly
     */
    recordCaptchaEncounter(): void;
    /**
     * Record successful authentication - reduce backoff
     */
    recordSuccessfulAuth(): void;
    /**
     * Get minimum time between authentication attempts (with backoff)
     */
    private getMinTimeBetweenAuth;
    /**
     * Get current status for debugging
     */
    getStatus(): {
        lastAuthTime: number;
        timeSinceLastAuth: number;
        minTimeBetweenAuth: number;
        recentAttempts: number;
        backoffMultiplier: number;
        canAuthenticate: boolean;
    };
    /**
     * Reset the service (for testing purposes)
     */
    reset(): void;
}
//# sourceMappingURL=CaptchaAvoidanceService.d.ts.map
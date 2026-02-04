/**
 * CAPTCHA Avoidance Service
 *
 * Implements aggressive rate limiting and session management to prevent CAPTCHA triggers
 */
export class CaptchaAvoidanceService {
    constructor() {
        this.lastAuthTime = 0;
        this.authAttempts = 0;
        this.backoffMultiplier = 1;
        // private readonly sessionCacheTime: number = 30 * 60 * 1000 // 30 minutes
        this.maxAuthAttemptsPerHour = 3;
        this.authTimeWindow = 60 * 60 * 1000; // 1 hour
        // Track authentication attempts in the last hour
        this.recentAuthAttempts = [];
    }
    static getInstance() {
        if (!CaptchaAvoidanceService.instance) {
            CaptchaAvoidanceService.instance = new CaptchaAvoidanceService();
        }
        return CaptchaAvoidanceService.instance;
    }
    /**
     * Check if we should allow an authentication attempt
     */
    canAuthenticate() {
        const now = Date.now();
        // Clean old attempts (older than 1 hour)
        this.recentAuthAttempts = this.recentAuthAttempts.filter(time => now - time < this.authTimeWindow);
        // Check if we've exceeded max attempts per hour
        if (this.recentAuthAttempts.length >= this.maxAuthAttemptsPerHour) {
            const oldestAttempt = Math.min(...this.recentAuthAttempts);
            const timeUntilAllowed = this.authTimeWindow - (now - oldestAttempt);
            throw new Error(`Too many authentication attempts. Please wait ${Math.ceil(timeUntilAllowed / 1000 / 60)} minutes before trying again.`);
        }
        // Check minimum time between attempts
        const minTimeBetweenAuth = this.getMinTimeBetweenAuth();
        const timeSinceLastAuth = now - this.lastAuthTime;
        if (timeSinceLastAuth < minTimeBetweenAuth) {
            const waitTime = minTimeBetweenAuth - timeSinceLastAuth;
            throw new Error(`Rate limit protection: Please wait ${Math.ceil(waitTime / 1000)} seconds before authentication.`);
        }
        return true;
    }
    /**
     * Record an authentication attempt
     */
    recordAuthAttempt() {
        const now = Date.now();
        this.lastAuthTime = now;
        this.recentAuthAttempts.push(now);
        this.authAttempts++;
    }
    /**
     * Record a CAPTCHA encounter - increase backoff significantly
     */
    recordCaptchaEncounter() {
        this.backoffMultiplier = Math.min(this.backoffMultiplier * 3, 10); // Max 10x multiplier
        console.warn(`🚫 CAPTCHA encountered. Increasing rate limit backoff to ${this.backoffMultiplier}x`);
    }
    /**
     * Record successful authentication - reduce backoff
     */
    recordSuccessfulAuth() {
        this.backoffMultiplier = Math.max(this.backoffMultiplier * 0.8, 1); // Slowly reduce
        console.log(`✅ Successful auth. Backoff multiplier now ${this.backoffMultiplier.toFixed(1)}x`);
    }
    /**
     * Get minimum time between authentication attempts (with backoff)
     */
    getMinTimeBetweenAuth() {
        const baseDelay = 5 * 60 * 1000; // 5 minutes base
        return baseDelay * this.backoffMultiplier;
    }
    /**
     * Get current status for debugging
     */
    getStatus() {
        const now = Date.now();
        const timeSinceLastAuth = now - this.lastAuthTime;
        const minTimeBetweenAuth = this.getMinTimeBetweenAuth();
        return {
            lastAuthTime: this.lastAuthTime,
            timeSinceLastAuth,
            minTimeBetweenAuth,
            recentAttempts: this.recentAuthAttempts.length,
            backoffMultiplier: this.backoffMultiplier,
            canAuthenticate: timeSinceLastAuth >= minTimeBetweenAuth && this.recentAuthAttempts.length < this.maxAuthAttemptsPerHour
        };
    }
    /**
     * Reset the service (for testing purposes)
     */
    reset() {
        this.lastAuthTime = 0;
        this.authAttempts = 0;
        this.backoffMultiplier = 1;
        this.recentAuthAttempts = [];
    }
}
CaptchaAvoidanceService.instance = null;
//# sourceMappingURL=CaptchaAvoidanceService.js.map
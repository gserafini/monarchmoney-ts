export declare class CaptchaHandler {
    /**
     * Handle CAPTCHA requirement by guiding user to web login
     */
    static handleCaptchaRequired(isInteractive?: boolean): Promise<void>;
    /**
     * Wait for user to confirm they've completed web login
     */
    private static waitForUserConfirmation;
    /**
     * Check if we should retry after CAPTCHA
     */
    static shouldRetryAfterCaptcha(retryCount: number, maxRetries?: number): boolean;
    /**
     * Get retry delay after CAPTCHA (exponential backoff)
     */
    static getCaptchaRetryDelay(retryCount: number): number;
}
//# sourceMappingURL=CaptchaHandler.d.ts.map
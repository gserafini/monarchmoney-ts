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
exports.CaptchaHandler = void 0;
const readline = __importStar(require("readline"));
class CaptchaHandler {
    /**
     * Handle CAPTCHA requirement by guiding user to web login
     */
    static async handleCaptchaRequired(isInteractive = true) {
        const message = `
🚫 CAPTCHA verification is required to proceed.

MonarchMoney has temporarily blocked API access and requires web browser verification.

To resolve this:
1. Open your web browser
2. Go to: https://app.monarch.com/login
3. Log in with your credentials
4. Complete any CAPTCHA challenges shown
5. Once logged in successfully, you can return to use this library

This security measure will automatically clear after successful web login.
`;
        console.log(message);
        if (isInteractive) {
            return this.waitForUserConfirmation();
        }
        else {
            throw new Error('CAPTCHA verification required - please login via web browser first');
        }
    }
    /**
     * Wait for user to confirm they've completed web login
     */
    static async waitForUserConfirmation() {
        // CRITICAL: Check if stdin is a TTY to prevent hanging in non-interactive environments
        if (!process.stdin.isTTY) {
            throw new Error('CAPTCHA verification required but stdin is not a TTY. Cannot prompt for user input in non-interactive environment. Please login via web browser first.');
        }
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            const ask = () => {
                rl.question('\nHave you completed the web login? (y/n/skip): ', (answer) => {
                    const response = answer.toLowerCase().trim();
                    if (response === 'y' || response === 'yes') {
                        console.log('✅ Great! Attempting to continue with API login...');
                        rl.close();
                        resolve();
                    }
                    else if (response === 'skip' || response === 's') {
                        console.log('⏭️ Skipping CAPTCHA resolution - this may fail');
                        rl.close();
                        resolve();
                    }
                    else if (response === 'n' || response === 'no') {
                        console.log('⏳ Waiting for web login completion...');
                        setTimeout(ask, 2000);
                    }
                    else {
                        console.log('Please answer with y/yes, n/no, or skip');
                        ask();
                    }
                });
            };
            ask();
        });
    }
    /**
     * Check if we should retry after CAPTCHA
     */
    static shouldRetryAfterCaptcha(retryCount, maxRetries = 3) {
        return retryCount < maxRetries;
    }
    /**
     * Get retry delay after CAPTCHA (exponential backoff)
     */
    static getCaptchaRetryDelay(retryCount) {
        return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
    }
}
exports.CaptchaHandler = CaptchaHandler;
//# sourceMappingURL=CaptchaHandler.js.map
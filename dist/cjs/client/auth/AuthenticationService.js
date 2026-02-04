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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const readline = __importStar(require("readline"));
const totp = __importStar(require("otplib"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const SessionStorage_1 = require("./SessionStorage");
const CaptchaHandler_1 = require("./CaptchaHandler");
const utils_1 = require("../../utils");
class AuthenticationService {
    constructor(baseUrl = 'https://api.monarch.com', sessionStorage) {
        this.lastRequestTime = 0;
        this.minRequestInterval = 300; // 300ms for more human-like auth requests
        this.loginInProgress = false;
        this.baseUrl = baseUrl;
        this.sessionStorage = sessionStorage || new SessionStorage_1.SessionStorage();
    }
    async login(options = {}) {
        // Prevent concurrent login attempts
        if (this.loginInProgress) {
            utils_1.logger.debug('Login already in progress, waiting...');
            // Wait for any existing login to complete
            while (this.loginInProgress) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return;
        }
        const { email, password, useSavedSession = true, saveSession = true, mfaSecretKey, interactive = true, maxCaptchaRetries = 3 } = options;
        // Try to use saved session first
        if (useSavedSession && this.sessionStorage.hasValidSession()) {
            utils_1.logger.info('Using saved session');
            return;
        }
        // Validate credentials
        if (!email || !password) {
            throw new utils_1.MonarchAuthError('Email and password are required for login');
        }
        (0, utils_1.validateLoginCredentials)(email, password);
        // Mark login as in progress
        this.loginInProgress = true;
        try {
            // Attempt login with CAPTCHA handling
            let captchaRetryCount = 0;
            let lastError = null;
            while (captchaRetryCount <= maxCaptchaRetries) {
                try {
                    // Attempt login with immediate MFA handling (like Python library)
                    const result = await (0, utils_1.retryWithBackoff)(async () => {
                        return this.performLoginWithMFA(email, password, mfaSecretKey);
                    });
                    if (result.token) {
                        // Login successful, save session
                        if (saveSession) {
                            this.sessionStorage.saveSession(result.token, {
                                email,
                                userId: result.userId,
                                expiresAt: result.expiresAt,
                                deviceUuid: result.deviceUuid
                            });
                        }
                        utils_1.logger.info('Login successful');
                        return;
                    }
                    else {
                        throw new utils_1.MonarchMFARequiredError('Multi-factor authentication required but no MFA secret provided');
                    }
                }
                catch (error) {
                    if (error instanceof utils_1.MonarchCaptchaRequiredError) {
                        captchaRetryCount++;
                        lastError = error;
                        if (captchaRetryCount > maxCaptchaRetries) {
                            utils_1.logger.error(`CAPTCHA retries exhausted after ${maxCaptchaRetries} attempts`);
                            throw error;
                        }
                        utils_1.logger.warn(`CAPTCHA required (attempt ${captchaRetryCount}/${maxCaptchaRetries})`);
                        try {
                            await CaptchaHandler_1.CaptchaHandler.handleCaptchaRequired(interactive);
                            // Wait before retrying
                            const delay = CaptchaHandler_1.CaptchaHandler.getCaptchaRetryDelay(captchaRetryCount);
                            utils_1.logger.info(`Waiting ${delay}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            // Continue to next attempt
                            continue;
                        }
                        catch (captchaError) {
                            // User declined to handle CAPTCHA or non-interactive mode
                            throw captchaError;
                        }
                    }
                    else {
                        // Non-CAPTCHA error, throw immediately
                        utils_1.logger.error('Login failed', error);
                        throw error;
                    }
                }
            }
            // If we get here, all retries failed
            throw lastError || new utils_1.MonarchAuthError('Login failed after retries');
        }
        catch (error) {
            if (!(error instanceof utils_1.MonarchCaptchaRequiredError)) {
                utils_1.logger.error('Login failed', error);
            }
            throw error;
        }
        finally {
            // Always clear the login progress flag
            this.loginInProgress = false;
        }
    }
    async interactiveLogin(options = {}) {
        const { useSavedSession = true, saveSession = true, mfaSecretKey } = options;
        // Try saved session first
        if (useSavedSession && this.sessionStorage.hasValidSession()) {
            utils_1.logger.info('Using saved session');
            return;
        }
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        try {
            const email = await this.prompt(rl, 'Email: ');
            const password = await this.promptPassword(rl, 'Password: ');
            try {
                await this.login({ email, password, useSavedSession: false, saveSession, mfaSecretKey });
            }
            catch (error) {
                if (error instanceof utils_1.MonarchMFARequiredError) {
                    const mfaCode = await this.prompt(rl, 'MFA Code: ');
                    await this.multiFactorAuthenticate({ email, password, code: mfaCode });
                    if (saveSession) {
                        // Session should already be saved by multiFactorAuthenticate
                        utils_1.logger.info('Interactive login successful with MFA');
                    }
                }
                else {
                    throw error;
                }
            }
        }
        finally {
            rl.close();
        }
    }
    async multiFactorAuthenticate(options) {
        const { email, password, code } = options;
        (0, utils_1.validateMFACredentials)(email, password, code);
        try {
            const result = await (0, utils_1.retryWithBackoff)(async () => {
                return this.performMFAAuth(email, password, code);
            });
            if (result.token) {
                this.sessionStorage.saveSession(result.token, {
                    email,
                    userId: result.userId,
                    expiresAt: result.expiresAt,
                    deviceUuid: result.deviceUuid
                });
                utils_1.logger.info('MFA authentication successful');
            }
        }
        catch (error) {
            utils_1.logger.error('MFA authentication failed', error);
            throw error;
        }
    }
    async validateSession() {
        const token = this.sessionStorage.getToken();
        if (!token) {
            utils_1.logger.debug('No session token found');
            return false;
        }
        try {
            // Apply rate limiting before request
            await this.rateLimit();
            // Make a lightweight API call to validate session
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`,
                    'User-Agent': this.getUserAgent(),
                    'Origin': 'https://app.monarch.com'
                },
                body: JSON.stringify({
                    query: 'query { me { id email } }'
                })
            });
            if (response.status === 401 || response.status === 403) {
                utils_1.logger.debug('Session validation failed - unauthorized');
                this.sessionStorage.deleteSession();
                return false;
            }
            (0, utils_1.handleHTTPResponse)(response);
            const data = await response.json();
            if (data.errors) {
                utils_1.logger.debug('Session validation failed - GraphQL errors');
                return false;
            }
            // Update last validated timestamp
            this.sessionStorage.updateLastValidated();
            utils_1.logger.debug('Session validation successful');
            return true;
        }
        catch (error) {
            utils_1.logger.warn('Session validation failed', error);
            return false;
        }
    }
    isSessionStale() {
        const sessionInfo = this.sessionStorage.getSessionInfo();
        return sessionInfo.isStale;
    }
    async ensureValidSession() {
        if (!this.sessionStorage.hasValidSession()) {
            throw new utils_1.MonarchSessionExpiredError('No valid session available');
        }
        if (this.isSessionStale()) {
            const isValid = await this.validateSession();
            if (!isValid) {
                throw new utils_1.MonarchSessionExpiredError('Session validation failed');
            }
        }
    }
    getSessionInfo() {
        return this.sessionStorage.getSessionInfo();
    }
    getToken() {
        return this.sessionStorage.getToken();
    }
    getDeviceUuid() {
        return this.sessionStorage.getDeviceUuid();
    }
    saveSession() {
        const token = this.sessionStorage.getToken();
        if (!token) {
            throw new utils_1.MonarchAuthError('No active session to save');
        }
        utils_1.logger.info('Session already saved');
    }
    loadSession() {
        return this.sessionStorage.hasValidSession();
    }
    deleteSession() {
        this.sessionStorage.deleteSession();
        utils_1.logger.info('Session deleted');
    }
    // Rate limiting helper method
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const sleepTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
        this.lastRequestTime = Date.now();
    }
    // New method that sends MFA code in FIRST request like Python library
    async performLoginWithMFA(email, password, mfaSecretKey) {
        // Generate fresh UUID for each request like Python library
        const deviceUuid = utils_1.EncryptionService.generateDeviceUUID();
        // Prepare login data
        const loginData = {
            username: email,
            password,
            trusted_device: true,
            supports_mfa: true,
            supports_email_otp: true,
            supports_recaptcha: true
        };
        // CRITICAL: Add MFA code to FIRST request like Python library
        if (mfaSecretKey) {
            const code = totp.authenticator.generate(mfaSecretKey);
            utils_1.logger.debug('Adding MFA code to initial login request like Python');
            // Use totp field for TOTP codes (like DirectAuthenticationService)
            loginData.totp = code;
        }
        // Apply rate limiting before request
        await this.rateLimit();
        // Single request with MFA code (like Python library)
        const response = await (0, node_fetch_1.default)(`${this.baseUrl}/auth/login/`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-Platform': 'web',
                'Content-Type': 'application/json',
                'User-Agent': this.getUserAgent(),
                'device-uuid': deviceUuid,
                'Origin': 'https://app.monarch.com',
                'x-cio-client-platform': 'web',
                'x-cio-site-id': '2598be4aa410159198b2',
                'x-gist-user-anonymous': 'false'
            },
            body: JSON.stringify(loginData)
        });
        // Debug: Log full request details
        utils_1.logger.debug('Request details:', {
            url: `${this.baseUrl}/auth/login/`,
            headers: Object.fromEntries(Object.entries({
                'Accept': 'application/json',
                'Client-Platform': 'web',
                'Content-Type': 'application/json',
                'User-Agent': this.getUserAgent(),
                'device-uuid': deviceUuid,
                'Origin': 'https://app.monarch.com',
                'x-cio-client-platform': 'web',
                'x-cio-site-id': '2598be4aa410159198b2',
                'x-gist-user-anonymous': 'false'
            })),
            body: loginData
        });
        utils_1.logger.debug(`Authentication response status: ${response.status} ${response.statusText}`);
        // Get response text once to avoid consuming the stream multiple times
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch (e) {
            // If we can't parse the response as JSON, handle as generic HTTP error
            utils_1.logger.error('Failed to parse login response as JSON:', responseText);
            (0, utils_1.handleHTTPResponse)(response);
            return { token: undefined };
        }
        // Check for specific error responses first
        if (response.status >= 400) {
            // Handle specific error responses
            if (data.error_code === 'CAPTCHA_REQUIRED' || data.detail?.includes('CAPTCHA')) {
                throw new utils_1.MonarchCaptchaRequiredError('CAPTCHA verification required. Please log in through the web interface first to clear this requirement.');
            }
            // Handle "Shall Not Pass" IP blocking
            if (data.You === 'Shall Not Pass' || data.detail?.includes('Shall Not Pass') ||
                response.headers.get('you') === 'Shall Not Pass') {
                throw new utils_1.MonarchIPBlockedError('Your IP address has been temporarily blocked. Please wait some time before trying again, or try from a different network/IP address.');
            }
            // Handle 403 MFA requirement (only if no MFA secret was provided)
            if (response.status === 403 && !mfaSecretKey) {
                throw new utils_1.MonarchMFARequiredError('Multi-factor authentication required');
            }
            // Fall back to generic HTTP error handling
            (0, utils_1.handleHTTPResponse)(response);
        }
        // Success case - parse the data as login response
        const loginResponse = data;
        if (!loginResponse.token) {
            throw new utils_1.MonarchAuthError('Login failed - no token received');
        }
        return {
            token: loginResponse.token,
            userId: loginResponse.id || loginResponse.user?.id,
            expiresAt: loginResponse.expires_at ? new Date(loginResponse.expires_at).getTime() : undefined,
            deviceUuid
        };
    }
    async performMFAAuth(email, password, code) {
        const deviceUuid = this.sessionStorage.getDeviceUuid() || utils_1.EncryptionService.generateDeviceUUID();
        // Apply rate limiting before request
        await this.rateLimit();
        const response = await (0, node_fetch_1.default)(`${this.baseUrl}/auth/login/`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-Platform': 'web', // Fixed: match Python case exactly
                'Content-Type': 'application/json',
                'User-Agent': this.getUserAgent(),
                'device-uuid': deviceUuid,
                'Origin': 'https://app.monarch.com',
                'x-cio-client-platform': 'web',
                'x-cio-site-id': '2598be4aa410159198b2',
                'x-gist-user-anonymous': 'false'
            },
            body: JSON.stringify({
                username: email,
                password,
                trusted_device: true,
                supports_mfa: true,
                supports_email_otp: true,
                supports_recaptcha: true,
                totp: code
            })
        });
        // Get response text once to avoid consuming the stream multiple times
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch (e) {
            // If we can't parse the response as JSON, handle as generic HTTP error
            utils_1.logger.error('Failed to parse MFA response as JSON:', responseText);
            (0, utils_1.handleHTTPResponse)(response);
            throw new utils_1.MonarchAuthError('MFA authentication failed');
        }
        // Check for specific error responses first
        if (response.status >= 400) {
            // Handle CAPTCHA requirement specifically
            if (data.error_code === 'CAPTCHA_REQUIRED' || data.detail?.includes('CAPTCHA')) {
                throw new utils_1.MonarchCaptchaRequiredError('CAPTCHA verification required. Please log in through the web interface first to clear this requirement.');
            }
            // Handle "Shall Not Pass" IP blocking
            if (data.You === 'Shall Not Pass' || data.detail?.includes('Shall Not Pass') ||
                response.headers.get('you') === 'Shall Not Pass') {
                throw new utils_1.MonarchIPBlockedError('Your IP address has been temporarily blocked. Please wait some time before trying again, or try from a different network/IP address.');
            }
            // Handle 403 MFA requirement
            if (response.status === 403) {
                throw new utils_1.MonarchMFARequiredError('Multi-factor authentication required or invalid MFA code');
            }
            // Fall back to generic HTTP error handling
            (0, utils_1.handleHTTPResponse)(response);
        }
        // Success case - parse the data as MFA response
        const mfaResponse = data;
        if (!mfaResponse.token) {
            throw new utils_1.MonarchAuthError('MFA authentication failed - no token received');
        }
        return {
            token: mfaResponse.token,
            userId: mfaResponse.id || mfaResponse.user?.id,
            expiresAt: mfaResponse.expires_at ? new Date(mfaResponse.expires_at).getTime() : undefined,
            deviceUuid
        };
    }
    getUserAgent() {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
    }
    prompt(rl, question) {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    }
    promptPassword(_rl, question) {
        return new Promise(resolve => {
            process.stdout.write(question);
            // Hide input
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            stdin.setEncoding('utf8');
            let password = '';
            const onData = (char) => {
                if (char === '\n' || char === '\r' || char === '\u0004') {
                    // Enter or Ctrl+D
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', onData);
                    console.log();
                    resolve(password);
                }
                else if (char === '\u0003') {
                    // Ctrl+C
                    stdin.setRawMode(false);
                    stdin.pause();
                    process.exit(1);
                }
                else if (char === '\u007f' || char === '\b') {
                    // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                }
                else {
                    password += char;
                    process.stdout.write('*');
                }
            };
            stdin.on('data', onData);
        });
    }
}
exports.AuthenticationService = AuthenticationService;
//# sourceMappingURL=AuthenticationService.js.map
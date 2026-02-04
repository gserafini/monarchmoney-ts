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
exports.DirectAuthenticationService = void 0;
const totp = __importStar(require("otplib"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const SessionStorage_1 = require("./SessionStorage");
// import { CaptchaAvoidanceService } from './CaptchaAvoidanceService'
const utils_1 = require("../../utils");
/**
 * Direct authentication service that exactly replicates the working raw approach
 * This bypasses all the complex retry/error handling to ensure authentication works
 */
class DirectAuthenticationService {
    constructor(baseUrl = 'https://api.monarch.com', sessionStorage) {
        this.baseUrl = baseUrl;
        this.sessionStorage = sessionStorage || new SessionStorage_1.SessionStorage();
    }
    /**
     * Direct login that exactly matches our working test
     */
    async login(options) {
        const { email, password, mfaSecretKey, saveSession = true } = options;
        // Generate device UUID
        const deviceUuid = utils_1.EncryptionService.generateDeviceUUID();
        // Generate TOTP code
        const mfaCode = totp.authenticator.generate(mfaSecretKey);
        utils_1.logger.debug('Generated TOTP code for direct login');
        // Prepare login data (exactly as working test)
        const loginData = {
            username: email,
            password,
            trusted_device: true,
            supports_mfa: true,
            supports_email_otp: true,
            supports_recaptcha: true,
            totp: mfaCode
        };
        // Prepare headers (exactly as working test)
        const headers = {
            'Accept': 'application/json',
            'Client-Platform': 'web',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'device-uuid': deviceUuid,
            'Origin': 'https://app.monarch.com',
            'x-cio-client-platform': 'web',
            'x-cio-site-id': '2598be4aa410159198b2',
            'x-gist-user-anonymous': 'false'
        };
        utils_1.logger.debug('Making direct authentication request...');
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/auth/login/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(loginData)
            });
            utils_1.logger.debug(`Direct auth response: ${response.status} ${response.statusText}`);
            if (response.status === 200) {
                const data = await response.json();
                utils_1.logger.debug('Direct authentication successful');
                if (!data.token) {
                    throw new utils_1.MonarchAuthError('Login successful but no token received');
                }
                // Save session
                if (saveSession) {
                    this.sessionStorage.saveSession(data.token, {
                        email,
                        userId: data.id,
                        expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
                        deviceUuid
                    });
                }
                utils_1.logger.info('Direct login successful');
                return;
            }
            else {
                // Handle error response
                const errorText = await response.text();
                utils_1.logger.error(`Direct auth failed: ${response.status} ${response.statusText}`);
                utils_1.logger.error('Error response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                }
                catch (e) {
                    throw new utils_1.MonarchAuthError(`Authentication failed: ${response.status} ${response.statusText}`);
                }
                // Handle specific errors
                if (errorData.You === 'Shall Not Pass') {
                    throw new utils_1.MonarchAuthError('IP address temporarily blocked. Please wait or try from different network.');
                }
                if (errorData.error_code === 'CAPTCHA_REQUIRED') {
                    throw new utils_1.MonarchAuthError('CAPTCHA required. Please login via web browser first.');
                }
                throw new utils_1.MonarchAuthError(`Authentication failed: ${errorData.detail || response.statusText}`);
            }
        }
        catch (error) {
            if (error instanceof utils_1.MonarchAuthError) {
                throw error;
            }
            utils_1.logger.error('Direct authentication network error:', error);
            throw new utils_1.MonarchAuthError(`Network error during authentication: ${error.message}`);
        }
    }
    getSessionInfo() {
        return this.sessionStorage.getSessionInfo();
    }
    getToken() {
        return this.sessionStorage.getToken();
    }
    hasValidSession() {
        return this.sessionStorage.hasValidSession();
    }
    deleteSession() {
        this.sessionStorage.deleteSession();
    }
}
exports.DirectAuthenticationService = DirectAuthenticationService;
//# sourceMappingURL=DirectAuthenticationService.js.map
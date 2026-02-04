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
exports.EncryptionService = void 0;
const CryptoJS = __importStar(require("crypto-js"));
const crypto = __importStar(require("crypto"));
const errors_1 = require("./errors");
class EncryptionService {
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    static encrypt(data, key) {
        try {
            if (!key) {
                throw new errors_1.MonarchConfigError('Encryption key is required');
            }
            // Use crypto-js for simpler encryption
            const encrypted = CryptoJS.AES.encrypt(data, key).toString();
            return encrypted;
        }
        catch (error) {
            throw new errors_1.MonarchConfigError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static decrypt(encryptedData, key) {
        try {
            if (!key || !encryptedData) {
                throw new errors_1.MonarchConfigError('Both encrypted data and key are required');
            }
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            if (!plaintext) {
                throw new errors_1.MonarchConfigError('Decryption failed - invalid key or corrupted data');
            }
            return plaintext;
        }
        catch (error) {
            throw new errors_1.MonarchConfigError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static generateDeviceUUID() {
        return crypto.randomUUID();
    }
    static hashPassword(password, salt) {
        const saltToUse = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, saltToUse, 100000, 64, 'sha512');
        return saltToUse + ':' + hash.toString('hex');
    }
    static verifyPassword(password, hashedPassword) {
        const [salt, hash] = hashedPassword.split(':');
        const hashedInput = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === hashedInput;
    }
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
}
exports.EncryptionService = EncryptionService;
//# sourceMappingURL=encryption.js.map
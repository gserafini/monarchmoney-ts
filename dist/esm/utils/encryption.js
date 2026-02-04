import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';
import { MonarchConfigError } from './errors';
export class EncryptionService {
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    static encrypt(data, key) {
        try {
            if (!key) {
                throw new MonarchConfigError('Encryption key is required');
            }
            // Use crypto-js for simpler encryption
            const encrypted = CryptoJS.AES.encrypt(data, key).toString();
            return encrypted;
        }
        catch (error) {
            throw new MonarchConfigError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static decrypt(encryptedData, key) {
        try {
            if (!key || !encryptedData) {
                throw new MonarchConfigError('Both encrypted data and key are required');
            }
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            if (!plaintext) {
                throw new MonarchConfigError('Decryption failed - invalid key or corrupted data');
            }
            return plaintext;
        }
        catch (error) {
            throw new MonarchConfigError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
//# sourceMappingURL=encryption.js.map
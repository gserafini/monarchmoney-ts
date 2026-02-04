export declare class EncryptionService {
    static generateKey(): string;
    static encrypt(data: string, key: string): string;
    static decrypt(encryptedData: string, key: string): string;
    static generateDeviceUUID(): string;
    static hashPassword(password: string, salt?: string): string;
    static verifyPassword(password: string, hashedPassword: string): boolean;
    static generateSecureToken(length?: number): string;
}
//# sourceMappingURL=encryption.d.ts.map
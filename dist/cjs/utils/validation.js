"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequired = validateRequired;
exports.validateEmail = validateEmail;
exports.validatePassword = validatePassword;
exports.validateMFA = validateMFA;
exports.validateLoginCredentials = validateLoginCredentials;
exports.validateMFACredentials = validateMFACredentials;
exports.validateAccountId = validateAccountId;
exports.validateTransactionId = validateTransactionId;
exports.validateAmount = validateAmount;
exports.validateDate = validateDate;
exports.validateDateRange = validateDateRange;
exports.validateLimit = validateLimit;
exports.validateOffset = validateOffset;
exports.validatePagination = validatePagination;
exports.validateArrayIds = validateArrayIds;
exports.validateTicker = validateTicker;
exports.validateQuantity = validateQuantity;
exports.validateMerchantName = validateMerchantName;
exports.validateCategoryName = validateCategoryName;
exports.validateGoalName = validateGoalName;
exports.validateTargetAmount = validateTargetAmount;
exports.isValidUUID = isValidUUID;
exports.sanitizeString = sanitizeString;
exports.parseAmount = parseAmount;
exports.formatDate = formatDate;
exports.parseDate = parseDate;
const errors_1 = require("./errors");
function validateRequired(params) {
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') {
            throw new errors_1.MonarchValidationError(`${key} is required`, key);
        }
    }
}
function validateEmail(email) {
    if (!email) {
        throw new errors_1.MonarchValidationError('Email is required', 'email');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new errors_1.MonarchValidationError('Invalid email format', 'email');
    }
}
function validatePassword(password) {
    if (!password) {
        throw new errors_1.MonarchValidationError('Password is required', 'password');
    }
    if (password.length < 6) {
        throw new errors_1.MonarchValidationError('Password must be at least 6 characters', 'password');
    }
}
function validateMFA(code) {
    if (!code) {
        throw new errors_1.MonarchValidationError('MFA code is required', 'mfa_code');
    }
    // Remove spaces and validate format
    const cleanCode = code.replace(/\s/g, '');
    // Email OTP: 6 digits
    // TOTP: 6 digits
    // Backup codes: variable length
    if (!/^\d{6,8}$/.test(cleanCode) && cleanCode.length < 6) {
        throw new errors_1.MonarchValidationError('Invalid MFA code format', 'mfa_code');
    }
}
function validateLoginCredentials(email, password) {
    validateEmail(email);
    validatePassword(password);
}
function validateMFACredentials(email, password, code) {
    validateLoginCredentials(email, password);
    validateMFA(code);
}
function validateAccountId(accountId) {
    if (!accountId || typeof accountId !== 'string') {
        throw new errors_1.MonarchValidationError('Valid account ID is required', 'accountId');
    }
}
function validateTransactionId(transactionId) {
    if (!transactionId || typeof transactionId !== 'string') {
        throw new errors_1.MonarchValidationError('Valid transaction ID is required', 'transactionId');
    }
}
function validateAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new errors_1.MonarchValidationError('Valid amount is required', 'amount');
    }
}
function validateDate(date) {
    if (!date) {
        throw new errors_1.MonarchValidationError('Date is required', 'date');
    }
    // Validate ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        throw new errors_1.MonarchValidationError('Date must be in YYYY-MM-DD format', 'date');
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new errors_1.MonarchValidationError('Invalid date', 'date');
    }
}
function validateDateRange(startDate, endDate) {
    if (startDate) {
        validateDate(startDate);
    }
    if (endDate) {
        validateDate(endDate);
    }
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            throw new errors_1.MonarchValidationError('Start date must be before end date', 'dateRange');
        }
    }
}
function validateLimit(limit) {
    if (limit !== undefined) {
        if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
            throw new errors_1.MonarchValidationError('Limit must be between 1 and 1000', 'limit');
        }
    }
}
function validateOffset(offset) {
    if (offset !== undefined) {
        if (typeof offset !== 'number' || offset < 0) {
            throw new errors_1.MonarchValidationError('Offset must be non-negative', 'offset');
        }
    }
}
function validatePagination(limit, offset) {
    validateLimit(limit);
    validateOffset(offset);
}
function validateArrayIds(ids, fieldName = 'ids') {
    if (ids !== undefined) {
        if (!Array.isArray(ids)) {
            throw new errors_1.MonarchValidationError(`${fieldName} must be an array`, fieldName);
        }
        if (ids.some(id => typeof id !== 'string' || !id)) {
            throw new errors_1.MonarchValidationError(`All ${fieldName} must be non-empty strings`, fieldName);
        }
    }
}
function validateTicker(ticker) {
    if (!ticker || typeof ticker !== 'string') {
        throw new errors_1.MonarchValidationError('Valid ticker symbol is required', 'ticker');
    }
    // Basic ticker validation (1-5 uppercase letters)
    const tickerRegex = /^[A-Z]{1,5}$/;
    if (!tickerRegex.test(ticker.toUpperCase())) {
        throw new errors_1.MonarchValidationError('Invalid ticker symbol format', 'ticker');
    }
}
function validateQuantity(quantity) {
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
        throw new errors_1.MonarchValidationError('Quantity must be a positive number', 'quantity');
    }
}
function validateMerchantName(merchantName) {
    if (!merchantName || typeof merchantName !== 'string') {
        throw new errors_1.MonarchValidationError('Merchant name is required', 'merchantName');
    }
    if (merchantName.length > 255) {
        throw new errors_1.MonarchValidationError('Merchant name must be less than 255 characters', 'merchantName');
    }
}
function validateCategoryName(name) {
    if (!name || typeof name !== 'string') {
        throw new errors_1.MonarchValidationError('Category name is required', 'name');
    }
    if (name.length > 100) {
        throw new errors_1.MonarchValidationError('Category name must be less than 100 characters', 'name');
    }
}
function validateGoalName(name) {
    if (!name || typeof name !== 'string') {
        throw new errors_1.MonarchValidationError('Goal name is required', 'name');
    }
    if (name.length > 100) {
        throw new errors_1.MonarchValidationError('Goal name must be less than 100 characters', 'name');
    }
}
function validateTargetAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw new errors_1.MonarchValidationError('Target amount must be a positive number', 'targetAmount');
    }
}
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
function sanitizeString(input) {
    // eslint-disable-next-line no-control-regex
    return input.trim().replace(/[\x00-\x1f\x7f-\x9f]/g, '');
}
function parseAmount(amount) {
    if (typeof amount === 'number') {
        return amount;
    }
    // Remove currency symbols, commas, and spaces
    const cleaned = amount.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
        throw new errors_1.MonarchValidationError('Invalid amount format', 'amount');
    }
    return parsed;
}
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
function parseDate(date) {
    if (date instanceof Date) {
        return date;
    }
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
        throw new errors_1.MonarchValidationError('Invalid date format', 'date');
    }
    return parsed;
}
//# sourceMappingURL=validation.js.map
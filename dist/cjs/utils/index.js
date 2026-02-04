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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.isNode = isNode;
exports.isBrowser = isBrowser;
exports.getEnvironmentVariable = getEnvironmentVariable;
exports.formatCurrency = formatCurrency;
exports.formatPercentage = formatPercentage;
exports.debounce = debounce;
exports.throttle = throttle;
exports.deepMerge = deepMerge;
exports.pickFields = pickFields;
exports.omitFields = omitFields;
exports.groupBy = groupBy;
exports.chunk = chunk;
exports.unique = unique;
exports.sortBy = sortBy;
exports.createQueryString = createQueryString;
// Utility exports
__exportStar(require("./errors"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./logger"), exports);
__exportStar(require("./encryption"), exports);
// Helper utilities
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isNode() {
    return typeof process !== 'undefined' && process.versions?.node !== undefined;
}
function isBrowser() {
    return typeof globalThis !== 'undefined' &&
        typeof globalThis.window !== 'undefined' &&
        typeof globalThis.window.document !== 'undefined';
}
function getEnvironmentVariable(name, defaultValue) {
    if (isNode()) {
        return process.env[name] || defaultValue;
    }
    return defaultValue;
}
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
function formatPercentage(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key], source[key]);
        }
        else if (source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}
function pickFields(obj, fields) {
    const result = {};
    for (const field of fields) {
        if (field in obj) {
            result[field] = obj[field];
        }
    }
    return result;
}
function omitFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        delete result[field];
    }
    return result;
}
function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
function unique(array, keyFn) {
    if (!keyFn) {
        return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
function sortBy(array, keyFn, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aKey = keyFn(a);
        const bKey = keyFn(b);
        if (aKey < bKey) {
            return direction === 'asc' ? -1 : 1;
        }
        if (aKey > bKey) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}
function createQueryString(params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                value.forEach(item => searchParams.append(key, String(item)));
            }
            else {
                searchParams.set(key, String(value));
            }
        }
    }
    return searchParams.toString();
}
//# sourceMappingURL=index.js.map
// Utility exports
export * from './errors';
export * from './validation';
export * from './logger';
export * from './encryption';
// Helper utilities
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function isNode() {
    return typeof process !== 'undefined' && process.versions?.node !== undefined;
}
export function isBrowser() {
    return typeof globalThis !== 'undefined' &&
        typeof globalThis.window !== 'undefined' &&
        typeof globalThis.window.document !== 'undefined';
}
export function getEnvironmentVariable(name, defaultValue) {
    if (isNode()) {
        return process.env[name] || defaultValue;
    }
    return defaultValue;
}
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
export function formatPercentage(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
export function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
export function deepMerge(target, source) {
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
export function pickFields(obj, fields) {
    const result = {};
    for (const field of fields) {
        if (field in obj) {
            result[field] = obj[field];
        }
    }
    return result;
}
export function omitFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        delete result[field];
    }
    return result;
}
export function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}
export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
export function unique(array, keyFn) {
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
export function sortBy(array, keyFn, direction = 'asc') {
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
export function createQueryString(params) {
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
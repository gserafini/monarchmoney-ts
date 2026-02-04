"use strict";
// import { MonarchErrorDetails } from '../types'
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle_http_response = exports.handle_graphql_errors = exports.ValidationError = exports.SessionExpiredError = exports.ServerError = exports.RequireMFAException = exports.RequestFailedException = exports.RateLimitError = exports.NetworkError = exports.MonarchMoneyError = exports.MFARequiredError = exports.LoginFailedException = exports.InvalidMFAError = exports.GraphQLError = exports.DataError = exports.ConfigurationError = exports.ClientError = exports.AuthenticationError = exports.MonarchConfigError = exports.MonarchIPBlockedError = exports.MonarchCaptchaRequiredError = exports.MonarchMFARequiredError = exports.MonarchSessionExpiredError = exports.MonarchGraphQLError = exports.MonarchNetworkError = exports.MonarchValidationError = exports.MonarchRateLimitError = exports.MonarchAPIError = exports.MonarchAuthError = exports.MonarchError = void 0;
exports.handleHTTPResponse = handleHTTPResponse;
exports.handleGraphQLErrors = handleGraphQLErrors;
exports.isRetryableError = isRetryableError;
exports.retryWithBackoff = retryWithBackoff;
class MonarchError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'MonarchError';
        this.code = code;
        this.details = details;
    }
}
exports.MonarchError = MonarchError;
class MonarchAuthError extends MonarchError {
    constructor(message, details) {
        super(message, 'AUTH_ERROR', details);
        this.name = 'MonarchAuthError';
    }
}
exports.MonarchAuthError = MonarchAuthError;
class MonarchAPIError extends MonarchError {
    constructor(message, statusCode, response) {
        super(message, 'API_ERROR', { statusCode, response });
        this.name = 'MonarchAPIError';
        this.statusCode = statusCode;
        this.response = response;
    }
}
exports.MonarchAPIError = MonarchAPIError;
class MonarchRateLimitError extends MonarchError {
    constructor(message, retryAfter) {
        super(message, 'RATE_LIMIT', { retryAfter });
        this.name = 'MonarchRateLimitError';
        this.retryAfter = retryAfter;
    }
}
exports.MonarchRateLimitError = MonarchRateLimitError;
class MonarchValidationError extends MonarchError {
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', { field });
        this.name = 'MonarchValidationError';
        this.field = field;
    }
}
exports.MonarchValidationError = MonarchValidationError;
class MonarchNetworkError extends MonarchError {
    constructor(message, details) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'MonarchNetworkError';
    }
}
exports.MonarchNetworkError = MonarchNetworkError;
class MonarchGraphQLError extends MonarchError {
    constructor(message, graphQLErrors) {
        super(message, 'GRAPHQL_ERROR', { graphQLErrors });
        this.name = 'MonarchGraphQLError';
        this.graphQLErrors = graphQLErrors;
    }
}
exports.MonarchGraphQLError = MonarchGraphQLError;
class MonarchSessionExpiredError extends MonarchAuthError {
    constructor(message = 'Session has expired') {
        super(message);
        this.name = 'MonarchSessionExpiredError';
        this.code = 'SESSION_EXPIRED';
    }
}
exports.MonarchSessionExpiredError = MonarchSessionExpiredError;
class MonarchMFARequiredError extends MonarchAuthError {
    constructor(message = 'Multi-factor authentication required') {
        super(message);
        this.name = 'MonarchMFARequiredError';
        this.code = 'MFA_REQUIRED';
    }
}
exports.MonarchMFARequiredError = MonarchMFARequiredError;
class MonarchCaptchaRequiredError extends MonarchAuthError {
    constructor(message = 'CAPTCHA verification required') {
        super(message);
        this.name = 'MonarchCaptchaRequiredError';
        this.code = 'CAPTCHA_REQUIRED';
    }
}
exports.MonarchCaptchaRequiredError = MonarchCaptchaRequiredError;
class MonarchIPBlockedError extends MonarchAuthError {
    constructor(message = 'IP address has been temporarily blocked') {
        super(message);
        this.name = 'MonarchIPBlockedError';
        this.code = 'IP_BLOCKED';
    }
}
exports.MonarchIPBlockedError = MonarchIPBlockedError;
class MonarchConfigError extends MonarchError {
    constructor(message, details) {
        super(message, 'CONFIG_ERROR', details);
        this.name = 'MonarchConfigError';
    }
}
exports.MonarchConfigError = MonarchConfigError;
// Error handler utilities  
function handleHTTPResponse(response) {
    if (response.status === 401) {
        throw new MonarchAuthError('Unauthorized - check your credentials');
    }
    if (response.status === 403) {
        throw new MonarchAuthError('Forbidden - access denied');
    }
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new MonarchRateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : undefined);
    }
    if (response.status >= 400 && response.status < 500) {
        throw new MonarchAPIError(`Client error: ${response.status} ${response.statusText}`, response.status);
    }
    if (response.status >= 500) {
        throw new MonarchAPIError(`Server error: ${response.status} ${response.statusText}`, response.status);
    }
}
function handleGraphQLErrors(errors) {
    if (Array.isArray(errors) && errors.length > 0) {
        const firstError = errors[0];
        const message = typeof firstError === 'object' && firstError !== null &&
            'message' in firstError ? String(firstError.message) : 'GraphQL error occurred';
        // Check for authentication errors in GraphQL errors
        if (message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('authentication')) {
            throw new MonarchAuthError(message);
        }
        // Check for MFA errors
        if (message.toLowerCase().includes('mfa') ||
            message.toLowerCase().includes('multi-factor')) {
            throw new MonarchMFARequiredError(message);
        }
        throw new MonarchGraphQLError(message, errors);
    }
    throw new MonarchGraphQLError('Unknown GraphQL error occurred');
}
function isRetryableError(error) {
    if (error instanceof MonarchRateLimitError) {
        return true;
    }
    if (error instanceof MonarchNetworkError) {
        return true;
    }
    if (error instanceof MonarchAPIError) {
        // Retry on server errors but not client errors
        return (error.statusCode && error.statusCode >= 500) || false;
    }
    // Don't retry authentication, validation, or configuration errors
    if (error instanceof MonarchAuthError ||
        error instanceof MonarchValidationError ||
        error instanceof MonarchConfigError) {
        return false;
    }
    return false;
}
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, maxDelay = 60000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt === maxRetries || !isRetryableError(error)) {
                throw error;
            }
            let delay = baseDelay * Math.pow(2, attempt);
            // Use retry-after header for rate limit errors
            if (error instanceof MonarchRateLimitError && error.retryAfter) {
                delay = error.retryAfter * 1000;
            }
            // Add jitter and respect max delay
            delay = Math.min(delay + Math.random() * 1000, maxDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new MonarchError('Retry attempts exhausted');
}
// Legacy error aliases for backward compatibility
exports.AuthenticationError = MonarchAuthError;
exports.ClientError = MonarchAPIError;
exports.ConfigurationError = MonarchConfigError;
exports.DataError = MonarchError;
exports.GraphQLError = MonarchGraphQLError;
exports.InvalidMFAError = MonarchMFARequiredError;
exports.LoginFailedException = MonarchAuthError;
exports.MFARequiredError = MonarchMFARequiredError;
exports.MonarchMoneyError = MonarchError;
exports.NetworkError = MonarchNetworkError;
exports.RateLimitError = MonarchRateLimitError;
exports.RequestFailedException = MonarchAPIError;
exports.RequireMFAException = MonarchMFARequiredError;
exports.ServerError = MonarchAPIError;
exports.SessionExpiredError = MonarchSessionExpiredError;
exports.ValidationError = MonarchValidationError;
exports.handle_graphql_errors = handleGraphQLErrors;
exports.handle_http_response = handleHTTPResponse;
//# sourceMappingURL=errors.js.map
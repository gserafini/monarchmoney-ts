export declare class MonarchError extends Error {
    code?: string;
    details?: unknown;
    constructor(message: string, code?: string, details?: unknown);
}
export declare class MonarchAuthError extends MonarchError {
    constructor(message: string, details?: unknown);
}
export declare class MonarchAPIError extends MonarchError {
    statusCode?: number;
    response?: unknown;
    constructor(message: string, statusCode?: number, response?: unknown);
}
export declare class MonarchRateLimitError extends MonarchError {
    retryAfter?: number;
    constructor(message: string, retryAfter?: number);
}
export declare class MonarchValidationError extends MonarchError {
    field?: string;
    constructor(message: string, field?: string);
}
export declare class MonarchNetworkError extends MonarchError {
    constructor(message: string, details?: unknown);
}
export declare class MonarchGraphQLError extends MonarchError {
    graphQLErrors?: Array<{
        message: string;
        locations?: Array<{
            line: number;
            column: number;
        }>;
        path?: (string | number)[];
        extensions?: Record<string, unknown>;
    }>;
    constructor(message: string, graphQLErrors?: MonarchGraphQLError['graphQLErrors']);
}
export declare class MonarchSessionExpiredError extends MonarchAuthError {
    constructor(message?: string);
}
export declare class MonarchMFARequiredError extends MonarchAuthError {
    constructor(message?: string);
}
export declare class MonarchCaptchaRequiredError extends MonarchAuthError {
    constructor(message?: string);
}
export declare class MonarchIPBlockedError extends MonarchAuthError {
    constructor(message?: string);
}
export declare class MonarchConfigError extends MonarchError {
    constructor(message: string, details?: unknown);
}
export declare function handleHTTPResponse(response: any): void;
export declare function handleGraphQLErrors(errors: unknown): never;
export declare function isRetryableError(error: Error): boolean;
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number, maxDelay?: number): Promise<T>;
export declare const AuthenticationError: typeof MonarchAuthError;
export declare const ClientError: typeof MonarchAPIError;
export declare const ConfigurationError: typeof MonarchConfigError;
export declare const DataError: typeof MonarchError;
export declare const GraphQLError: typeof MonarchGraphQLError;
export declare const InvalidMFAError: typeof MonarchMFARequiredError;
export declare const LoginFailedException: typeof MonarchAuthError;
export declare const MFARequiredError: typeof MonarchMFARequiredError;
export declare const MonarchMoneyError: typeof MonarchError;
export declare const NetworkError: typeof MonarchNetworkError;
export declare const RateLimitError: typeof MonarchRateLimitError;
export declare const RequestFailedException: typeof MonarchAPIError;
export declare const RequireMFAException: typeof MonarchMFARequiredError;
export declare const ServerError: typeof MonarchAPIError;
export declare const SessionExpiredError: typeof MonarchSessionExpiredError;
export declare const ValidationError: typeof MonarchValidationError;
export declare const handle_graphql_errors: typeof handleGraphQLErrors;
export declare const handle_http_response: typeof handleHTTPResponse;
//# sourceMappingURL=errors.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const utils_1 = require("../../utils");
class GraphQLClient {
    constructor(baseUrl, auth, cache, timeout = 30000) {
        this.lastRequestTime = 0;
        this.minRequestInterval = 250; // 250ms for more human-like behavior
        this.burstLimit = 5; // Max requests in burst
        this.requestTimes = [];
        // Enhanced performance features
        this.requestDeduplication = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.maxConcurrentRequests = 3;
        this.activeRequestCount = 0;
        this.baseUrl = `${baseUrl}/graphql`;
        this.auth = auth;
        this.cache = cache;
        this.timeout = timeout;
    }
    async query(query, variables, options = {}) {
        const { cache = true, cacheTTL, timeout = this.timeout, retries = 3 } = options;
        // Generate cache key
        const cacheKey = cache && this.cache ?
            this.generateCacheKey('query', query, variables) : null;
        // Try cache first
        if (cacheKey && this.cache) {
            const cached = this.cache.get(cacheKey);
            if (cached !== undefined) {
                utils_1.logger.debug(`GraphQL cache HIT: ${cacheKey}`);
                return cached;
            }
        }
        // Request deduplication - check if identical request is in progress
        const deduplicationKey = this.generateCacheKey('query', query, variables);
        if (this.requestDeduplication.has(deduplicationKey)) {
            utils_1.logger.debug(`Request deduplication HIT: ${deduplicationKey}`);
            return this.requestDeduplication.get(deduplicationKey);
        }
        // Create and store deduplication promise
        const requestPromise = this.executeWithQueue(async () => {
            return (0, utils_1.retryWithBackoff)(async () => {
                return this.executeQuery(query, variables, timeout);
            }, retries);
        });
        this.requestDeduplication.set(deduplicationKey, requestPromise);
        try {
            const result = await requestPromise;
            // Cache result
            if (cacheKey && this.cache && result) {
                this.cache.set(cacheKey, result, cacheTTL);
                utils_1.logger.debug(`GraphQL cache SET: ${cacheKey}`);
            }
            return result;
        }
        finally {
            // Clean up deduplication entry
            this.requestDeduplication.delete(deduplicationKey);
        }
    }
    async mutation(mutation, variables, options = {}) {
        const { timeout = this.timeout, retries = 3 } = options;
        // Execute mutation with queue management
        const result = await this.executeWithQueue(async () => {
            return (0, utils_1.retryWithBackoff)(async () => {
                return this.executeQuery(mutation, variables, timeout);
            }, retries);
        });
        // Invalidate related cache entries for mutations
        if (this.cache) {
            this.invalidateMutationCache(mutation, variables);
        }
        return result;
    }
    async rateLimit() {
        const now = Date.now();
        // Clean old request times (older than 1 minute)
        this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
        // Check burst limit - if we've made too many requests recently, wait longer
        if (this.requestTimes.length >= this.burstLimit) {
            const oldestRecentRequest = Math.min(...this.requestTimes);
            const waitTime = 60000 - (now - oldestRecentRequest) + 100; // Wait until burst window resets
            if (waitTime > 0) {
                utils_1.logger.debug(`Rate limit burst protection: waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        // Standard rate limiting
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const sleepTime = this.minRequestInterval - timeSinceLastRequest;
            utils_1.logger.debug(`Rate limit: waiting ${sleepTime}ms`);
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
        // Add some randomness to make it more human-like (±50ms)
        const jitter = Math.random() * 100 - 50;
        if (jitter > 0) {
            await new Promise(resolve => setTimeout(resolve, jitter));
        }
        this.lastRequestTime = Date.now();
        this.requestTimes.push(this.lastRequestTime);
    }
    async executeQuery(query, variables, _timeout) {
        // Add rate limiting BEFORE the request like Python library
        await this.rateLimit();
        // Ensure we have a valid session
        await this.auth.ensureValidSession();
        const token = this.auth.getToken();
        const deviceUuid = this.auth.getDeviceUuid();
        if (!token) {
            throw new utils_1.MonarchAPIError('No authentication token available');
        }
        const requestBody = {
            query: query.trim(),
            variables: variables || {},
            operationName: null // The web UI sends null for operationName when not specified
        };
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Client-Platform': 'web', // Fixed: match Python case exactly
            'Origin': 'https://app.monarch.com',
            'device-uuid': deviceUuid || this.auth.getDeviceUuid() || 'unknown',
            'x-cio-client-platform': 'web',
            'x-cio-site-id': '2598be4aa410159198b2',
            'x-gist-user-anonymous': 'false'
        };
        // Debug: Log GraphQL request details
        const safeHeaders = { ...requestHeaders };
        if (safeHeaders.Authorization) {
            safeHeaders.Authorization = 'Token ***';
        }
        utils_1.logger.debug('GraphQL Request Details:', {
            url: this.baseUrl,
            headers: safeHeaders,
            body: requestBody
        });
        const response = await (0, node_fetch_1.default)(this.baseUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
        });
        // Debug: Log response details
        utils_1.logger.debug(`GraphQL Response: ${response.status} ${response.statusText}`);
        // Get response text first to log it, then handle errors
        const responseText = await response.text();
        utils_1.logger.debug('GraphQL Response Body:', responseText);
        if (response.status >= 400) {
            (0, utils_1.handleHTTPResponse)(response);
        }
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch (parseError) {
            utils_1.logger.error('Failed to parse GraphQL response as JSON:', parseError);
            throw new utils_1.MonarchAPIError(`Invalid JSON response: ${responseText}`);
        }
        if (data.errors && data.errors.length > 0) {
            this.handleGraphQLErrors(data.errors);
        }
        if (!data.data) {
            throw new utils_1.MonarchGraphQLError('No data returned from GraphQL query');
        }
        return data.data;
    }
    handleGraphQLErrors(errors) {
        const firstError = errors[0];
        const message = firstError.message || 'GraphQL error occurred';
        // Check for authentication errors
        if (message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('token')) {
            // Clear session and throw auth error
            this.auth.deleteSession();
            throw new utils_1.MonarchAPIError('Authentication failed - session expired', 401);
        }
        // Log all errors for debugging
        utils_1.logger.error('GraphQL errors:', errors);
        throw new utils_1.MonarchGraphQLError(message, errors);
    }
    generateCacheKey(type, operation, variables) {
        const operationName = this.extractOperationName(operation) || type;
        if (!variables || Object.keys(variables).length === 0) {
            return operationName;
        }
        // Sort variables for consistent caching
        const sortedVars = Object.keys(variables)
            .sort()
            .reduce((sorted, key) => {
            sorted[key] = variables[key];
            return sorted;
        }, {});
        return `${operationName}:${JSON.stringify(sortedVars)}`;
    }
    extractOperationName(operation) {
        // Extract operation name from GraphQL query/mutation
        const match = operation.match(/(?:query|mutation)\s+(\w+)/);
        return match ? match[1] : null;
    }
    invalidateMutationCache(mutation, variables) {
        if (!this.cache)
            return;
        const operationName = this.extractOperationName(mutation);
        if (!operationName)
            return;
        // Invalidation patterns based on mutation type
        const invalidationPatterns = [];
        if (operationName.toLowerCase().includes('transaction')) {
            invalidationPatterns.push('^GetTransactions', '^GetTransactionsSummary', '^GetCashflow');
            // If account-specific, invalidate account-related cache
            if (variables?.accountId) {
                invalidationPatterns.push(`GetAccount.*${variables.accountId}`);
            }
        }
        if (operationName.toLowerCase().includes('account')) {
            invalidationPatterns.push('^GetAccounts', '^GetNetWorth', '^GetAccountHistory');
        }
        if (operationName.toLowerCase().includes('budget')) {
            invalidationPatterns.push('^GetBudgets', '^GetCashflow');
        }
        if (operationName.toLowerCase().includes('category')) {
            invalidationPatterns.push('^GetTransactionCategories', '^GetCategoryGroups');
        }
        // Execute invalidations
        for (const pattern of invalidationPatterns) {
            const invalidated = this.cache.invalidatePattern(new RegExp(pattern));
            if (invalidated > 0) {
                utils_1.logger.debug(`Invalidated ${invalidated} cache entries matching ${pattern}`);
            }
        }
    }
    // Batch multiple queries
    async batchQuery(queries, options = {}) {
        const { timeout: _timeout = this.timeout, retries: _retries = 3 } = options;
        // Execute queries in parallel
        const promises = queries.map(({ query, variables, operationName: _operationName }) => this.query(query, variables, { ...options, cache: false }));
        const results = await Promise.allSettled(promises);
        // Check for failures
        const failures = results
            .map((result, index) => ({ result, index }))
            .filter(({ result }) => result.status === 'rejected');
        if (failures.length > 0) {
            utils_1.logger.warn(`${failures.length} out of ${queries.length} batch queries failed`);
            // If more than half failed, throw the first error
            if (failures.length > queries.length / 2) {
                const firstFailure = failures[0];
                if (firstFailure.result.status === 'rejected') {
                    throw firstFailure.result.reason;
                }
            }
        }
        // Return successful results (with undefined for failures)
        return results.map(result => result.status === 'fulfilled' ? result.value : undefined);
    }
    // Execute raw GraphQL with minimal processing
    async raw(query, variables) {
        // Add rate limiting BEFORE the request like Python library
        await this.rateLimit();
        await this.auth.ensureValidSession();
        const token = this.auth.getToken();
        const deviceUuid = this.auth.getDeviceUuid();
        if (!token) {
            throw new utils_1.MonarchAPIError('No authentication token available');
        }
        const response = await (0, node_fetch_1.default)(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Client-Platform': 'web', // Fixed: match Python case exactly
                'Origin': 'https://app.monarch.com',
                'device-uuid': deviceUuid || this.auth.getDeviceUuid() || 'unknown',
                'x-cio-client-platform': 'web',
                'x-cio-site-id': '2598be4aa410159198b2',
                'x-gist-user-anonymous': 'false'
            },
            body: JSON.stringify({
                query: query.trim(),
                variables: variables || {}
            })
        });
        (0, utils_1.handleHTTPResponse)(response);
        return await response.json();
    }
    // Clear all cached GraphQL responses
    clearCache() {
        this.cache?.clear();
        utils_1.logger.debug('GraphQL cache cleared');
    }
    // Execute request with concurrency control and queue management
    async executeWithQueue(execute) {
        // If under concurrency limit, execute immediately
        if (this.activeRequestCount < this.maxConcurrentRequests) {
            this.activeRequestCount++;
            try {
                const result = await execute();
                return result;
            }
            finally {
                this.activeRequestCount--;
                // Process queued requests
                this.processQueue();
            }
        }
        // Otherwise queue the request
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                resolve,
                reject,
                execute: async () => {
                    try {
                        const result = await execute();
                        resolve(result);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }
    processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        // Process requests while under concurrency limit
        while (this.requestQueue.length > 0 && this.activeRequestCount < this.maxConcurrentRequests) {
            const request = this.requestQueue.shift();
            if (request) {
                this.activeRequestCount++;
                // Execute request asynchronously
                request.execute().finally(() => {
                    this.activeRequestCount--;
                    // Continue processing queue
                    setImmediate(() => this.processQueue());
                });
            }
        }
        this.isProcessingQueue = false;
    }
    // Advanced analytics for performance monitoring
    getPerformanceStats() {
        // Calculate average request interval from recent requests
        const recentRequests = this.requestTimes.slice(-10);
        let averageInterval = 0;
        if (recentRequests.length > 1) {
            const intervals = [];
            for (let i = 1; i < recentRequests.length; i++) {
                intervals.push(recentRequests[i] - recentRequests[i - 1]);
            }
            averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        }
        return {
            cacheStats: this.cache?.getStats() || null,
            requestStats: {
                activeRequests: this.activeRequestCount,
                queuedRequests: this.requestQueue.length,
                deduplicatedRequests: this.requestDeduplication.size,
                averageRequestInterval: Math.round(averageInterval),
                burstProtectionEngagements: 0 // Could add counter for this
            }
        };
    }
    // Get cache statistics (backward compatibility)
    getCacheStats() {
        return this.cache?.getStats() || null;
    }
    // Preload common queries for better performance
    async preloadCommonQueries() {
        const commonQueries = [
            { query: 'query GetMe { me { id email displayName } }' },
            { query: 'query GetCategories { categories { id name icon } }' },
            { query: 'query GetAccounts { accounts { id displayName displayType } }' }
        ];
        utils_1.logger.debug('Preloading common queries for better performance...');
        const preloadPromises = commonQueries.map(({ query }) => this.query(query, {}, { cache: true, cacheTTL: 300000 }) // 5 min cache
            .catch(error => {
            utils_1.logger.debug(`Preload failed for query: ${error.message}`);
            return null;
        }));
        await Promise.allSettled(preloadPromises);
        utils_1.logger.debug('Common queries preloaded');
    }
}
exports.GraphQLClient = GraphQLClient;
//# sourceMappingURL=GraphQLClient.js.map
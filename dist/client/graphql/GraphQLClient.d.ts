import { GraphQLResponse } from '../../types';
import { AuthenticationService } from '../auth';
import { MultiLevelCache } from '../../cache';
export interface GraphQLRequestOptions {
    cache?: boolean;
    cacheTTL?: number;
    timeout?: number;
    retries?: number;
}
export declare class GraphQLClient {
    private baseUrl;
    private auth;
    private cache?;
    private timeout;
    private lastRequestTime;
    private readonly minRequestInterval;
    private readonly burstLimit;
    private requestTimes;
    private requestDeduplication;
    private requestQueue;
    private isProcessingQueue;
    private readonly maxConcurrentRequests;
    private activeRequestCount;
    constructor(baseUrl: string, auth: AuthenticationService, cache?: MultiLevelCache, timeout?: number);
    query<T = unknown>(query: string, variables?: Record<string, unknown>, options?: GraphQLRequestOptions): Promise<T>;
    mutation<T = unknown>(mutation: string, variables?: Record<string, unknown>, options?: GraphQLRequestOptions): Promise<T>;
    private rateLimit;
    private executeQuery;
    private handleGraphQLErrors;
    private generateCacheKey;
    private extractOperationName;
    private invalidateMutationCache;
    batchQuery<T = unknown>(queries: Array<{
        query: string;
        variables?: Record<string, unknown>;
        operationName?: string;
    }>, options?: GraphQLRequestOptions): Promise<T[]>;
    raw<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<GraphQLResponse<T>>;
    clearCache(): void;
    private executeWithQueue;
    private processQueue;
    getPerformanceStats(): {
        cacheStats: ReturnType<MultiLevelCache['getStats']> | null;
        requestStats: {
            activeRequests: number;
            queuedRequests: number;
            deduplicatedRequests: number;
            averageRequestInterval: number;
            burstProtectionEngagements: number;
        };
    };
    getCacheStats(): ReturnType<MultiLevelCache['getStats']> | null;
    preloadCommonQueries(): Promise<void>;
}
//# sourceMappingURL=GraphQLClient.d.ts.map
import { AuthenticationService } from './auth';
import { DirectAuthenticationService } from './auth/DirectAuthenticationService';
import { GraphQLClient } from './graphql';
import { MultiLevelCache } from '../cache';
import { AccountsAPIImpl } from '../api/accounts';
import { TransactionsAPIImpl } from '../api/transactions';
import { BudgetsAPIImpl } from '../api/budgets';
import { CategoriesAPIImpl } from '../api/categories';
import { CashflowAPIImpl } from '../api/cashflow';
import { RecurringAPIImpl } from '../api/recurring';
import { InstitutionsAPIImpl } from '../api/institutions';
import { InsightsAPIImpl } from '../api/insights';
import { InvestmentsAPIImpl } from '../api/investments';
import { ReportsAPIImpl } from '../api/reports';
import { getEnvironmentVariable, logger, deepMerge } from '../utils';
// Default configuration
const DEFAULT_CONFIG = {
    email: '',
    password: '',
    sessionToken: '',
    baseURL: 'https://api.monarch.com',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    cache: {
        memoryTTL: {
            accounts: 300000, // 5 minutes
            categories: 1800000, // 30 minutes
            transactions: 120000, // 2 minutes
            budgets: 600000, // 10 minutes
        },
        persistentTTL: {
            session: 86400000, // 24 hours
            userProfile: 3600000, // 1 hour
        },
        autoInvalidate: true,
        maxMemorySize: 100, // MB
    },
    enablePersistentCache: true,
    cacheEncryptionKey: '',
    logLevel: 'info',
    logger: logger,
    rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
    },
};
export class MonarchClient {
    constructor(config = {}) {
        // Merge with defaults and environment variables
        this.config = this.buildConfig(config);
        // Initialize cache if enabled
        if (this.config.enablePersistentCache) {
            this.cache = new MultiLevelCache(this.config.cache, this.config.cacheEncryptionKey);
        }
        // Initialize authentication service
        this.auth = new AuthenticationService(this.config.baseURL, undefined);
        // Initialize direct authentication service with shared session storage
        // We need to access the private sessionStorage, so we'll use a workaround
        this.directAuth = new DirectAuthenticationService(this.config.baseURL, this.auth.sessionStorage // Access private property for shared storage
        );
        // Initialize GraphQL client
        this.graphql = new GraphQLClient(this.config.baseURL, this.auth, this.cache, this.config.timeout);
        // Initialize API modules
        this.accounts = new AccountsAPIImpl(this.graphql);
        this.transactions = new TransactionsAPIImpl(this.graphql);
        this.budgets = new BudgetsAPIImpl(this.graphql);
        this.categories = new CategoriesAPIImpl(this.graphql);
        this.cashflow = new CashflowAPIImpl(this.graphql);
        this.recurring = new RecurringAPIImpl(this.graphql);
        this.institutions = new InstitutionsAPIImpl(this.graphql);
        this.insights = new InsightsAPIImpl(this.graphql);
        this.investments = new InvestmentsAPIImpl(this.graphql);
        this.reports = new ReportsAPIImpl(this.graphql);
        logger.info('MonarchClient initialized', {
            baseURL: this.config.baseURL,
            cacheEnabled: !!this.cache,
            timeout: this.config.timeout
        });
    }
    buildConfig(userConfig) {
        // Start with defaults
        let config = { ...DEFAULT_CONFIG };
        // Merge environment variables
        const envConfig = {
            email: getEnvironmentVariable('MONARCH_EMAIL'),
            password: getEnvironmentVariable('MONARCH_PASSWORD'),
            sessionToken: getEnvironmentVariable('MONARCH_SESSION_TOKEN'),
            baseURL: getEnvironmentVariable('MONARCH_BASE_URL'),
            cacheEncryptionKey: getEnvironmentVariable('MONARCH_CACHE_ENCRYPTION_KEY'),
            logLevel: getEnvironmentVariable('MONARCH_LOG_LEVEL'),
        };
        // Remove undefined values from env config
        const cleanedEnvConfig = Object.fromEntries(Object.entries(envConfig).filter(([_, value]) => value !== undefined));
        // Merge configs: defaults -> env -> user
        config = deepMerge(config, cleanedEnvConfig);
        config = deepMerge(config, userConfig);
        return config;
    }
    // Authentication methods
    async login(options) {
        const loginOptions = {
            email: options?.email || this.config.email,
            password: options?.password || this.config.password,
            useSavedSession: options?.useSavedSession ?? true,
            saveSession: options?.saveSession ?? true,
            mfaSecretKey: options?.mfaSecretKey,
        };
        await this.auth.login(loginOptions);
    }
    async interactiveLogin(options) {
        await this.auth.interactiveLogin(options);
    }
    async multiFactorAuthenticate(options) {
        await this.auth.multiFactorAuthenticate(options);
    }
    /**
     * Direct login using the proven working authentication approach
     * This bypasses the complex retry logic and directly replicates the working raw authentication
     */
    async directLogin(options) {
        await this.directAuth.login(options);
    }
    // Session management
    async validateSession() {
        return await this.auth.validateSession();
    }
    isSessionStale() {
        return this.auth.isSessionStale();
    }
    async ensureValidSession() {
        // Check if direct auth has a valid session first
        const directSession = this.directAuth.getSessionInfo();
        if (directSession.isValid) {
            return; // Direct auth session is valid
        }
        // Fall back to regular auth
        return await this.auth.ensureValidSession();
    }
    getSessionInfo() {
        // Try direct auth first, then fall back to main auth
        const directSession = this.directAuth.getSessionInfo();
        if (directSession.isValid) {
            return directSession;
        }
        return this.auth.getSessionInfo();
    }
    saveSession() {
        this.auth.saveSession();
    }
    loadSession() {
        return this.auth.loadSession();
    }
    deleteSession() {
        this.auth.deleteSession();
        this.directAuth.deleteSession();
    }
    // GraphQL methods
    async gqlCall(_operation, query, variables) {
        return await this.graphql.query(query, variables);
    }
    async gqlMutation(_operation, mutation, variables) {
        return await this.graphql.mutation(mutation, variables);
    }
    // GraphQL client access (for advanced usage like schema discovery)
    getGraphQLClient() {
        return this.graphql;
    }
    // Cache management
    clearCache() {
        this.cache?.clear();
        this.graphql.clearCache();
    }
    getCacheStats() {
        return this.cache?.getStats() || null;
    }
    async preloadCache(operations) {
        if (this.cache) {
            await this.cache.preloadCache(operations);
        }
    }
    // Utility methods
    getVersion() {
        return {
            version: '1.0.0',
            sessionInfo: this.getSessionInfo()
        };
    }
    setTimeout(timeoutMs) {
        this.config.timeout = timeoutMs;
        // Note: We'd need to recreate the GraphQL client to apply the new timeout
        logger.info(`Timeout updated to ${timeoutMs}ms`);
    }
    setToken(token) {
        this.config.sessionToken = token;
        // Note: This would need to be passed to the auth service
        logger.info('Token updated');
    }
    // Cleanup
    async close() {
        this.cache?.close();
        logger.info('MonarchClient closed');
    }
    // Legacy method aliases for backward compatibility
    async get_accounts(includeHidden) {
        return this.accounts.getAll({ includeHidden });
    }
    async get_me() {
        const GET_ME_QUERY = `
      query Common_GetMe {
        me {
          id
          birthday
          email
          isSuperuser
          name
          timezone
          hasPassword
          hasMfaOn
          externalAuthProviderNames
          pendingEmailUpdateVerification {
            email
            __typename
          }
          profilePicture {
            id
            cloudinaryPublicId
            thumbnailUrl
            __typename
          }
          profilePictureUrl
          activeSupportAccountAccessGrant {
            id
            createdAt
            expiresAt
            __typename
          }
          profile {
            id
            hasSeenCategoriesManagementTour
            dismissedTransactionsListUpdatesTourAt
            viewedMarkAsReviewedUpdatesCalloutAt
            hasDismissedWhatsNewAt
            __typename
          }
          __typename
        }
      }
    `;
        return await this.graphql.query(GET_ME_QUERY).then(response => response.me);
    }
    // Environment detection
    static isNode() {
        return typeof process !== 'undefined' && process.versions?.node !== undefined;
    }
    static isBrowser() {
        return typeof globalThis !== 'undefined' &&
            typeof globalThis.window !== 'undefined' &&
            typeof globalThis.window.document !== 'undefined';
    }
    // Static factory methods
    static create(config) {
        return new MonarchClient(config);
    }
    static async createAndLogin(config) {
        const client = new MonarchClient(config);
        await client.login({
            email: config.email,
            password: config.password
        });
        return client;
    }
}
//# sourceMappingURL=MonarchClient.js.map
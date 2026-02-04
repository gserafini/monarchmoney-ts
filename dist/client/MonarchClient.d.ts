import { LoginOptions, MFAOptions } from './auth';
import { DirectLoginOptions } from './auth/DirectAuthenticationService';
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
import { MonarchConfig, /* CacheConfig, */ SessionInfo } from '../types';
export declare class MonarchClient {
    private config;
    private auth;
    private directAuth;
    private graphql;
    private cache?;
    accounts: AccountsAPIImpl;
    transactions: TransactionsAPIImpl;
    budgets: BudgetsAPIImpl;
    categories: CategoriesAPIImpl;
    cashflow: CashflowAPIImpl;
    recurring: RecurringAPIImpl;
    institutions: InstitutionsAPIImpl;
    insights: InsightsAPIImpl;
    investments: InvestmentsAPIImpl;
    reports: ReportsAPIImpl;
    constructor(config?: MonarchConfig);
    private buildConfig;
    login(options?: LoginOptions): Promise<void>;
    interactiveLogin(options?: Omit<LoginOptions, 'email' | 'password'>): Promise<void>;
    multiFactorAuthenticate(options: MFAOptions): Promise<void>;
    /**
     * Direct login using the proven working authentication approach
     * This bypasses the complex retry logic and directly replicates the working raw authentication
     */
    directLogin(options: DirectLoginOptions): Promise<void>;
    validateSession(): Promise<boolean>;
    isSessionStale(): boolean;
    ensureValidSession(): Promise<void>;
    getSessionInfo(): SessionInfo;
    saveSession(): void;
    loadSession(): boolean;
    deleteSession(): void;
    gqlCall<T = unknown>(_operation: string, query: string, variables?: Record<string, unknown>): Promise<T>;
    gqlMutation<T = unknown>(_operation: string, mutation: string, variables?: Record<string, unknown>): Promise<T>;
    getGraphQLClient(): GraphQLClient;
    clearCache(): void;
    getCacheStats(): ReturnType<MultiLevelCache['getStats']> | null;
    preloadCache(operations: Array<{
        operation: string;
        params?: Record<string, unknown>;
        factory: () => Promise<unknown>;
    }>): Promise<void>;
    getVersion(): {
        version: string;
        sessionInfo: SessionInfo;
    };
    setTimeout(timeoutMs: number): void;
    setToken(token: string): void;
    close(): Promise<void>;
    get_accounts(includeHidden?: boolean): Promise<ReturnType<AccountsAPIImpl['getAll']>>;
    get_me(): Promise<unknown>;
    static isNode(): boolean;
    static isBrowser(): boolean;
    static create(config?: MonarchConfig): MonarchClient;
    static createAndLogin(config: MonarchConfig & {
        email: string;
        password: string;
    }): Promise<MonarchClient>;
}
//# sourceMappingURL=MonarchClient.d.ts.map
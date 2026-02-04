import { GraphQLClient } from '../../client/graphql';
import { Account, AccountBalance, CreateAccountInput, UpdateAccountInput } from '../../types';
import { VerbosityLevel } from '../../client/graphql/operations';
export interface AccountsAPI {
    getAll(options?: {
        includeHidden?: boolean;
        verbosity?: VerbosityLevel;
    }): Promise<Account[]>;
    getById(id: string): Promise<Account>;
    getBalances(startDate?: string, endDate?: string): Promise<AccountBalance[]>;
    getTypeOptions(): Promise<{
        types: Array<{
            id: number;
            name: string;
            display: string;
        }>;
        subtypes: Array<{
            id: number;
            name: string;
            display: string;
            typeId: number;
        }>;
    }>;
    getHistory(accountId: string, startDate?: string, endDate?: string): Promise<AccountBalance[]>;
    getNetWorthHistory(startDate?: string, endDate?: string): Promise<Array<{
        date: string;
        netWorth: number;
        assets: number;
        liabilities: number;
    }>>;
    createManualAccount(input: CreateAccountInput): Promise<Account>;
    updateAccount(id: string, updates: UpdateAccountInput): Promise<Account>;
    deleteAccount(id: string): Promise<boolean>;
    requestRefresh(accountIds?: string[]): Promise<boolean>;
    isRefreshComplete(refreshId?: string): Promise<boolean>;
}
export declare class AccountsAPIImpl implements AccountsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getAll(options?: {
        includeHidden?: boolean;
        verbosity?: VerbosityLevel;
    }): Promise<Account[]>;
    getById(id: string): Promise<Account>;
    getBalances(startDate?: string, endDate?: string): Promise<AccountBalance[]>;
    getTypeOptions(): Promise<{
        types: Array<{
            id: number;
            name: string;
            display: string;
        }>;
        subtypes: Array<{
            id: number;
            name: string;
            display: string;
            typeId: number;
        }>;
    }>;
    getHistory(accountId: string, startDate?: string, endDate?: string): Promise<AccountBalance[]>;
    getNetWorthHistory(startDate?: string, endDate?: string): Promise<Array<{
        date: string;
        netWorth: number;
        assets: number;
        liabilities: number;
    }>>;
    createManualAccount(input: CreateAccountInput): Promise<Account>;
    updateAccount(id: string, updates: UpdateAccountInput): Promise<Account>;
    deleteAccount(id: string): Promise<boolean>;
    requestRefresh(accountIds?: string[]): Promise<boolean>;
    isRefreshComplete(refreshId?: string): Promise<boolean>;
}
//# sourceMappingURL=AccountsAPI.d.ts.map
import { GraphQLClient } from '../../client/graphql';
import { Transaction, TransactionDetails, TransactionSummary, TransactionRule, TransactionTag, TransactionCategory, CategoryGroup, Merchant, RecurringTransaction, BulkUpdateResult, PaginatedTransactions } from '../../types';
export interface TransactionsAPI {
    getTransactions(options?: GetTransactionsOptions): Promise<PaginatedTransactions>;
    getTransactionDetails(transactionId: string): Promise<TransactionDetails>;
    createTransaction(data: CreateTransactionInput): Promise<Transaction>;
    updateTransaction(transactionId: string, data: UpdateTransactionInput): Promise<Transaction>;
    deleteTransaction(transactionId: string): Promise<boolean>;
    getTransactionsSummary(): Promise<TransactionSummary>;
    getTransactionsSummaryCard(): Promise<any>;
    getTransactionSplits(transactionId: string): Promise<any>;
    updateTransactionSplits(transactionId: string, splits: TransactionSplit[]): Promise<Transaction>;
    getTransactionRules(): Promise<TransactionRule[]>;
    createTransactionRule(data: CreateTransactionRuleInput): Promise<TransactionRule>;
    updateTransactionRule(ruleId: string, data: UpdateTransactionRuleInput): Promise<TransactionRule>;
    deleteTransactionRule(ruleId: string): Promise<boolean>;
    deleteAllTransactionRules(): Promise<boolean>;
    previewTransactionRule(conditions: RuleCondition[], actions: RuleAction[]): Promise<any>;
    getTransactionCategories(): Promise<TransactionCategory[]>;
    createTransactionCategory(data: CreateTransactionCategoryInput): Promise<TransactionCategory>;
    updateTransactionCategory(categoryId: string, data: UpdateTransactionCategoryInput): Promise<TransactionCategory>;
    deleteTransactionCategory(categoryId: string): Promise<boolean>;
    getTransactionCategoryGroups(): Promise<CategoryGroup[]>;
    getCategoryDetails(categoryId: string): Promise<any>;
    getTransactionTags(): Promise<TransactionTag[]>;
    createTransactionTag(data: CreateTransactionTagInput): Promise<TransactionTag>;
    setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction>;
    getMerchants(options?: GetMerchantsOptions): Promise<Merchant[]>;
    getMerchantDetails(merchantId: string): Promise<any>;
    getEditMerchant(merchantId: string): Promise<any>;
    getRecurringTransactions(options?: GetRecurringTransactionsOptions): Promise<RecurringTransaction[]>;
    getRecurringStreams(options?: GetRecurringStreamsOptions): Promise<any[]>;
    getAggregatedRecurringItems(options: GetAggregatedRecurringItemsOptions): Promise<any>;
    getAllRecurringTransactionItems(options?: GetAllRecurringTransactionItemsOptions): Promise<any[]>;
    reviewRecurringStream(streamId: string, reviewStatus: string): Promise<any>;
    markStreamAsNotRecurring(streamId: string): Promise<boolean>;
    getRecurringMerchantSearchStatus(): Promise<any>;
    bulkUpdateTransactions(data: BulkUpdateTransactionsInput): Promise<BulkUpdateResult>;
    bulkHideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>;
    bulkUnhideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>;
    getHiddenTransactions(options?: GetHiddenTransactionsOptions): Promise<PaginatedTransactions>;
}
export interface GetTransactionsOptions {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    categoryIds?: string[];
    accountIds?: string[];
    tagIds?: string[];
    merchantIds?: string[];
    search?: string;
    isCredit?: boolean;
    absAmountRange?: [number?, number?];
}
export interface CreateTransactionInput {
    accountId: string;
    merchant: string;
    amount: number;
    date: string;
    categoryId?: string;
    notes?: string;
}
export interface UpdateTransactionInput {
    merchant?: string;
    merchantName?: string;
    amount?: number;
    date?: string;
    categoryId?: string;
    category?: string;
    notes?: string;
    hideFromReports?: boolean;
    isHidden?: boolean;
}
export interface TransactionSplit {
    amount: number;
    categoryId?: string;
}
export interface CreateTransactionRuleInput {
    merchantNameCriteria?: Array<{
        operator: string;
        value: string;
    }> | null;
    setCategoryAction?: string | null;
    categoryIds?: string[] | null;
    accountIds?: string[] | null;
    merchantCriteria?: any | null;
    amountCriteria?: any | null;
    originalStatementCriteria?: any | null;
    merchantCriteriaUseOriginalStatement?: boolean;
    addTagsAction?: any | null;
    splitTransactionsAction?: any | null;
    setMerchantAction?: string | null;
    linkGoalAction?: string | null;
    linkSavingsGoalAction?: string | null;
    reviewStatusAction?: string | null;
    actionSetBusinessEntity?: any | null;
    applyToExistingTransactions?: boolean;
}
export interface UpdateTransactionRuleInput {
    name?: string;
    conditions?: RuleCondition[];
    actions?: RuleAction[];
    priority?: number;
    isEnabled?: boolean;
}
export interface RuleCondition {
    field: string;
    operator: string;
    value: any;
}
export interface RuleAction {
    type: string;
    value: any;
}
export interface CreateTransactionCategoryInput {
    name: string;
    groupId: string;
    icon?: string;
    color?: string;
}
export interface UpdateTransactionCategoryInput {
    name?: string;
    icon?: string;
    color?: string;
}
export interface CreateTransactionTagInput {
    name: string;
    color: string;
}
export interface GetMerchantsOptions {
    search?: string;
    limit?: number;
}
export interface GetRecurringTransactionsOptions {
    startDate?: string;
    endDate?: string;
}
/**
 * Options for getRecurringStreams query.
 *
 * Note: `includePending` is always true in the API call (not configurable).
 * Note: `filters` is not supported by this query.
 */
export interface GetRecurringStreamsOptions {
    /** Include liability accounts in results (default: true) */
    includeLiabilities?: boolean;
}
export interface GetAggregatedRecurringItemsOptions {
    startDate: string;
    endDate: string;
    groupBy?: string;
    filters?: any;
}
export interface GetAllRecurringTransactionItemsOptions {
    filters?: any;
    includeLiabilities?: boolean;
}
export interface BulkUpdateTransactionsInput {
    transactionIds: string[];
    updates: Record<string, any>;
    excludedTransactionIds?: string[];
    allSelected?: boolean;
    filters?: any;
}
export interface GetHiddenTransactionsOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
}
export declare class TransactionsAPIImpl implements TransactionsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getTransactions(options?: GetTransactionsOptions): Promise<PaginatedTransactions>;
    getTransactionDetails(transactionId: string): Promise<TransactionDetails>;
    createTransaction(data: CreateTransactionInput): Promise<Transaction>;
    updateTransaction(transactionId: string, data: UpdateTransactionInput): Promise<Transaction>;
    deleteTransaction(transactionId: string): Promise<boolean>;
    getTransactionsSummary(): Promise<TransactionSummary>;
    getTransactionsSummaryCard(): Promise<any>;
    getTransactionSplits(transactionId: string): Promise<any>;
    updateTransactionSplits(transactionId: string, splits: TransactionSplit[]): Promise<Transaction>;
    getTransactionRules(): Promise<TransactionRule[]>;
    createTransactionRule(data: CreateTransactionRuleInput): Promise<TransactionRule>;
    updateTransactionRule(ruleId: string, data: UpdateTransactionRuleInput): Promise<TransactionRule>;
    deleteTransactionRule(ruleId: string): Promise<boolean>;
    deleteAllTransactionRules(): Promise<boolean>;
    previewTransactionRule(conditions: RuleCondition[], actions: RuleAction[]): Promise<any>;
    getTransactionCategories(): Promise<TransactionCategory[]>;
    createTransactionCategory(data: CreateTransactionCategoryInput): Promise<TransactionCategory>;
    updateTransactionCategory(categoryId: string, data: UpdateTransactionCategoryInput): Promise<TransactionCategory>;
    deleteTransactionCategory(categoryId: string): Promise<boolean>;
    getTransactionCategoryGroups(): Promise<CategoryGroup[]>;
    getCategoryDetails(categoryId: string): Promise<any>;
    getTransactionTags(): Promise<TransactionTag[]>;
    createTransactionTag(data: CreateTransactionTagInput): Promise<TransactionTag>;
    setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction>;
    getMerchants(options?: GetMerchantsOptions): Promise<Merchant[]>;
    getMerchantDetails(merchantId: string): Promise<any>;
    getEditMerchant(merchantId: string): Promise<any>;
    getRecurringTransactions(options?: GetRecurringTransactionsOptions): Promise<RecurringTransaction[]>;
    /**
     * Get recurring transaction streams (flattened).
     * Returns a flat array of stream objects for convenience.
     *
     * Note: RecurringAPI.getRecurringStreams returns `{ stream: T }[]` (wrapped),
     * while this method returns `T[]` (unwrapped) for easier consumption.
     */
    getRecurringStreams(options?: GetRecurringStreamsOptions): Promise<any[]>;
    getAggregatedRecurringItems(options: GetAggregatedRecurringItemsOptions): Promise<any>;
    getAllRecurringTransactionItems(options?: GetAllRecurringTransactionItemsOptions): Promise<any[]>;
    reviewRecurringStream(streamId: string, reviewStatus: string): Promise<any>;
    markStreamAsNotRecurring(streamId: string): Promise<boolean>;
    getRecurringMerchantSearchStatus(): Promise<any>;
    bulkUpdateTransactions(data: BulkUpdateTransactionsInput): Promise<BulkUpdateResult>;
    bulkHideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>;
    bulkUnhideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>;
    getHiddenTransactions(options?: GetHiddenTransactionsOptions): Promise<PaginatedTransactions>;
}
//# sourceMappingURL=TransactionsAPI.d.ts.map
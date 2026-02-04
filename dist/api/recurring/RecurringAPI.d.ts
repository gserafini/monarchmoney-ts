import { GraphQLClient } from '../../client/graphql';
export interface RecurringTransactionStream {
    id: string;
    reviewStatus: string;
    frequency: string;
    amount: number;
    baseDate?: string;
    dayOfTheMonth?: number;
    isApproximate: boolean;
    name: string;
    logoUrl?: string;
    recurringType: string;
    isActive: boolean;
    merchant: {
        id: string;
        name: string;
        logoUrl?: string;
    };
    creditReportLiabilityAccount?: {
        id: string;
        account: {
            id: string;
            displayName: string;
        };
    };
    category: {
        id: string;
        name: string;
    };
    account: {
        id: string;
        displayName: string;
    };
}
export interface RecurringTransactionItem {
    stream: RecurringTransactionStream;
    date: string;
    isPast: boolean;
    transactionId?: string;
    amount: number;
    amountDiff?: number;
    category: {
        id: string;
        name: string;
    };
    account: {
        id: string;
        displayName: string;
    };
}
export interface RecurringTransactionFilter {
    accounts?: string[];
    categories?: string[];
    merchants?: string[];
}
export interface RecurringRemainingDue {
    totalAmount: number;
    numItems: number;
    startDate: string;
    endDate: string;
}
export interface RecurringAPI {
    /**
     * Get all recurring transaction streams
     */
    getRecurringStreams(options?: {
        includeLiabilities?: boolean;
        includePending?: boolean;
        filters?: RecurringTransactionFilter;
    }): Promise<{
        stream: RecurringTransactionStream;
    }[]>;
    /**
     * Get upcoming recurring transaction items for a date range
     */
    getUpcomingRecurringItems(options: {
        startDate: string;
        endDate: string;
        filters?: RecurringTransactionFilter;
    }): Promise<RecurringTransactionItem[]>;
    /**
     * Get total amount remaining due for recurring items in a date range
     * Shows "How much do I still owe this month?"
     */
    getRemainingDue(options?: {
        startDate?: string;
        endDate?: string;
        includeLiabilities?: boolean;
    }): Promise<RecurringRemainingDue>;
    /**
     * Mark a recurring stream as not recurring (disable it)
     */
    markStreamAsNotRecurring(streamId: string): Promise<boolean>;
}
export declare class RecurringAPIImpl implements RecurringAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getRecurringStreams(options?: {
        includeLiabilities?: boolean;
        includePending?: boolean;
        filters?: RecurringTransactionFilter;
    }): Promise<{
        stream: RecurringTransactionStream;
    }[]>;
    getUpcomingRecurringItems(options: {
        startDate: string;
        endDate: string;
        filters?: RecurringTransactionFilter;
    }): Promise<RecurringTransactionItem[]>;
    getRemainingDue(options?: {
        startDate?: string;
        endDate?: string;
        includeLiabilities?: boolean;
    }): Promise<RecurringRemainingDue>;
    markStreamAsNotRecurring(streamId: string): Promise<boolean>;
}
//# sourceMappingURL=RecurringAPI.d.ts.map
import { GraphQLClient } from '../../client/graphql';
export interface CashflowSummary {
    sumIncome: number;
    sumExpense: number;
    savings: number;
    savingsRate: number;
}
export interface CategoryAggregate {
    groupBy: {
        category: {
            id: string;
            name: string;
            group: {
                id: string;
                type: string;
            };
        };
    };
    summary: {
        sum: number;
    };
}
export interface CategoryGroupAggregate {
    groupBy: {
        categoryGroup: {
            id: string;
            name: string;
            type: string;
        };
    };
    summary: {
        sum: number;
    };
}
export interface CashflowData {
    byCategory: CategoryAggregate[];
    byCategoryGroup: CategoryGroupAggregate[];
    summary?: {
        summary: CashflowSummary;
    };
}
export interface TransactionFilter {
    search?: string;
    categories?: string[];
    accounts?: string[];
    tags?: string[];
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
}
export interface CashflowAPI {
    /**
     * Get cashflow analysis with category and category group breakdowns
     */
    getCashflow(options?: {
        startDate?: string;
        endDate?: string;
        filters?: TransactionFilter;
    }): Promise<CashflowData>;
    /**
     * Get cashflow summary with income, expenses, savings
     */
    getCashflowSummary(options?: {
        startDate?: string;
        endDate?: string;
        filters?: TransactionFilter;
    }): Promise<CashflowSummary>;
}
export declare class CashflowAPIImpl implements CashflowAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    private getCurrentMonthDates;
    getCashflow(options?: {
        startDate?: string;
        endDate?: string;
        filters?: TransactionFilter;
    }): Promise<CashflowData>;
    getCashflowSummary(options?: {
        startDate?: string;
        endDate?: string;
        filters?: TransactionFilter;
    }): Promise<CashflowSummary>;
}
//# sourceMappingURL=CashflowAPI.d.ts.map
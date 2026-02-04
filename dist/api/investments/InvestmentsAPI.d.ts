import { GraphQLClient } from '../../client/graphql';
export interface PortfolioSummary {
    totalValue: number;
    totalCostBasis: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayChange: number;
    dayChangePercent: number;
}
export interface PortfolioHolding {
    id: string;
    account: {
        id: string;
        displayName: string;
    };
    security: {
        id: string;
        name: string;
        ticker: string;
        type: string;
        currentPrice: number;
        closingPrice: number;
        oneDayChangePercent: number;
    };
    quantity: number;
    value: number;
    costBasis: number;
    gainLoss: number;
    gainLossPercent: number;
    allocation: number;
}
export interface InvestmentAccount {
    id: string;
    displayName: string;
    institution?: {
        id: string;
        name: string;
        logo?: string;
    };
    currentBalance: number;
    type: string;
    subtype?: string;
    holdings: PortfolioHolding[];
}
export interface SecurityPerformance {
    securityId: string;
    ticker: string;
    name: string;
    performance: Array<{
        date: string;
        price: number;
        percentChange: number;
    }>;
}
export interface InvestmentsAPI {
    /**
     * Get complete portfolio overview including summary, holdings, and breakdowns.
     * Uses the Web_GetPortfolio GraphQL query.
     * @returns Portfolio data with summary, holdings list, account breakdown, and asset allocation
     */
    getPortfolio(): Promise<{
        summary: PortfolioSummary;
        holdings: PortfolioHolding[];
        byAccount: InvestmentAccount[];
        byAssetClass: Array<{
            assetClass: string;
            value: number;
            allocation: number;
        }>;
    }>;
    /**
     * Get list of investment accounts (brokerage, retirement, etc).
     * Uses the Web_GetInvestmentsAccounts GraphQL query.
     * @returns Array of investment accounts with balances and metadata
     */
    getInvestmentAccounts(): Promise<InvestmentAccount[]>;
    /**
     * Get holdings, optionally filtered by account.
     * @param accountId - Optional account ID to filter holdings
     * @returns Array of portfolio holdings
     */
    getHoldings(accountId?: string): Promise<PortfolioHolding[]>;
    /**
     * Get historical performance data for specific securities.
     * Uses the Web_GetSecuritiesHistoricalPerformance GraphQL query.
     * @param securityIds - Array of security IDs to fetch performance for (must not be empty)
     * @param startDate - Optional start date (YYYY-MM-DD), defaults to 30 days ago
     * @param endDate - Optional end date (YYYY-MM-DD), defaults to today
     * @returns Array of security performance data with historical charts
     */
    getSecurityPerformance(securityIds: string[], startDate?: string, endDate?: string): Promise<SecurityPerformance[]>;
    /**
     * Get investments dashboard card data for quick overview.
     * Uses the Web_GetInvestmentsDashboardCard GraphQL query.
     * @returns Dashboard summary with total value, day change, and top movers
     */
    getDashboardCard(): Promise<{
        totalValue: number;
        dayChange: number;
        dayChangePercent: number;
        topMovers: Array<{
            ticker: string;
            name: string;
            changePercent: number;
        }>;
    }>;
}
export declare class InvestmentsAPIImpl implements InvestmentsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getPortfolio(): Promise<{
        summary: PortfolioSummary;
        holdings: PortfolioHolding[];
        byAccount: InvestmentAccount[];
        byAssetClass: Array<{
            assetClass: string;
            value: number;
            allocation: number;
        }>;
    }>;
    getInvestmentAccounts(): Promise<InvestmentAccount[]>;
    getHoldings(accountId?: string): Promise<PortfolioHolding[]>;
    getSecurityPerformance(securityIds: string[], startDate?: string, endDate?: string): Promise<SecurityPerformance[]>;
    getDashboardCard(): Promise<{
        totalValue: number;
        dayChange: number;
        dayChangePercent: number;
        topMovers: Array<{
            ticker: string;
            name: string;
            changePercent: number;
        }>;
    }>;
}
//# sourceMappingURL=InvestmentsAPI.d.ts.map
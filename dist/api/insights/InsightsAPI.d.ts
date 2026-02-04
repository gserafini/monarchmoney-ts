import { GraphQLClient } from '../../client/graphql';
export interface AdviceItemCategory {
    name: string;
    displayName: string;
    color: string;
}
export interface AdviceItem {
    id: string;
    title: string;
    category: AdviceItemCategory;
    numTasksCompleted: number;
    numTasks: number;
    completedAt?: string;
}
export interface SpinwheelUser {
    id: string;
    spinwheelUserId?: string;
    creditScoreRefreshSubscriptionId?: string;
    creditScoreTrackingStatus?: string;
    isBillSyncTrackingEnabled?: boolean;
    onboardingStatus?: string;
    onboardingErrorMessage?: string;
    user?: {
        id: string;
        name: string;
        displayName: string;
    };
}
export interface RecapCard {
    module: string;
    title: string;
    headline: string;
    message: string;
    sentiment: string;
    metrics?: any;
    richBlocks?: any;
    titleMarkdown?: string;
    headlineMarkdown?: string;
    messageMarkdown?: string;
}
export interface WeeklyRecap {
    id: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    summary: string;
    sentiment: string;
    createdAt: string;
    updatedAt: string;
    cards: RecapCard[];
}
export interface SubscriptionDetails {
    id: string;
    paymentSource: string;
    referralCode?: string;
    isOnFreeTrial: boolean;
    hasPremiumEntitlement: boolean;
    willCancelAtPeriodEnd: boolean;
    trialEndsAt?: string;
    billingPeriod?: string;
    currentPeriodEndsAt?: string;
    nextPaymentAmount?: number;
    entitlements?: string[];
    activeSponsorship?: {
        id: string;
    };
    activePromoCode?: {
        code: string;
        description: string;
    };
}
export interface Insight {
    id: string;
    type: string;
    title: string;
    description: string;
    category: string;
    priority: number;
    actionRequired: boolean;
    createdAt: string;
    dismissedAt?: string;
    metadata?: Record<string, any>;
}
export interface NetWorthHistoryPoint {
    date: string;
    netWorth: number;
    assets: number;
    liabilities: number;
}
export interface AggregateSnapshot {
    date: string;
    balance: number;
    assets?: number;
    liabilities?: number;
}
export interface CreditScoreSnapshot {
    id: string;
    score: number;
    date: string;
    provider?: string;
    change?: number;
}
export interface AggregateData {
    groupBy: string;
    groups: Array<{
        id: string;
        name: string;
        sum: number;
        count: number;
        avg: number;
    }>;
    summary: {
        sum: number;
        count: number;
        avg: number;
    };
}
export interface CreditScore {
    score?: number;
    provider?: string;
    lastUpdated?: string;
    history?: Array<{
        date: string;
        score: number;
    }>;
    factors?: Array<{
        category: string;
        impact: string;
        description: string;
    }>;
}
export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
}
export interface InsightsAPI {
    /**
     * Get financial advice items from the dashboard
     * Uses Web_GetAdviceDashboardWidget query
     */
    getAdviceItems(group?: string): Promise<AdviceItem[]>;
    /**
     * Get Spinwheel credit score user data
     * Uses Common_GetSpinwheelCreditScoreSnapshots query
     */
    getSpinwheelUser(): Promise<SpinwheelUser | null>;
    /**
     * Get weekly financial recap
     * Uses Common_GetWeeklyRecap query
     */
    getWeeklyRecap(startDate: string, endDate: string): Promise<WeeklyRecap | null>;
    /**
     * Get subscription details
     * Uses Common_GetSubscriptionDetails query
     */
    getSubscriptionDetails(): Promise<SubscriptionDetails>;
    /**
     * Get net worth history over time
     */
    getNetWorthHistory(options?: {
        startDate?: string;
        endDate?: string;
    }): Promise<NetWorthHistoryPoint[]>;
    /**
     * Get aggregate snapshots for net worth chart
     * Uses Web_GetAggregateSnapshots query - powers the dashboard net worth chart
     */
    getAggregateSnapshots(options?: {
        startDate?: string;
        endDate?: string;
        accountType?: string | null;
        useAdaptiveGranularity?: boolean;
    }): Promise<AggregateSnapshot[]>;
    /**
     * Get credit score history snapshots
     * Uses creditScoreSnapshots query
     */
    getCreditScoreSnapshots(): Promise<CreditScoreSnapshot[]>;
    /**
     * Get aggregated transaction data with flexible grouping
     * Uses aggregates query - for spending/income analysis
     */
    getAggregates(options: {
        startDate: string;
        endDate: string;
        groupBy: ('day' | 'week' | 'month' | 'category' | 'merchant' | 'account')[];
        fillEmptyValues?: boolean;
        filters?: {
            categories?: string[];
            accounts?: string[];
            hideFromReports?: boolean;
        };
    }): Promise<AggregateData>;
    getInsights(options?: {
        startDate?: string;
        endDate?: string;
        insightTypes?: string[];
    }): Promise<Insight[]>;
    getCreditScore(options?: {
        includeHistory?: boolean;
    }): Promise<CreditScore>;
    getNotifications(): Promise<Notification[]>;
    dismissInsight(insightId: string): Promise<boolean>;
}
export declare class InsightsAPIImpl implements InsightsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    /**
     * Get financial advice items from the dashboard
     * Uses Web_GetAdviceDashboardWidget query
     * @param group - Filter group: 'objective', 'category', or 'all'
     */
    getAdviceItems(group?: string): Promise<AdviceItem[]>;
    /**
     * Get Spinwheel credit score user data
     * Uses Common_GetSpinwheelCreditScoreSnapshots query
     */
    getSpinwheelUser(): Promise<SpinwheelUser | null>;
    /**
     * Get weekly financial recap
     * Uses Common_GetWeeklyRecap query
     */
    getWeeklyRecap(startDate: string, endDate: string): Promise<WeeklyRecap | null>;
    /**
     * Get subscription details
     * Uses Common_GetSubscriptionDetails and Common_GetDecagonSubscriptionStatus
     */
    getSubscriptionDetails(): Promise<SubscriptionDetails>;
    /**
     * Get net worth history over time
     */
    getNetWorthHistory(options?: {
        startDate?: string;
        endDate?: string;
    }): Promise<NetWorthHistoryPoint[]>;
    /**
     * Get aggregate snapshots for net worth chart
     * Uses Web_GetAggregateSnapshots query - powers the dashboard net worth chart
     */
    getAggregateSnapshots(options?: {
        startDate?: string;
        endDate?: string;
        accountType?: string | null;
        useAdaptiveGranularity?: boolean;
    }): Promise<AggregateSnapshot[]>;
    /**
     * Get credit score history snapshots
     * Uses creditScoreSnapshots query
     */
    getCreditScoreSnapshots(): Promise<CreditScoreSnapshot[]>;
    /**
     * Get aggregated transaction data with flexible grouping
     * Uses aggregates query - for spending/income analysis
     */
    getAggregates(options: {
        startDate: string;
        endDate: string;
        groupBy: ('day' | 'week' | 'month' | 'category' | 'merchant' | 'account')[];
        fillEmptyValues?: boolean;
        filters?: {
            categories?: string[];
            accounts?: string[];
            hideFromReports?: boolean;
        };
    }): Promise<AggregateData>;
    /**
     * Get insights (mapped to getAdviceItems for backwards compatibility)
     */
    getInsights(_options?: {
        startDate?: string;
        endDate?: string;
        insightTypes?: string[];
    }): Promise<Insight[]>;
    /**
     * Get credit score (mapped to getSpinwheelUser for backwards compatibility)
     * Note: Actual credit score number requires Spinwheel integration/setup
     */
    getCreditScore(_options?: {
        includeHistory?: boolean;
    }): Promise<CreditScore>;
    /**
     * Get notifications (mapped to getWeeklyRecap for backwards compatibility)
     */
    getNotifications(): Promise<Notification[]>;
    /**
     * Dismiss insight - not available via API
     */
    dismissInsight(_insightId: string): Promise<boolean>;
}
//# sourceMappingURL=InsightsAPI.d.ts.map
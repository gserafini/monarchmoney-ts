import { logger } from '../../utils';
// Valid group values for adviceItems query
const VALID_ADVICE_GROUPS = ['objective', 'category', 'all'];
export class InsightsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    /**
     * Get financial advice items from the dashboard
     * Uses Web_GetAdviceDashboardWidget query
     * @param group - Filter group: 'objective', 'category', or 'all'
     */
    async getAdviceItems(group = 'objective') {
        // Validate group parameter to prevent GraphQL injection
        const validGroup = VALID_ADVICE_GROUPS.includes(group)
            ? group
            : 'objective';
        if (group !== validGroup) {
            logger.warn('Invalid advice group provided, defaulting to "objective"', { provided: group });
        }
        const query = `
      query Web_GetAdviceDashboardWidget($group: String!) {
        adviceItems(group: $group) {
          id
          title
          numTasksCompleted
          numTasks
          completedAt
          category {
            name
            displayName
            color
            __typename
          }
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.query(query, { group: validGroup });
            return result.adviceItems || [];
        }
        catch (error) {
            logger.error('Failed to get advice items:', { error });
            return [];
        }
    }
    /**
     * Get Spinwheel credit score user data
     * Uses Common_GetSpinwheelCreditScoreSnapshots query
     */
    async getSpinwheelUser() {
        const query = `
      query Common_GetSpinwheelCreditScoreSnapshots {
        spinwheelUser {
          id
          spinwheelUserId
          creditScoreRefreshSubscriptionId
          creditScoreTrackingStatus
          isBillSyncTrackingEnabled
          onboardingStatus
          onboardingErrorMessage
          user {
            id
            name
            displayName
            __typename
          }
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.query(query);
            return result.spinwheelUser;
        }
        catch (error) {
            logger.error('Failed to get spinwheel user:', { error });
            return null;
        }
    }
    /**
     * Get weekly financial recap
     * Uses Common_GetWeeklyRecap query
     */
    async getWeeklyRecap(startDate, endDate) {
        const query = `
      query Common_GetWeeklyRecap($startDate: Date!, $endDate: Date!) {
        recap(startDate: $startDate, endDate: $endDate) {
          id
          dateRangeStart
          dateRangeEnd
          summary
          sentiment
          createdAt
          updatedAt
          cards {
            module
            title
            headline
            message
            sentiment
            metrics
            richBlocks
            titleMarkdown
            headlineMarkdown
            messageMarkdown
            __typename
          }
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.query(query, { startDate, endDate });
            return result.recap;
        }
        catch (error) {
            logger.error('Failed to get weekly recap:', { error });
            return null;
        }
    }
    /**
     * Get subscription details
     * Uses Common_GetSubscriptionDetails and Common_GetDecagonSubscriptionStatus
     */
    async getSubscriptionDetails() {
        const query = `
      query Common_GetSubscriptionDetails {
        subscription {
          id
          paymentSource
          referralCode
          isOnFreeTrial
          hasPremiumEntitlement
          willCancelAtPeriodEnd
          trialEndsAt
          billingPeriod
          currentPeriodEndsAt
          nextPaymentAmount
          entitlements
          activeSponsorship {
            id
            __typename
          }
          activePromoCode {
            code
            description
            __typename
          }
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query);
        return result.subscription;
    }
    /**
     * Get net worth history over time
     */
    async getNetWorthHistory(options) {
        const endDate = options?.endDate || new Date().toISOString().split('T')[0];
        const startDate = options?.startDate ||
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const variables = { startDate, endDate };
        const query = `
      query GetNetWorthHistory($startDate: Date!, $endDate: Date!) {
        netWorthHistory(startDate: $startDate, endDate: $endDate) {
          date
          netWorth
          assets
          liabilities
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query, variables);
        return result.netWorthHistory;
    }
    /**
     * Get aggregate snapshots for net worth chart
     * Uses Web_GetAggregateSnapshots query - powers the dashboard net worth chart
     */
    async getAggregateSnapshots(options) {
        // Default to last 30 days
        const endDate = options?.endDate || null;
        const startDate = options?.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const useAdaptiveGranularity = options?.useAdaptiveGranularity ?? true;
        const query = `
      query Web_GetAggregateSnapshots($filters: AggregateSnapshotFilters) {
        aggregateSnapshots(filters: $filters) {
          date
          balance
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.query(query, {
                filters: {
                    startDate,
                    endDate,
                    accountType: options?.accountType || null,
                    useAdaptiveGranularity
                }
            });
            return (result.aggregateSnapshots || []).map(s => ({
                date: s.date,
                balance: s.balance
            }));
        }
        catch (error) {
            console.error('Failed to get aggregate snapshots:', error);
            return [];
        }
    }
    /**
     * Get credit score history snapshots
     * Uses creditScoreSnapshots query
     */
    async getCreditScoreSnapshots() {
        const query = `
      query Web_GetCreditScoreSnapshots {
        creditScoreSnapshots {
          id
          score
          date
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.query(query);
            const snapshots = result.creditScoreSnapshots || [];
            // Add change calculation
            return snapshots.map((s, i) => ({
                id: s.id,
                score: s.score,
                date: s.date,
                provider: 'Spinwheel',
                change: i < snapshots.length - 1 ? s.score - snapshots[i + 1].score : undefined
            }));
        }
        catch (error) {
            // 400 errors are expected when credit tracking isn't enabled
            // Only suppress 400 errors - log unexpected errors for debugging
            const maybeError = error;
            const status = maybeError?.status ?? maybeError?.response?.status;
            if (status !== 400) {
                logger.error('Failed to get credit score snapshots:', { error });
            }
            return [];
        }
    }
    /**
     * Get aggregated transaction data with flexible grouping
     * Uses aggregates query - for spending/income analysis
     */
    async getAggregates(options) {
        // Use aggregates query - MUST use alias like Python library
        // Note: Must match EXACTLY what works - no extra fields
        const query = `
      query Web_GetCashFlowPage($filters: TransactionFilterInput) {
        byCategory: aggregates(filters: $filters, groupBy: ["category"]) {
          groupBy {
            category {
              id
              name
            }
          }
          summary {
            sum
          }
        }
      }
    `;
        try {
            // Build filters with date range
            const filters = {
                startDate: options.startDate,
                endDate: options.endDate
            };
            const result = await this.graphql.query(query, { filters });
            const groups = (result.byCategory || []).map(r => {
                const cat = r.groupBy?.category;
                return {
                    id: cat?.id || 'unknown',
                    name: cat?.name || 'Unknown',
                    sum: r.summary?.sum || 0,
                    count: 0,
                    avg: 0
                };
            });
            const totalSum = groups.reduce((acc, g) => acc + g.sum, 0);
            const totalCount = groups.reduce((acc, g) => acc + g.count, 0);
            return {
                groupBy: options.groupBy.join(','),
                groups,
                summary: {
                    sum: totalSum,
                    count: totalCount,
                    avg: totalCount > 0 ? totalSum / totalCount : 0
                }
            };
        }
        catch (error) {
            console.error('Failed to get aggregates:', error);
            return {
                groupBy: options.groupBy.join(','),
                groups: [],
                summary: { sum: 0, count: 0, avg: 0 }
            };
        }
    }
    // ============================================================================
    // Legacy methods - mapped to new implementations for backwards compatibility
    // ============================================================================
    /**
     * Get insights (mapped to getAdviceItems for backwards compatibility)
     */
    async getInsights(_options) {
        // Map advice items to legacy Insight format
        const adviceItems = await this.getAdviceItems();
        return adviceItems.map((item) => ({
            id: item.id,
            type: item.category?.name || 'advice',
            title: item.title,
            description: `${item.numTasksCompleted}/${item.numTasks} tasks completed`,
            category: item.category?.displayName || 'General',
            priority: item.numTasks - item.numTasksCompleted,
            actionRequired: item.numTasksCompleted < item.numTasks,
            createdAt: item.completedAt || new Date().toISOString(),
            dismissedAt: item.completedAt,
            metadata: {
                numTasksCompleted: item.numTasksCompleted,
                numTasks: item.numTasks,
                categoryColor: item.category?.color
            }
        }));
    }
    /**
     * Get credit score (mapped to getSpinwheelUser for backwards compatibility)
     * Note: Actual credit score number requires Spinwheel integration/setup
     */
    async getCreditScore(_options) {
        const spinwheelUser = await this.getSpinwheelUser();
        if (!spinwheelUser) {
            return {
                score: undefined,
                provider: 'Spinwheel',
                lastUpdated: undefined,
                history: [],
                factors: []
            };
        }
        return {
            score: undefined, // Actual score requires Spinwheel setup
            provider: 'Spinwheel',
            lastUpdated: undefined,
            history: [],
            factors: [],
            // Include raw spinwheel data for debugging
            ...spinwheelUser
        };
    }
    /**
     * Get notifications (mapped to getWeeklyRecap for backwards compatibility)
     */
    async getNotifications() {
        // Get last week's recap as "notifications"
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        const recap = await this.getWeeklyRecap(startDate, endDate);
        if (!recap?.cards) {
            return [];
        }
        return recap.cards.map((card, index) => ({
            id: `recap-${recap.id}-${index}`,
            type: card.module,
            title: card.title,
            message: card.headline || card.message,
            priority: card.sentiment === 'negative' ? 'high' : 'normal',
            isRead: false,
            createdAt: recap.createdAt,
            actionUrl: undefined
        }));
    }
    /**
     * Dismiss insight - not available via API
     */
    async dismissInsight(_insightId) {
        logger.warn('dismissInsight is not available via the Monarch API');
        return false;
    }
}
//# sourceMappingURL=InsightsAPI.js.map
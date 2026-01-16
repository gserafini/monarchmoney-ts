import { GraphQLClient } from '../../client/graphql'
import { logger } from '../../utils'

// Valid group values for adviceItems query
const VALID_ADVICE_GROUPS = ['objective', 'category', 'all'] as const
type AdviceGroup = typeof VALID_ADVICE_GROUPS[number]

// Advice/Insights types (from Web_GetAdviceDashboardWidget)
export interface AdviceItemCategory {
  name: string
  displayName: string
  color: string
}

export interface AdviceItem {
  id: string
  title: string
  category: AdviceItemCategory
  numTasksCompleted: number
  numTasks: number
  completedAt?: string
}

// Credit Score types (from Common_GetSpinwheelCreditScoreSnapshots)
export interface SpinwheelUser {
  id: string
  spinwheelUserId?: string
  creditScoreRefreshSubscriptionId?: string
  creditScoreTrackingStatus?: string
  isBillSyncTrackingEnabled?: boolean
  onboardingStatus?: string
  onboardingErrorMessage?: string
  user?: {
    id: string
    name: string
    displayName: string
  }
}

// Weekly Recap types (from Common_GetWeeklyRecap)
export interface RecapCard {
  module: string
  title: string
  headline: string
  message: string
  sentiment: string
  metrics?: any
  richBlocks?: any
  titleMarkdown?: string
  headlineMarkdown?: string
  messageMarkdown?: string
}

export interface WeeklyRecap {
  id: string
  dateRangeStart: string
  dateRangeEnd: string
  summary: string
  sentiment: string
  createdAt: string
  updatedAt: string
  cards: RecapCard[]
}

// Subscription types (from Common_GetSubscriptionDetails)
export interface SubscriptionDetails {
  id: string
  paymentSource: string
  referralCode?: string
  isOnFreeTrial: boolean
  hasPremiumEntitlement: boolean
  willCancelAtPeriodEnd: boolean
  trialEndsAt?: string
  billingPeriod?: string
  currentPeriodEndsAt?: string
  nextPaymentAmount?: number
  entitlements?: string[]
  activeSponsorship?: {
    id: string
  }
  activePromoCode?: {
    code: string
    description: string
  }
}

// Legacy types for backwards compatibility
export interface Insight {
  id: string
  type: string
  title: string
  description: string
  category: string
  priority: number
  actionRequired: boolean
  createdAt: string
  dismissedAt?: string
  metadata?: Record<string, any>
}

export interface NetWorthHistoryPoint {
  date: string
  netWorth: number
  assets: number
  liabilities: number
}

// Aggregate Snapshots types (for net worth chart)
export interface AggregateSnapshot {
  date: string
  balance: number
  assets?: number
  liabilities?: number
}

// Credit Score Snapshot types
export interface CreditScoreSnapshot {
  id: string
  score: number
  date: string
  provider?: string
  change?: number
}

// Flexible Aggregates types (for spending/income analysis)
export interface AggregateData {
  groupBy: string
  groups: Array<{
    id: string
    name: string
    sum: number
    count: number
    avg: number
  }>
  summary: {
    sum: number
    count: number
    avg: number
  }
}

export interface CreditScore {
  score?: number
  provider?: string
  lastUpdated?: string
  history?: Array<{
    date: string
    score: number
  }>
  factors?: Array<{
    category: string
    impact: string
    description: string
  }>
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

export interface InsightsAPI {
  /**
   * Get financial advice items from the dashboard
   * Uses Web_GetAdviceDashboardWidget query
   */
  getAdviceItems(group?: string): Promise<AdviceItem[]>

  /**
   * Get Spinwheel credit score user data
   * Uses Common_GetSpinwheelCreditScoreSnapshots query
   */
  getSpinwheelUser(): Promise<SpinwheelUser | null>

  /**
   * Get weekly financial recap
   * Uses Common_GetWeeklyRecap query
   */
  getWeeklyRecap(startDate: string, endDate: string): Promise<WeeklyRecap | null>

  /**
   * Get subscription details
   * Uses Common_GetSubscriptionDetails query
   */
  getSubscriptionDetails(): Promise<SubscriptionDetails>

  /**
   * Get net worth history over time
   */
  getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]>

  /**
   * Get aggregate snapshots for net worth chart
   * Uses Web_GetAggregateSnapshots query - powers the dashboard net worth chart
   */
  getAggregateSnapshots(options?: {
    startDate?: string
    endDate?: string
    accountType?: string | null
    useAdaptiveGranularity?: boolean
  }): Promise<AggregateSnapshot[]>

  /**
   * Get credit score history snapshots
   * Uses creditScoreSnapshots query
   */
  getCreditScoreSnapshots(): Promise<CreditScoreSnapshot[]>

  /**
   * Get aggregated transaction data with flexible grouping
   * Uses aggregates query - for spending/income analysis
   */
  getAggregates(options: {
    startDate: string
    endDate: string
    groupBy: ('day' | 'week' | 'month' | 'category' | 'merchant' | 'account')[]
    fillEmptyValues?: boolean
    filters?: {
      categories?: string[]
      accounts?: string[]
      hideFromReports?: boolean
    }
  }): Promise<AggregateData>

  // Legacy methods mapped to new implementations
  getInsights(options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]>

  getCreditScore(options?: {
    includeHistory?: boolean
  }): Promise<CreditScore>

  getNotifications(): Promise<Notification[]>

  dismissInsight(insightId: string): Promise<boolean>
}

export class InsightsAPIImpl implements InsightsAPI {
  constructor(private graphql: GraphQLClient) {}

  /**
   * Get financial advice items from the dashboard
   * Uses Web_GetAdviceDashboardWidget query
   * @param group - Filter group: 'objective', 'category', or 'all'
   */
  async getAdviceItems(group: string = 'objective'): Promise<AdviceItem[]> {
    // Validate group parameter to prevent GraphQL injection
    const validGroup = VALID_ADVICE_GROUPS.includes(group as AdviceGroup)
      ? group
      : 'objective'

    if (group !== validGroup) {
      logger.warn('Invalid advice group provided, defaulting to "objective"', { provided: group })
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
    `

    try {
      const result = await this.graphql.query<{
        adviceItems: AdviceItem[]
      }>(query, { group: validGroup })
      return result.adviceItems || []
    } catch (error) {
      logger.error('Failed to get advice items:', { error })
      return []
    }
  }

  /**
   * Get Spinwheel credit score user data
   * Uses Common_GetSpinwheelCreditScoreSnapshots query
   */
  async getSpinwheelUser(): Promise<SpinwheelUser | null> {
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
    `

    try {
      const result = await this.graphql.query<{
        spinwheelUser: SpinwheelUser
      }>(query)
      return result.spinwheelUser
    } catch (error) {
      logger.error('Failed to get spinwheel user:', { error })
      return null
    }
  }

  /**
   * Get weekly financial recap
   * Uses Common_GetWeeklyRecap query
   */
  async getWeeklyRecap(startDate: string, endDate: string): Promise<WeeklyRecap | null> {
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
    `

    try {
      const result = await this.graphql.query<{
        recap: WeeklyRecap
      }>(query, { startDate, endDate })
      return result.recap
    } catch (error) {
      logger.error('Failed to get weekly recap:', { error })
      return null
    }
  }

  /**
   * Get subscription details
   * Uses Common_GetSubscriptionDetails and Common_GetDecagonSubscriptionStatus
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails> {
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
    `

    const result = await this.graphql.query<{
      subscription: SubscriptionDetails
    }>(query)

    return result.subscription
  }

  /**
   * Get net worth history over time
   */
  async getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]> {
    const endDate = options?.endDate || new Date().toISOString().split('T')[0]
    const startDate =
      options?.startDate ||
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const variables = { startDate, endDate }

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
    `

    const result = await this.graphql.query<{
      netWorthHistory: NetWorthHistoryPoint[]
    }>(query, variables)

    return result.netWorthHistory
  }

  /**
   * Get aggregate snapshots for net worth chart
   * Uses Web_GetAggregateSnapshots query - powers the dashboard net worth chart
   */
  async getAggregateSnapshots(options?: {
    startDate?: string
    endDate?: string
    accountType?: string | null
    useAdaptiveGranularity?: boolean
  }): Promise<AggregateSnapshot[]> {
    // Default to last 30 days
    const endDate = options?.endDate || null
    const startDate = options?.startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const useAdaptiveGranularity = options?.useAdaptiveGranularity ?? true

    const query = `
      query Web_GetAggregateSnapshots($filters: AggregateSnapshotFilters) {
        aggregateSnapshots(filters: $filters) {
          date
          balance
          __typename
        }
      }
    `

    try {
      const result = await this.graphql.query<{
        aggregateSnapshots: Array<{ date: string; balance: number }>
      }>(query, {
        filters: {
          startDate,
          endDate,
          accountType: options?.accountType || null,
          useAdaptiveGranularity
        }
      })

      return (result.aggregateSnapshots || []).map(s => ({
        date: s.date,
        balance: s.balance
      }))
    } catch (error) {
      console.error('Failed to get aggregate snapshots:', error)
      return []
    }
  }

  /**
   * Get credit score history snapshots
   * Uses creditScoreSnapshots query
   */
  async getCreditScoreSnapshots(): Promise<CreditScoreSnapshot[]> {
    const query = `
      query Web_GetCreditScoreSnapshots {
        creditScoreSnapshots {
          id
          score
          date
          __typename
        }
      }
    `

    try {
      const result = await this.graphql.query<{
        creditScoreSnapshots: Array<{
          id: string
          score: number
          date: string
        }>
      }>(query)

      const snapshots = result.creditScoreSnapshots || []

      // Add change calculation
      return snapshots.map((s, i) => ({
        id: s.id,
        score: s.score,
        date: s.date,
        provider: 'Spinwheel',
        change: i < snapshots.length - 1 ? s.score - snapshots[i + 1].score : undefined
      }))
    } catch {
      // 400 errors are expected when credit tracking isn't enabled
      // Don't log - this is normal for users without credit tracking setup
      return []
    }
  }

  /**
   * Get aggregated transaction data with flexible grouping
   * Uses aggregates query - for spending/income analysis
   */
  async getAggregates(options: {
    startDate: string
    endDate: string
    groupBy: ('day' | 'week' | 'month' | 'category' | 'merchant' | 'account')[]
    fillEmptyValues?: boolean
    filters?: {
      categories?: string[]
      accounts?: string[]
      hideFromReports?: boolean
    }
  }): Promise<AggregateData> {
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
    `

    try {
      // Build filters with date range
      const filters: Record<string, any> = {
        startDate: options.startDate,
        endDate: options.endDate
      }

      const result = await this.graphql.query<{
        byCategory: Array<{
          groupBy: {
            category?: { id: string; name: string }
          }
          summary: {
            sum: number
          }
        }>
      }>(query, { filters })

      const groups = (result.byCategory || []).map(r => {
        const cat = r.groupBy?.category
        return {
          id: cat?.id || 'unknown',
          name: cat?.name || 'Unknown',
          sum: r.summary?.sum || 0,
          count: 0,
          avg: 0
        }
      })

      const totalSum = groups.reduce((acc, g) => acc + g.sum, 0)
      const totalCount = groups.reduce((acc, g) => acc + g.count, 0)

      return {
        groupBy: options.groupBy.join(','),
        groups,
        summary: {
          sum: totalSum,
          count: totalCount,
          avg: totalCount > 0 ? totalSum / totalCount : 0
        }
      }
    } catch (error) {
      console.error('Failed to get aggregates:', error)
      return {
        groupBy: options.groupBy.join(','),
        groups: [],
        summary: { sum: 0, count: 0, avg: 0 }
      }
    }
  }

  // ============================================================================
  // Legacy methods - mapped to new implementations for backwards compatibility
  // ============================================================================

  /**
   * Get insights (mapped to getAdviceItems for backwards compatibility)
   */
  async getInsights(_options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]> {
    // Map advice items to legacy Insight format
    const adviceItems = await this.getAdviceItems()

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
    }))
  }

  /**
   * Get credit score (mapped to getSpinwheelUser for backwards compatibility)
   * Note: Actual credit score number requires Spinwheel integration/setup
   */
  async getCreditScore(_options?: { includeHistory?: boolean }): Promise<CreditScore> {
    const spinwheelUser = await this.getSpinwheelUser()

    if (!spinwheelUser) {
      return {
        score: undefined,
        provider: 'Spinwheel',
        lastUpdated: undefined,
        history: [],
        factors: []
      }
    }

    return {
      score: undefined, // Actual score requires Spinwheel setup
      provider: 'Spinwheel',
      lastUpdated: undefined,
      history: [],
      factors: [],
      // Include raw spinwheel data for debugging
      ...(spinwheelUser as any)
    }
  }

  /**
   * Get notifications (mapped to getWeeklyRecap for backwards compatibility)
   */
  async getNotifications(): Promise<Notification[]> {
    // Get last week's recap as "notifications"
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const recap = await this.getWeeklyRecap(startDate, endDate)

    if (!recap?.cards) {
      return []
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
    }))
  }

  /**
   * Dismiss insight - not available via API
   */
  async dismissInsight(_insightId: string): Promise<boolean> {
    logger.warn('dismissInsight is not available via the Monarch API')
    return false
  }
}

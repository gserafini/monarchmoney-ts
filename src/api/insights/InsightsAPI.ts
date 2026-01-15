import { GraphQLClient } from '../../client/graphql'

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
   */
  async getAdviceItems(group: string = 'objective'): Promise<AdviceItem[]> {
    const query = `
      query Web_GetAdviceDashboardWidget {
        adviceItems(group: "${group}") {
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
      }>(query)
      return result.adviceItems || []
    } catch (error) {
      console.error('Failed to get advice items:', error)
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
      console.error('Failed to get spinwheel user:', error)
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
      console.error('Failed to get weekly recap:', error)
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
    console.warn('dismissInsight is not available via the Monarch API')
    return false
  }
}

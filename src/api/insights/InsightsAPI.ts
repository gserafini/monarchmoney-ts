import { GraphQLClient } from '../../client/graphql'

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

export interface SubscriptionDetails {
  planType: string
  status: string
  billingCycle: string
  nextBillingDate?: string
  price: number
  features: string[]
}

export interface InsightsAPI {
  /**
   * @deprecated This method uses a broken GraphQL query that doesn't exist in the Monarch API.
   * The 'insights' endpoint is not available via the public GraphQL schema.
   */
  getInsights(options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]>

  /**
   * Get net worth history over time
   */
  getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]>

  /**
   * @deprecated This method uses a broken GraphQL query.
   * The 'spinwheelCreditScoreSnapshots' endpoint is not available via the public GraphQL schema.
   */
  getCreditScore(options?: {
    includeHistory?: boolean
  }): Promise<CreditScore>

  /**
   * @deprecated This method uses a broken GraphQL query.
   * The 'notifications' endpoint is not available via the public GraphQL schema.
   */
  getNotifications(): Promise<Notification[]>

  /**
   * @deprecated This method uses a broken GraphQL query.
   * The 'subscriptionDetails' endpoint is not available via the public GraphQL schema.
   */
  getSubscriptionDetails(): Promise<SubscriptionDetails>

  /**
   * @deprecated This method uses a broken GraphQL mutation.
   * The 'dismissInsight' endpoint is not available via the public GraphQL schema.
   */
  dismissInsight(insightId: string): Promise<boolean>
}

export class InsightsAPIImpl implements InsightsAPI {
  constructor(private graphql: GraphQLClient) {}

  /**
   * @deprecated This method uses a broken GraphQL query that doesn't exist in the Monarch API.
   * The 'insights' endpoint is not available via the public GraphQL schema.
   */
  async getInsights(_options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]> {
    throw new Error(
      'InsightsAPI.getInsights() is deprecated. ' +
        'The "insights" GraphQL query does not exist in the Monarch API schema. ' +
        'This feature is not currently available via the API.'
    )
  }

  async getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]> {
    // Default to last 12 months if no dates provided
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
   * @deprecated This method uses a broken GraphQL query.
   * The 'spinwheelCreditScoreSnapshots' endpoint is not available via the public GraphQL schema.
   */
  async getCreditScore(_options?: { includeHistory?: boolean }): Promise<CreditScore> {
    throw new Error(
      'InsightsAPI.getCreditScore() is deprecated. ' +
        'The "spinwheelCreditScoreSnapshots" GraphQL query does not exist in the Monarch API schema. ' +
        'This feature is not currently available via the API.'
    )
  }

  /**
   * @deprecated This method uses a broken GraphQL query.
   * The 'notifications' endpoint is not available via the public GraphQL schema.
   */
  async getNotifications(): Promise<Notification[]> {
    throw new Error(
      'InsightsAPI.getNotifications() is deprecated. ' +
        'The "notifications" GraphQL query does not exist in the Monarch API schema. ' +
        'This feature is not currently available via the API.'
    )
  }

  /**
   * @deprecated This method uses a broken GraphQL query.
   * The 'subscriptionDetails' endpoint is not available via the public GraphQL schema.
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails> {
    throw new Error(
      'InsightsAPI.getSubscriptionDetails() is deprecated. ' +
        'The "subscriptionDetails" GraphQL query does not exist in the Monarch API schema. ' +
        'This feature is not currently available via the API.'
    )
  }

  /**
   * @deprecated This method uses a broken GraphQL mutation.
   * The 'dismissInsight' endpoint is not available via the public GraphQL schema.
   */
  async dismissInsight(_insightId: string): Promise<boolean> {
    throw new Error(
      'InsightsAPI.dismissInsight() is deprecated. ' +
        'The "dismissInsight" GraphQL mutation does not exist in the Monarch API schema. ' +
        'This feature is not currently available via the API.'
    )
  }
}

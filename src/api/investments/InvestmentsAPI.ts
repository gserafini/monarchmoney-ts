import { GraphQLClient } from '../../client/graphql'
import { logger, validateDateRange } from '../../utils'

// Portfolio response types
export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalGainLoss: number
  totalGainLossPercent: number
  dayChange: number
  dayChangePercent: number
}

export interface PortfolioHolding {
  id: string
  account: {
    id: string
    displayName: string
  }
  security: {
    id: string
    name: string
    ticker: string
    type: string
    currentPrice: number
    closingPrice: number
    oneDayChangePercent: number
  }
  quantity: number
  value: number
  costBasis: number
  gainLoss: number
  gainLossPercent: number
  allocation: number
}

export interface InvestmentAccount {
  id: string
  displayName: string
  institution?: {
    id: string
    name: string
    logo?: string
  }
  currentBalance: number
  type: string
  subtype?: string
  holdings: PortfolioHolding[]
}

export interface SecurityPerformance {
  securityId: string
  ticker: string
  name: string
  performance: Array<{
    date: string
    price: number
    percentChange: number
  }>
}

export interface InvestmentsAPI {
  /**
   * Get complete portfolio overview including summary, holdings, and breakdowns.
   * Uses the Web_GetPortfolio GraphQL query.
   * @returns Portfolio data with summary, holdings list, account breakdown, and asset allocation
   */
  getPortfolio(): Promise<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
    byAccount: InvestmentAccount[]
    byAssetClass: Array<{ assetClass: string; value: number; allocation: number }>
  }>

  /**
   * Get list of investment accounts (brokerage, retirement, etc).
   * Uses the Web_GetInvestmentsAccounts GraphQL query.
   * @returns Array of investment accounts with balances and metadata
   */
  getInvestmentAccounts(): Promise<InvestmentAccount[]>

  /**
   * Get holdings, optionally filtered by account.
   * @param accountId - Optional account ID to filter holdings
   * @returns Array of portfolio holdings
   */
  getHoldings(accountId?: string): Promise<PortfolioHolding[]>

  /**
   * Get historical performance data for specific securities.
   * Uses the Web_GetSecuritiesHistoricalPerformance GraphQL query.
   * @param securityIds - Array of security IDs to fetch performance for (must not be empty)
   * @param startDate - Optional start date (YYYY-MM-DD), defaults to 30 days ago
   * @param endDate - Optional end date (YYYY-MM-DD), defaults to today
   * @returns Array of security performance data with historical charts
   */
  getSecurityPerformance(securityIds: string[], startDate?: string, endDate?: string): Promise<SecurityPerformance[]>

  /**
   * Get investments dashboard card data for quick overview.
   * Uses the Web_GetInvestmentsDashboardCard GraphQL query.
   * @returns Dashboard summary with total value, day change, and top movers
   */
  getDashboardCard(): Promise<{
    totalValue: number
    dayChange: number
    dayChangePercent: number
    topMovers: Array<{ ticker: string; name: string; changePercent: number }>
  }>
}

export class InvestmentsAPIImpl implements InvestmentsAPI {
  constructor(private graphql: GraphQLClient) {}

  async getPortfolio(): Promise<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
    byAccount: InvestmentAccount[]
    byAssetClass: Array<{ assetClass: string; value: number; allocation: number }>
  }> {
    logger.debug('Fetching portfolio')

    try {
      const response = await this.graphql.query<{
        portfolio: {
          performance: {
            totalValue: number
            totalBasis: number
            totalChangePercent: number
            totalChangeDollars: number
            oneDayChangePercent: number
            historicalChart: Array<{ date: string; returnPercent: number }>
            benchmarks: Array<{
              security: { id: string; ticker: string; name: string; oneDayChangePercent: number }
              historicalChart: Array<{ date: string; returnPercent: number }>
            }>
          }
          aggregateHoldings: {
            edges: Array<{
              node: {
                id: string
                quantity: number
                basis: number
                totalValue: number
                securityPriceChangeDollars: number
                securityPriceChangePercent: number
                lastSyncedAt: string
                holdings: Array<{
                  id: string
                  type: string
                  typeDisplay: string
                  name: string
                  ticker: string
                  closingPrice: number
                  closingPriceUpdatedAt: string
                  quantity: number
                  value: number
                  account: {
                    id: string
                    mask: string
                    icon: string
                    logoUrl: string
                    institution: { id: string; name: string }
                    type: { name: string; display: string }
                    subtype: { name: string; display: string }
                    displayName: string
                    currentBalance: number
                  }
                  taxLots: Array<{
                    id: string
                    createdAt: string
                    acquisitionDate: string
                    acquisitionQuantity: number
                    costBasisPerUnit: number
                  }>
                }>
                security: {
                  id: string
                  name: string
                  ticker: string
                  currentPrice: number
                  currentPriceUpdatedAt: string
                  closingPrice: number
                  type: string
                  typeDisplay: string
                }
              }
            }>
          }
        }
      }>(
        `query Web_GetPortfolio($portfolioInput: PortfolioInput) {
          portfolio(input: $portfolioInput) {
            performance {
              totalValue
              totalBasis
              totalChangePercent
              totalChangeDollars
              oneDayChangePercent
              historicalChart {
                date
                returnPercent
              }
              benchmarks {
                security {
                  id
                  ticker
                  name
                  oneDayChangePercent
                }
                historicalChart {
                  date
                  returnPercent
                }
              }
            }
            aggregateHoldings {
              edges {
                node {
                  id
                  quantity
                  basis
                  totalValue
                  securityPriceChangeDollars
                  securityPriceChangePercent
                  lastSyncedAt
                  holdings {
                    id
                    type
                    typeDisplay
                    name
                    ticker
                    closingPrice
                    closingPriceUpdatedAt
                    quantity
                    value
                    account {
                      id
                      mask
                      icon
                      logoUrl
                      institution {
                        id
                        name
                      }
                      type {
                        name
                        display
                      }
                      subtype {
                        name
                        display
                      }
                      displayName
                      currentBalance
                    }
                    taxLots {
                      id
                      createdAt
                      acquisitionDate
                      acquisitionQuantity
                      costBasisPerUnit
                    }
                  }
                  security {
                    id
                    name
                    ticker
                    currentPrice
                    currentPriceUpdatedAt
                    closingPrice
                    type
                    typeDisplay
                  }
                }
              }
            }
          }
        }`,
        { portfolioInput: {} },
        { cache: true, cacheTTL: 60000 }
      )

      const perf = response.portfolio?.performance
      const holdings = response.portfolio?.aggregateHoldings?.edges ?? []

      // Transform holdings to our interface format
      const transformedHoldings: PortfolioHolding[] = holdings.map((edge: any) => {
        const node = edge.node
        return {
          id: node.id,
          account: node.holdings?.[0]?.account ?? { id: '', displayName: '' },
          security: {
            id: node.security?.id ?? '',
            name: node.security?.name ?? '',
            ticker: node.security?.ticker ?? '',
            type: node.security?.type ?? '',
            currentPrice: node.security?.currentPrice ?? 0,
            closingPrice: node.security?.closingPrice ?? 0,
            oneDayChangePercent: node.securityPriceChangePercent ?? 0,
          },
          quantity: node.quantity ?? 0,
          value: node.totalValue ?? 0,
          costBasis: node.basis ?? 0,
          gainLoss: node.securityPriceChangeDollars ?? 0,
          gainLossPercent: node.securityPriceChangePercent ?? 0,
          allocation: 0, // Would need to calculate
        }
      })

      // Group holdings by account
      const accountMap = new Map<string, InvestmentAccount>()
      for (const holding of transformedHoldings) {
        const acctId = holding.account.id
        if (!accountMap.has(acctId)) {
          accountMap.set(acctId, {
            id: acctId,
            displayName: holding.account.displayName,
            currentBalance: 0,
            type: 'investment',
            holdings: [],
          })
        }
        const acct = accountMap.get(acctId)!
        acct.holdings.push(holding)
        acct.currentBalance += holding.value
      }

      return {
        summary: {
          totalValue: perf?.totalValue ?? 0,
          totalCostBasis: perf?.totalBasis ?? 0,
          totalGainLoss: perf?.totalChangeDollars ?? 0,
          totalGainLossPercent: perf?.totalChangePercent ?? 0,
          dayChange: 0, // Not directly in response, would need calculation
          dayChangePercent: perf?.oneDayChangePercent ?? 0,
        },
        holdings: transformedHoldings,
        byAccount: Array.from(accountMap.values()),
        byAssetClass: [], // Would need Web_GetAllocation query
      }
    } catch (error) {
      logger.error('Failed to fetch portfolio', error)
      throw error
    }
  }

  async getInvestmentAccounts(): Promise<InvestmentAccount[]> {
    logger.debug('Fetching investment accounts')

    try {
      const response = await this.graphql.query<{
        accounts: Array<{
          id: string
          displayName: string
          type: { name: string; display: string }
          subtype?: { name: string; display: string }
          currentBalance: number
          institution?: { id: string; name: string; logo?: string }
        }>
      }>(
        `query Web_GetInvestmentsAccounts {
          accounts(filters: { accountType: ["brokerage", "depository", "investment", "retirement"] }) {
            id
            displayName
            type {
              name
              display
            }
            subtype {
              name
              display
            }
            currentBalance
            institution {
              id
              name
              logo
            }
          }
        }`,
        {},
        { cache: true, cacheTTL: 300000 }
      )

      return (response.accounts ?? []).map(acct => ({
        id: acct.id,
        displayName: acct.displayName,
        type: acct.type?.name ?? 'investment',
        subtype: acct.subtype?.name,
        currentBalance: acct.currentBalance ?? 0,
        institution: acct.institution,
        holdings: [],
      }))
    } catch (error) {
      logger.error('Failed to fetch investment accounts', error)
      throw error
    }
  }

  async getHoldings(accountId?: string): Promise<PortfolioHolding[]> {
    logger.debug('Fetching holdings', { accountId })

    try {
      const portfolio = await this.getPortfolio()

      if (accountId) {
        return portfolio.holdings.filter(h => h.account.id === accountId)
      }

      return portfolio.holdings
    } catch (error) {
      logger.error('Failed to fetch holdings', error)
      throw error
    }
  }

  async getSecurityPerformance(
    securityIds: string[],
    startDate?: string,
    endDate?: string
  ): Promise<SecurityPerformance[]> {
    // Validate securityIds - filter invalid values and return early if empty
    const validSecurityIds = Array.isArray(securityIds)
      ? securityIds.filter(id => typeof id === 'string' && id.trim().length > 0)
      : []

    if (validSecurityIds.length === 0) {
      logger.warn('getSecurityPerformance called with no valid securityIds', {
        securityIds,
        startDate,
        endDate,
      })
      return []
    }

    validateDateRange(startDate, endDate)
    logger.debug('Fetching security performance', { securityIds: validSecurityIds, startDate, endDate })

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const response = await this.graphql.query<{
        securityHistoricalPerformance: Array<{
          security: { id: string }
          historicalChart: Array<{
            date: string
            returnPercent: number
          }>
        }>
      }>(
        `query Web_GetSecuritiesHistoricalPerformance($input: SecurityHistoricalPerformanceInput!) {
          securityHistoricalPerformance(input: $input) {
            security {
              id
            }
            historicalChart {
              date
              returnPercent
            }
          }
        }`,
        {
          input: {
            securityIds: validSecurityIds,
            startDate: start,
            endDate: end
          }
        },
        { cache: true, cacheTTL: 300000 }
      )

      return (response.securityHistoricalPerformance ?? []).map(perf => ({
        securityId: perf.security?.id ?? '',
        ticker: '', // Not returned in this query
        name: '', // Not returned in this query
        performance: (perf.historicalChart ?? []).map(h => ({
          date: h.date,
          price: 0, // Not returned, only returnPercent
          percentChange: h.returnPercent,
        })),
      }))
    } catch (error) {
      logger.error('Failed to fetch security performance', error)
      throw error
    }
  }

  async getDashboardCard(): Promise<{
    totalValue: number
    dayChange: number
    dayChangePercent: number
    topMovers: Array<{ ticker: string; name: string; changePercent: number }>
  }> {
    logger.debug('Fetching investments dashboard card')

    try {
      const response = await this.graphql.query<{
        investmentsDashboard: {
          totalValue: number
          dayChange: number
          dayChangePercent: number
          topMovers: Array<{
            security: { ticker: string; name: string }
            oneDayChangePercent: number
          }>
        }
      }>(
        `query Web_GetInvestmentsDashboardCard {
          investmentsDashboard {
            totalValue
            dayChange
            dayChangePercent
            topMovers {
              security {
                ticker
                name
              }
              oneDayChangePercent
            }
          }
        }`,
        {},
        { cache: true, cacheTTL: 60000 }
      )

      const dashboard = response.investmentsDashboard

      return {
        totalValue: dashboard?.totalValue ?? 0,
        dayChange: dashboard?.dayChange ?? 0,
        dayChangePercent: dashboard?.dayChangePercent ?? 0,
        topMovers: (dashboard?.topMovers ?? []).map(m => ({
          ticker: m.security.ticker,
          name: m.security.name,
          changePercent: m.oneDayChangePercent,
        })),
      }
    } catch (error) {
      logger.error('Failed to fetch investments dashboard', error)
      throw error
    }
  }
}

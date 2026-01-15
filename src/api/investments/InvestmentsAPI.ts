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
  // Portfolio overview
  getPortfolio(): Promise<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
    byAccount: InvestmentAccount[]
    byAssetClass: Array<{ assetClass: string; value: number; allocation: number }>
  }>

  // Investment accounts
  getInvestmentAccounts(): Promise<InvestmentAccount[]>

  // Holdings
  getHoldings(accountId?: string): Promise<PortfolioHolding[]>

  // Security performance history
  getSecurityPerformance(securityIds: string[], startDate?: string, endDate?: string): Promise<SecurityPerformance[]>

  // Dashboard card data
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
          aggregateHoldings: {
            totalValue: number
            totalCostBasis: number
            totalGainLoss: number
            totalGainLossPercent: number
            dayChange: number
            dayChangePercent: number
            holdings: Array<{
              id: string
              account: { id: string; displayName: string }
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
            }>
            byAccount: Array<{
              account: { id: string; displayName: string }
              totalValue: number
              holdings: Array<any>
            }>
            byAssetClass: Array<{
              assetClass: string
              value: number
              allocation: number
            }>
          }
        }
      }>(
        `query Web_GetPortfolio {
          portfolio {
            aggregateHoldings {
              totalValue
              totalCostBasis
              totalGainLoss
              totalGainLossPercent
              dayChange
              dayChangePercent
              holdings {
                id
                account {
                  id
                  displayName
                }
                security {
                  id
                  name
                  ticker
                  type
                  currentPrice
                  closingPrice
                  oneDayChangePercent
                }
                quantity
                value
                costBasis
                gainLoss
                gainLossPercent
                allocation
              }
              byAccount {
                account {
                  id
                  displayName
                }
                totalValue
                holdings {
                  id
                  security {
                    id
                    name
                    ticker
                  }
                  value
                  allocation
                }
              }
              byAssetClass {
                assetClass
                value
                allocation
              }
            }
          }
        }`,
        {},
        { cache: true, cacheTTL: 60000 }
      )

      const agg = response.portfolio?.aggregateHoldings

      return {
        summary: {
          totalValue: agg?.totalValue ?? 0,
          totalCostBasis: agg?.totalCostBasis ?? 0,
          totalGainLoss: agg?.totalGainLoss ?? 0,
          totalGainLossPercent: agg?.totalGainLossPercent ?? 0,
          dayChange: agg?.dayChange ?? 0,
          dayChangePercent: agg?.dayChangePercent ?? 0,
        },
        holdings: agg?.holdings ?? [],
        byAccount: (agg?.byAccount ?? []).map((ba: any) => ({
          id: ba.account.id,
          displayName: ba.account.displayName,
          currentBalance: ba.totalValue,
          type: 'investment',
          holdings: ba.holdings,
        })),
        byAssetClass: agg?.byAssetClass ?? [],
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
    validateDateRange(startDate, endDate)
    logger.debug('Fetching security performance', { securityIds, startDate, endDate })

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const response = await this.graphql.query<{
        securities: Array<{
          id: string
          ticker: string
          name: string
          historicalPerformance: Array<{
            date: string
            price: number
            percentChange: number
          }>
        }>
      }>(
        `query Web_GetSecuritiesHistoricalPerformance($securityIds: [ID!]!, $startDate: Date!, $endDate: Date!) {
          securities(ids: $securityIds) {
            id
            ticker
            name
            historicalPerformance(startDate: $startDate, endDate: $endDate) {
              date
              price
              percentChange
            }
          }
        }`,
        { securityIds, startDate: start, endDate: end },
        { cache: true, cacheTTL: 300000 }
      )

      return (response.securities ?? []).map(sec => ({
        securityId: sec.id,
        ticker: sec.ticker,
        name: sec.name,
        performance: sec.historicalPerformance ?? [],
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

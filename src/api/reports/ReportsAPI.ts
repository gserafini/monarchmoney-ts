import { GraphQLClient } from '../../client/graphql'
import { logger, validateDateRange } from '../../utils'

// Report types
export interface ReportConfiguration {
  id: string
  name: string
  type: 'spending' | 'income' | 'net_worth' | 'cashflow' | 'custom'
  dateRange: {
    startDate: string
    endDate: string
    preset?: string // 'this_month', 'last_month', 'this_year', etc.
  }
  filters?: {
    accounts?: string[]
    categories?: string[]
    tags?: string[]
  }
  groupBy?: 'category' | 'merchant' | 'account' | 'month' | 'week'
  includeSubcategories?: boolean
}

export interface ReportData {
  id: string
  name: string
  type: string
  dateRange: {
    startDate: string
    endDate: string
  }
  summary: {
    total: number
    average: number
    count: number
  }
  breakdown: Array<{
    label: string
    value: number
    percentage: number
    count: number
  }>
  timeSeries?: Array<{
    date: string
    value: number
  }>
}

export interface TransactionExportSession {
  sessionId: string
  downloadUrl: string
  expiresAt: string
  format: 'csv' | 'xlsx'
  filters?: {
    startDate?: string
    endDate?: string
    accounts?: string[]
    categories?: string[]
  }
}

export interface ReportsAPI {
  // Report configurations
  getReportConfigurations(): Promise<ReportConfiguration[]>
  getReportConfiguration(reportId: string): Promise<ReportConfiguration | null>

  // Generate reports
  generateReport(config: Partial<ReportConfiguration>): Promise<ReportData>

  // Spending reports
  getSpendingReport(startDate: string, endDate: string, options?: {
    groupBy?: 'category' | 'merchant' | 'account'
    accountIds?: string[]
    categoryIds?: string[]
  }): Promise<ReportData>

  // Income reports
  getIncomeReport(startDate: string, endDate: string, options?: {
    groupBy?: 'category' | 'merchant' | 'account'
    accountIds?: string[]
  }): Promise<ReportData>

  // Transaction export
  createTransactionExport(options: {
    startDate?: string
    endDate?: string
    accountIds?: string[]
    categoryIds?: string[]
    format?: 'csv' | 'xlsx'
  }): Promise<TransactionExportSession>

  getExportStatus(sessionId: string): Promise<{
    status: 'pending' | 'ready' | 'expired' | 'error'
    downloadUrl?: string
    error?: string
  }>
}

export class ReportsAPIImpl implements ReportsAPI {
  constructor(private graphql: GraphQLClient) {}

  async getReportConfigurations(): Promise<ReportConfiguration[]> {
    logger.debug('Fetching report configurations')

    try {
      const response = await this.graphql.query<{
        reportConfigurations: Array<{
          id: string
          name: string
          type: string
          startDate: string
          endDate: string
          datePreset: string
          filters: {
            accountIds?: string[]
            categoryIds?: string[]
            tagIds?: string[]
          }
          groupBy: string
          includeSubcategories: boolean
        }>
      }>(
        `query Web_GetReportConfigurations {
          reportConfigurations {
            id
            name
            type
            startDate
            endDate
            datePreset
            filters {
              accountIds
              categoryIds
              tagIds
            }
            groupBy
            includeSubcategories
          }
        }`,
        {},
        { cache: true, cacheTTL: 300000 }
      )

      return (response.reportConfigurations ?? []).map(config => ({
        id: config.id,
        name: config.name,
        type: config.type as ReportConfiguration['type'],
        dateRange: {
          startDate: config.startDate,
          endDate: config.endDate,
          preset: config.datePreset,
        },
        filters: {
          accounts: config.filters?.accountIds,
          categories: config.filters?.categoryIds,
          tags: config.filters?.tagIds,
        },
        groupBy: config.groupBy as ReportConfiguration['groupBy'],
        includeSubcategories: config.includeSubcategories,
      }))
    } catch (error) {
      logger.error('Failed to fetch report configurations', error)
      throw error
    }
  }

  async getReportConfiguration(reportId: string): Promise<ReportConfiguration | null> {
    const configs = await this.getReportConfigurations()
    return configs.find(c => c.id === reportId) || null
  }

  async generateReport(config: Partial<ReportConfiguration>): Promise<ReportData> {
    logger.debug('Generating report', { config })

    const startDate = config.dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = config.dateRange?.endDate || new Date().toISOString().split('T')[0]

    try {
      const response = await this.graphql.query<{
        reportsData: {
          summary: {
            total: number
            average: number
            transactionCount: number
          }
          breakdown: Array<{
            name: string
            amount: number
            percentage: number
            count: number
          }>
          timeSeries: Array<{
            date: string
            amount: number
          }>
        }
      }>(
        `query Common_GetReportsData(
          $startDate: Date!
          $endDate: Date!
          $type: String
          $groupBy: String
          $accountIds: [ID]
          $categoryIds: [ID]
        ) {
          reportsData(
            startDate: $startDate
            endDate: $endDate
            type: $type
            groupBy: $groupBy
            accountIds: $accountIds
            categoryIds: $categoryIds
          ) {
            summary {
              total
              average
              transactionCount
            }
            breakdown {
              name
              amount
              percentage
              count
            }
            timeSeries {
              date
              amount
            }
          }
        }`,
        {
          startDate,
          endDate,
          type: config.type || 'spending',
          groupBy: config.groupBy || 'category',
          accountIds: config.filters?.accounts,
          categoryIds: config.filters?.categories,
        }
      )

      const data = response.reportsData

      return {
        id: `report-${Date.now()}`,
        name: config.name || 'Custom Report',
        type: config.type || 'spending',
        dateRange: { startDate, endDate },
        summary: {
          total: data?.summary?.total ?? 0,
          average: data?.summary?.average ?? 0,
          count: data?.summary?.transactionCount ?? 0,
        },
        breakdown: (data?.breakdown ?? []).map(b => ({
          label: b.name,
          value: b.amount,
          percentage: b.percentage,
          count: b.count,
        })),
        timeSeries: data?.timeSeries?.map(ts => ({
          date: ts.date,
          value: ts.amount,
        })),
      }
    } catch (error) {
      logger.error('Failed to generate report', error)
      throw error
    }
  }

  async getSpendingReport(startDate: string, endDate: string, options?: {
    groupBy?: 'category' | 'merchant' | 'account'
    accountIds?: string[]
    categoryIds?: string[]
  }): Promise<ReportData> {
    validateDateRange(startDate, endDate)

    return this.generateReport({
      type: 'spending',
      dateRange: { startDate, endDate },
      groupBy: options?.groupBy || 'category',
      filters: {
        accounts: options?.accountIds,
        categories: options?.categoryIds,
      },
    })
  }

  async getIncomeReport(startDate: string, endDate: string, options?: {
    groupBy?: 'category' | 'merchant' | 'account'
    accountIds?: string[]
  }): Promise<ReportData> {
    validateDateRange(startDate, endDate)

    return this.generateReport({
      type: 'income',
      dateRange: { startDate, endDate },
      groupBy: options?.groupBy || 'category',
      filters: {
        accounts: options?.accountIds,
      },
    })
  }

  async createTransactionExport(options: {
    startDate?: string
    endDate?: string
    accountIds?: string[]
    categoryIds?: string[]
    format?: 'csv' | 'xlsx'
  }): Promise<TransactionExportSession> {
    logger.debug('Creating transaction export', { options })

    const startDate = options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = options.endDate || new Date().toISOString().split('T')[0]
    const format = options.format || 'csv'

    try {
      const response = await this.graphql.mutation<{
        createTransactionsExport: {
          sessionId: string
          downloadUrl: string
          expiresAt: string
        }
      }>(
        `mutation Web_CreateTransactionsExport(
          $startDate: Date!
          $endDate: Date!
          $accountIds: [ID]
          $categoryIds: [ID]
          $format: String!
        ) {
          createTransactionsExport(
            startDate: $startDate
            endDate: $endDate
            accountIds: $accountIds
            categoryIds: $categoryIds
            format: $format
          ) {
            sessionId
            downloadUrl
            expiresAt
          }
        }`,
        {
          startDate,
          endDate,
          accountIds: options.accountIds,
          categoryIds: options.categoryIds,
          format,
        }
      )

      const result = response.createTransactionsExport

      return {
        sessionId: result.sessionId,
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
        format,
        filters: {
          startDate,
          endDate,
          accounts: options.accountIds,
          categories: options.categoryIds,
        },
      }
    } catch (error) {
      logger.error('Failed to create transaction export', error)
      throw error
    }
  }

  async getExportStatus(sessionId: string): Promise<{
    status: 'pending' | 'ready' | 'expired' | 'error'
    downloadUrl?: string
    error?: string
  }> {
    logger.debug('Checking export status', { sessionId })

    try {
      const response = await this.graphql.query<{
        transactionsExportSession: {
          status: string
          downloadUrl?: string
          errorMessage?: string
        }
      }>(
        `query Web_GetDownloadTransactionsSession($sessionId: String!) {
          transactionsExportSession(sessionId: $sessionId) {
            status
            downloadUrl
            errorMessage
          }
        }`,
        { sessionId }
      )

      const session = response.transactionsExportSession

      return {
        status: (session?.status?.toLowerCase() || 'error') as 'pending' | 'ready' | 'expired' | 'error',
        downloadUrl: session?.downloadUrl,
        error: session?.errorMessage,
      }
    } catch (error) {
      logger.error('Failed to get export status', error)
      throw error
    }
  }
}

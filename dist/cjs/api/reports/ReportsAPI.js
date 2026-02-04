"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsAPIImpl = void 0;
const utils_1 = require("../../utils");
class ReportsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getReportConfigurations() {
        utils_1.logger.debug('Fetching report configurations');
        try {
            const response = await this.graphql.query(`query Web_GetReportConfigurations {
          reportConfigurations {
            id
            displayName
            transactionFilterSet {
              id
              displayName
              categories {
                id
                name
              }
              categoryGroups {
                id
                name
                type
              }
              accounts {
                id
                displayName
              }
              merchants {
                id
                name
              }
              tags {
                id
                name
              }
              startDate
              endDate
            }
            reportView {
              analysisScope
              chartType
              chartCalculation
              chartLayout
              chartDensity
              dimensions
              timeframe
            }
          }
        }`, {}, { cache: true, cacheTTL: 300000 });
            return (response.reportConfigurations ?? []).map(config => ({
                id: config.id,
                name: config.displayName,
                type: 'custom',
                dateRange: {
                    startDate: config.transactionFilterSet?.startDate || '',
                    endDate: config.transactionFilterSet?.endDate || '',
                    preset: config.reportView?.timeframe,
                },
                filters: {
                    accounts: config.transactionFilterSet?.accounts?.map(a => a.id),
                    categories: config.transactionFilterSet?.categories?.map(c => c.id),
                    tags: config.transactionFilterSet?.tags?.map(t => t.id),
                },
                groupBy: (config.reportView?.dimensions?.[0] || 'category'),
                includeSubcategories: true,
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch report configurations', error);
            throw error;
        }
    }
    async getReportConfiguration(reportId) {
        const configs = await this.getReportConfigurations();
        return configs.find(c => c.id === reportId) || null;
    }
    async generateReport(config) {
        utils_1.logger.debug('Generating report', { config });
        const startDate = config.dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = config.dateRange?.endDate || new Date().toISOString().split('T')[0];
        // Validate date range
        (0, utils_1.validateDateRange)(startDate, endDate);
        // Determine groupBy based on config
        const groupBy = [];
        if (config.groupBy === 'category') {
            groupBy.push('category');
        }
        else if (config.groupBy === 'merchant') {
            groupBy.push('merchant');
        }
        else if (config.groupBy === 'account') {
            groupBy.push('account');
        }
        else {
            groupBy.push('category'); // default
        }
        // Build dynamic groupBy fields based on what we're grouping by
        const includeCategory = config.groupBy === 'category' || !config.groupBy;
        const includeMerchant = config.groupBy === 'merchant';
        try {
            const response = await this.graphql.query(`query Common_GetReportsData(
          $filters: TransactionFilterInput!
          $groupBy: [ReportsGroupByEntity!]
          $groupByTimeframe: ReportsGroupByTimeframe
          $fillEmptyValues: Boolean = true
          $includeCategory: Boolean = false
          $includeMerchant: Boolean = false
        ) {
          reports(
            groupBy: $groupBy
            groupByTimeframe: $groupByTimeframe
            filters: $filters
            fillEmptyValues: $fillEmptyValues
          ) {
            groupBy {
              date
              category @include(if: $includeCategory) {
                id
                name
                icon
                group {
                  id
                  name
                  type
                }
              }
              merchant @include(if: $includeMerchant) {
                id
                name
              }
            }
            summary {
              sum
              avg
              count
              max
              sumIncome
              sumExpense
              savings
              savingsRate
              first
              last
            }
          }
          aggregates(filters: $filters, fillEmptyValues: $fillEmptyValues) {
            summary {
              sum
              avg
              count
              max
              sumIncome
              sumExpense
              savings
              savingsRate
              first
              last
            }
          }
        }`, {
                filters: {
                    startDate,
                    endDate,
                    accounts: config.filters?.accounts,
                    categories: config.filters?.categories,
                    tags: config.filters?.tags,
                    transactionVisibility: 'non_hidden_transactions_only',
                },
                groupBy,
                groupByTimeframe: config.groupBy === 'month' ? 'month' : (config.groupBy === 'week' ? 'week' : null),
                fillEmptyValues: true,
                includeCategory,
                includeMerchant,
            });
            const reports = response.reports ?? [];
            const aggregates = response.aggregates;
            // Calculate total from sum of absolute values for proper percentage calculation
            // (net sum can be ~0 when income/expenses cancel out)
            const absTotal = reports.reduce((acc, r) => acc + Math.abs(r.summary?.sum ?? 0), 0);
            // Transform to our interface format
            const breakdown = reports.map(r => {
                let label = 'Unknown';
                if (r.groupBy.category) {
                    label = r.groupBy.category.name;
                }
                else if (r.groupBy.merchant) {
                    label = r.groupBy.merchant.name;
                }
                else if (r.groupBy.date) {
                    label = r.groupBy.date;
                }
                return {
                    label,
                    value: r.summary?.sum ?? 0,
                    percentage: absTotal !== 0 ? (Math.abs(r.summary?.sum ?? 0) / absTotal) * 100 : 0,
                    count: r.summary?.count ?? 0,
                };
            });
            // Build time series from reports if grouped by date
            const timeSeries = reports
                .filter(r => r.groupBy.date)
                .map(r => ({
                date: r.groupBy.date,
                value: r.summary?.sum ?? 0,
            }));
            return {
                id: `report-${Date.now()}`,
                name: config.name || 'Custom Report',
                type: config.type || 'spending',
                dateRange: { startDate, endDate },
                summary: {
                    total: aggregates?.summary?.sum ?? 0,
                    average: aggregates?.summary?.avg ?? 0,
                    count: aggregates?.summary?.count ?? 0,
                },
                breakdown,
                timeSeries: timeSeries.length > 0 ? timeSeries : undefined,
            };
        }
        catch (error) {
            utils_1.logger.error('Failed to generate report', error);
            throw error;
        }
    }
    async getSpendingReport(startDate, endDate, options) {
        (0, utils_1.validateDateRange)(startDate, endDate);
        return this.generateReport({
            type: 'spending',
            dateRange: { startDate, endDate },
            groupBy: options?.groupBy || 'category',
            filters: {
                accounts: options?.accountIds,
                categories: options?.categoryIds,
            },
        });
    }
    async getIncomeReport(startDate, endDate, options) {
        (0, utils_1.validateDateRange)(startDate, endDate);
        return this.generateReport({
            type: 'income',
            dateRange: { startDate, endDate },
            groupBy: options?.groupBy || 'category',
            filters: {
                accounts: options?.accountIds,
            },
        });
    }
    async createTransactionExport(options) {
        utils_1.logger.debug('Creating transaction export', { options });
        // Validate date range if both dates provided
        if (options.startDate && options.endDate) {
            (0, utils_1.validateDateRange)(options.startDate, options.endDate);
        }
        const startDate = options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = options.endDate || new Date().toISOString().split('T')[0];
        const format = options.format || 'csv';
        try {
            const response = await this.graphql.mutation(`mutation Web_CreateTransactionsExport(
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
        }`, {
                startDate,
                endDate,
                accountIds: options.accountIds,
                categoryIds: options.categoryIds,
                format,
            });
            const result = response.createTransactionsExport;
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
            };
        }
        catch (error) {
            utils_1.logger.error('Failed to create transaction export', error);
            throw error;
        }
    }
    async getExportStatus(sessionId) {
        utils_1.logger.debug('Checking export status', { sessionId });
        try {
            const response = await this.graphql.query(`query Web_GetDownloadTransactionsSession($sessionId: String!) {
          transactionsExportSession(sessionId: $sessionId) {
            status
            downloadUrl
            errorMessage
          }
        }`, { sessionId });
            const session = response.transactionsExportSession;
            return {
                status: (session?.status?.toLowerCase() || 'error'),
                downloadUrl: session?.downloadUrl,
                error: session?.errorMessage,
            };
        }
        catch (error) {
            utils_1.logger.error('Failed to get export status', error);
            throw error;
        }
    }
}
exports.ReportsAPIImpl = ReportsAPIImpl;
//# sourceMappingURL=ReportsAPI.js.map
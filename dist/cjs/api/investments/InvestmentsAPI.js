"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentsAPIImpl = void 0;
const utils_1 = require("../../utils");
class InvestmentsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getPortfolio() {
        utils_1.logger.debug('Fetching portfolio');
        try {
            const response = await this.graphql.query(`query Web_GetPortfolio($portfolioInput: PortfolioInput) {
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
        }`, { portfolioInput: {} }, { cache: true, cacheTTL: 60000 });
            const perf = response.portfolio?.performance;
            const holdings = response.portfolio?.aggregateHoldings?.edges ?? [];
            // Transform holdings to our interface format
            const transformedHoldings = holdings.map((edge) => {
                const node = edge.node;
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
                };
            });
            // Group holdings by account
            const accountMap = new Map();
            for (const holding of transformedHoldings) {
                const acctId = holding.account.id;
                if (!accountMap.has(acctId)) {
                    accountMap.set(acctId, {
                        id: acctId,
                        displayName: holding.account.displayName,
                        currentBalance: 0,
                        type: 'investment',
                        holdings: [],
                    });
                }
                const acct = accountMap.get(acctId);
                acct.holdings.push(holding);
                acct.currentBalance += holding.value;
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
            };
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch portfolio', error);
            throw error;
        }
    }
    async getInvestmentAccounts() {
        utils_1.logger.debug('Fetching investment accounts');
        try {
            const response = await this.graphql.query(`query Web_GetInvestmentsAccounts {
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
        }`, {}, { cache: true, cacheTTL: 300000 });
            return (response.accounts ?? []).map(acct => ({
                id: acct.id,
                displayName: acct.displayName,
                type: acct.type?.name ?? 'investment',
                subtype: acct.subtype?.name,
                currentBalance: acct.currentBalance ?? 0,
                institution: acct.institution,
                holdings: [],
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch investment accounts', error);
            throw error;
        }
    }
    async getHoldings(accountId) {
        utils_1.logger.debug('Fetching holdings', { accountId });
        try {
            const portfolio = await this.getPortfolio();
            if (accountId) {
                return portfolio.holdings.filter(h => h.account.id === accountId);
            }
            return portfolio.holdings;
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch holdings', error);
            throw error;
        }
    }
    async getSecurityPerformance(securityIds, startDate, endDate) {
        // Validate securityIds - filter invalid values and return early if empty
        const validSecurityIds = Array.isArray(securityIds)
            ? securityIds.filter(id => typeof id === 'string' && id.trim().length > 0)
            : [];
        if (validSecurityIds.length === 0) {
            utils_1.logger.warn('getSecurityPerformance called with no valid securityIds', {
                securityIds,
                startDate,
                endDate,
            });
            return [];
        }
        // Default to last 30 days if no dates provided
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Validate after defaults are set
        (0, utils_1.validateDateRange)(start, end);
        utils_1.logger.debug('Fetching security performance', { securityIds: validSecurityIds, startDate: start, endDate: end });
        try {
            const response = await this.graphql.query(`query Web_GetSecuritiesHistoricalPerformance($input: SecurityHistoricalPerformanceInput!) {
          securityHistoricalPerformance(input: $input) {
            security {
              id
            }
            historicalChart {
              date
              returnPercent
            }
          }
        }`, {
                input: {
                    securityIds: validSecurityIds,
                    startDate: start,
                    endDate: end
                }
            }, { cache: true, cacheTTL: 300000 });
            return (response.securityHistoricalPerformance ?? []).map(perf => ({
                securityId: perf.security?.id ?? '',
                ticker: '', // Not returned in this query
                name: '', // Not returned in this query
                performance: (perf.historicalChart ?? []).map(h => ({
                    date: h.date,
                    price: 0, // Not returned, only returnPercent
                    percentChange: h.returnPercent,
                })),
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch security performance', error);
            throw error;
        }
    }
    async getDashboardCard() {
        utils_1.logger.debug('Fetching investments dashboard card');
        try {
            const response = await this.graphql.query(`query Web_GetInvestmentsDashboardCard {
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
        }`, {}, { cache: true, cacheTTL: 60000 });
            const dashboard = response.investmentsDashboard;
            return {
                totalValue: dashboard?.totalValue ?? 0,
                dayChange: dashboard?.dayChange ?? 0,
                dayChangePercent: dashboard?.dayChangePercent ?? 0,
                topMovers: (dashboard?.topMovers ?? []).map(m => ({
                    ticker: m.security.ticker,
                    name: m.security.name,
                    changePercent: m.oneDayChangePercent,
                })),
            };
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch investments dashboard', error);
            throw error;
        }
    }
}
exports.InvestmentsAPIImpl = InvestmentsAPIImpl;
//# sourceMappingURL=InvestmentsAPI.js.map
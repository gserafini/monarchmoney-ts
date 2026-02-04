"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashflowAPIImpl = void 0;
// Valid groupBy values for aggregates query (prevents GraphQL injection)
const VALID_GROUP_BY = ['category', 'categoryGroup', 'account', 'merchant', 'month'];
class CashflowAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    getCurrentMonthDates() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate, endDate };
    }
    async getCashflow(options) {
        const { startDate, endDate } = options?.startDate && options?.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : this.getCurrentMonthDates();
        const filters = {
            search: "",
            categories: [],
            accounts: [],
            tags: [],
            startDate,
            endDate,
            ...options?.filters
        };
        // FIXED: Monarch's API doesn't support GraphQL aliases for aggregates queries.
        // Make separate requests for each groupBy type.
        const makeQuery = (groupBy, limit) => {
            // Validate groupBy to prevent GraphQL injection (defense in depth)
            if (!VALID_GROUP_BY.includes(groupBy)) {
                throw new Error(`Invalid groupBy value: ${groupBy}`);
            }
            return `
      query ($filters: TransactionFilterInput) {
        aggregates(filters: $filters, groupBy: ["${groupBy}"]${limit ? `, limit: ${limit}` : ''}) {
          groupBy {
            ${groupBy === 'category' ? 'category { id name group { id type __typename } __typename }' : ''}
            ${groupBy === 'categoryGroup' ? 'categoryGroup { id name type __typename }' : ''}
            ${groupBy === 'account' ? 'account { id displayName __typename }' : ''}
            ${groupBy === 'merchant' ? 'merchant { id name __typename }' : ''}
            ${groupBy === 'month' ? 'month { date __typename }' : ''}
            __typename
          }
          summary {
            sum
            ${groupBy === 'month' ? 'count' : ''}
            __typename
          }
          __typename
        }
      }
    `;
        };
        // Execute queries in parallel
        const [byCategory, byCategoryGroup] = await Promise.all([
            this.graphql.query(makeQuery('category'), { filters }),
            this.graphql.query(makeQuery('categoryGroup'), { filters }),
        ]);
        return {
            byCategory: byCategory.aggregates,
            byCategoryGroup: byCategoryGroup.aggregates,
        };
    }
    async getCashflowSummary(options) {
        const { startDate, endDate } = options?.startDate && options?.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : this.getCurrentMonthDates();
        const filters = {
            search: "",
            categories: [],
            accounts: [],
            tags: [],
            startDate,
            endDate,
            ...options?.filters
        };
        const query = `
      query Web_GetCashFlowPage($filters: TransactionFilterInput) {
        summary: aggregates(filters: $filters, fillEmptyValues: true) {
          summary {
            sumIncome
            sumExpense
            savings
            savingsRate
            __typename
          }
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query, { filters });
        // FIXED: Handle array response structure from actual API
        return result.summary[0].summary;
    }
}
exports.CashflowAPIImpl = CashflowAPIImpl;
//# sourceMappingURL=CashflowAPI.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringAPIImpl = void 0;
class RecurringAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getRecurringStreams(options) {
        const variables = {
            includeLiabilities: options?.includeLiabilities ?? true
        };
        // FIXED: Use exact working query from MonarchMoney web app
        const query = `
      query Common_GetRecurringStreams($includeLiabilities: Boolean) {
        recurringTransactionStreams(
          includePending: true
          includeLiabilities: $includeLiabilities
        ) {
          stream {
            id
            reviewStatus
            frequency
            amount
            baseDate
            dayOfTheMonth
            isApproximate
            name
            logoUrl
            recurringType
            merchant {
              id
              __typename
            }
            creditReportLiabilityAccount {
              id
              account {
                id
                __typename
              }
              lastStatement {
                id
                dueDate
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query, variables);
        return result.recurringTransactionStreams;
    }
    async getUpcomingRecurringItems(options) {
        const variables = {
            startDate: options.startDate,
            endDate: options.endDate,
            filters: options.filters || {}
        };
        const query = `
      query Web_GetUpcomingRecurringTransactionItems(
        $startDate: Date!, 
        $endDate: Date!, 
        $filters: RecurringTransactionFilter
      ) {
        recurringTransactionItems(
          startDate: $startDate
          endDate: $endDate
          filters: $filters
        ) {
          stream {
            id
            frequency
            amount
            isApproximate
            merchant {
              id
              name
              logoUrl
              __typename
            }
            __typename
          }
          date
          isPast
          transactionId
          amount
          amountDiff
          category {
            id
            name
            __typename
          }
          account {
            id
            displayName
            __typename
          }
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query, variables);
        return result.recurringTransactionItems;
    }
    async getRemainingDue(options) {
        // Default to current date through end of month
        const now = new Date();
        const startDate = options?.startDate || now.toISOString().split('T')[0];
        const endDate = options?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const includeLiabilities = options?.includeLiabilities ?? true;
        const query = `
      query Web_GetRecurringRemainingDue(
        $startDate: Date!
        $endDate: Date!
        $includeLiabilities: Boolean
      ) {
        recurringRemainingDue(
          startDate: $startDate
          endDate: $endDate
          includeLiabilities: $includeLiabilities
        ) {
          amount
        }
      }
    `;
        try {
            const result = await this.graphql.query(query, { startDate, endDate, includeLiabilities });
            // Also get the items to count them
            const items = await this.getUpcomingRecurringItems({ startDate, endDate });
            const unpaidItems = items.filter(item => !item.isPast && !item.transactionId);
            return {
                totalAmount: result.recurringRemainingDue?.amount || 0,
                numItems: unpaidItems.length,
                startDate,
                endDate
            };
        }
        catch (error) {
            console.error('Failed to get remaining due:', error);
            return {
                totalAmount: 0,
                numItems: 0,
                startDate,
                endDate
            };
        }
    }
    async markStreamAsNotRecurring(streamId) {
        const variables = { streamId };
        const mutation = `
      mutation Common_MarkAsNotRecurring($streamId: ID!) {
        markStreamAsNotRecurring(streamId: $streamId) {
          success
          errors {
            message
            field
            __typename
          }
          __typename
        }
      }
    `;
        try {
            const result = await this.graphql.mutation(mutation, variables);
            return result.markStreamAsNotRecurring.success;
        }
        catch (error) {
            console.error('Failed to mark stream as not recurring:', error);
            return false;
        }
    }
}
exports.RecurringAPIImpl = RecurringAPIImpl;
//# sourceMappingURL=RecurringAPI.js.map
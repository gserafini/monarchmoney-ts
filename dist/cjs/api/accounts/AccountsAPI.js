"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsAPIImpl = void 0;
const operations_1 = require("../../client/graphql/operations");
const operations_2 = require("../../client/graphql/operations");
const utils_1 = require("../../utils");
class AccountsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getAll(options = {}) {
        const { includeHidden = false, verbosity = 'standard' } = options;
        utils_1.logger.debug('Fetching all accounts', options);
        try {
            // Select appropriate query based on verbosity
            const query = (0, operations_2.getQueryForVerbosity)('accounts', verbosity);
            const response = await this.graphql.query(query, {}, { cache: true, cacheTTL: 300000 }); // 5 minutes
            let accounts = response.accounts;
            // Filter out hidden accounts if requested
            if (!includeHidden) {
                accounts = accounts.filter((account) => !account.isHidden);
            }
            return accounts;
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch accounts', error);
            throw error;
        }
    }
    async getById(id) {
        (0, utils_1.validateAccountId)(id);
        utils_1.logger.debug(`Fetching account: ${id}`);
        try {
            const response = await this.graphql.query(operations_1.GET_ACCOUNT_DETAILS, { id }, { cache: true, cacheTTL: 300000 });
            return response.account;
        }
        catch (error) {
            utils_1.logger.error(`Failed to fetch account ${id}`, error);
            throw error;
        }
    }
    async getBalances(startDate, endDate) {
        (0, utils_1.validateDateRange)(startDate, endDate);
        utils_1.logger.debug('Fetching account balances', { startDate, endDate });
        try {
            const accounts = await this.getAll({ includeHidden: true, verbosity: 'standard' });
            // For now, return current balances
            // TODO: Implement actual balance history query
            return accounts.map((account) => ({
                accountId: account.id,
                date: new Date().toISOString().split('T')[0],
                balance: account.currentBalance
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch account balances', error);
            throw error;
        }
    }
    async getTypeOptions() {
        utils_1.logger.debug('Fetching account type options');
        try {
            const response = await this.graphql.query(operations_1.GET_ACCOUNT_TYPE_OPTIONS, {}, { cache: true, cacheTTL: 1800000 }); // 30 minutes
            return response.accountTypeOptions;
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch account type options', error);
            throw error;
        }
    }
    async getHistory(accountId, startDate, endDate) {
        (0, utils_1.validateAccountId)(accountId);
        (0, utils_1.validateDateRange)(startDate, endDate);
        utils_1.logger.debug(`Fetching account history: ${accountId}`, { startDate, endDate });
        try {
            // Use the recent balances query pattern from HAR
            const ACCOUNT_RECENT_BALANCES = `
        query Web_GetAccountsPageRecentBalance($startDate: Date) {
          accounts {
            id
            recentBalances(startDate: $startDate)
            __typename
          }
        }
      `;
            const response = await this.graphql.query(ACCOUNT_RECENT_BALANCES, { startDate }, { cache: true, cacheTTL: 300000 });
            // Find the specific account and format the response
            const accountData = response.accounts.find(acc => acc.id === accountId);
            if (!accountData) {
                throw new Error(`Account ${accountId} not found`);
            }
            // For now, return current balance as a single point since recentBalances format isn't clear
            // TODO: Parse recentBalances array properly when we understand the format
            const account = await this.getById(accountId);
            return [{
                    accountId: account.id,
                    date: new Date().toISOString().split('T')[0],
                    balance: account.currentBalance
                }];
        }
        catch (error) {
            utils_1.logger.error(`Failed to fetch account history for ${accountId}`, error);
            throw error;
        }
    }
    async getNetWorthHistory(startDate, endDate) {
        (0, utils_1.validateDateRange)(startDate, endDate);
        utils_1.logger.debug('Fetching net worth history', { startDate, endDate });
        try {
            // Build filters object according to HAR pattern
            const filters = {};
            if (startDate !== undefined)
                filters.startDate = startDate;
            if (endDate !== undefined)
                filters.endDate = endDate;
            filters.useAdaptiveGranularity = true;
            const response = await this.graphql.query(operations_1.GET_NET_WORTH_HISTORY, { filters }, { cache: true, cacheTTL: 600000 }); // 10 minutes
            // Map the response to the expected format
            return response.aggregateSnapshots.map(item => ({
                date: item.date,
                netWorth: item.balance,
                assets: item.assetsBalance,
                liabilities: item.liabilitiesBalance
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to fetch net worth history', error);
            throw error;
        }
    }
    async createManualAccount(input) {
        utils_1.logger.debug('Creating manual account', input);
        try {
            const CREATE_MANUAL_ACCOUNT = `
        mutation CreateManualAccount(
          $name: String!,
          $typeName: String!,
          $subtypeName: String!,
          $balance: Float!,
          $includeInNetWorth: Boolean,
          $isAsset: Boolean
        ) {
          createManualAccount(
            name: $name,
            typeName: $typeName,
            subtypeName: $subtypeName,
            balance: $balance,
            includeInNetWorth: $includeInNetWorth,
            isAsset: $isAsset
          ) {
            account {
              id
              displayName
              currentBalance
              includeInNetWorth
              isAsset
              type {
                id
                name
                display
              }
              subtype {
                id
                name
                display
              }
            }
            errors {
              message
              field
            }
          }
        }
      `;
            const response = await this.graphql.mutation(CREATE_MANUAL_ACCOUNT, {
                name: input.name,
                typeName: input.typeName,
                subtypeName: input.subtypeName,
                balance: input.balance,
                includeInNetWorth: input.includeInNetWorth ?? true,
                isAsset: input.isAsset ?? true
            });
            if (response.createManualAccount.errors && response.createManualAccount.errors.length > 0) {
                const error = response.createManualAccount.errors[0];
                throw new Error(`Failed to create account: ${error.message}`);
            }
            return response.createManualAccount.account;
        }
        catch (error) {
            utils_1.logger.error('Failed to create manual account', error);
            throw error;
        }
    }
    async updateAccount(id, updates) {
        (0, utils_1.validateAccountId)(id);
        utils_1.logger.debug(`Updating account: ${id}`, updates);
        try {
            const UPDATE_ACCOUNT = `
        mutation UpdateAccount(
          $id: ID!,
          $displayName: String,
          $isHidden: Boolean,
          $includeInNetWorth: Boolean,
          $currentBalance: Float
        ) {
          updateAccount(
            id: $id,
            displayName: $displayName,
            isHidden: $isHidden,
            includeInNetWorth: $includeInNetWorth,
            currentBalance: $currentBalance
          ) {
            account {
              id
              displayName
              currentBalance
              includeInNetWorth
              isHidden
              updatedAt
            }
            errors {
              message
              field
            }
          }
        }
      `;
            const response = await this.graphql.mutation(UPDATE_ACCOUNT, {
                id,
                displayName: updates.displayName,
                isHidden: updates.isHidden,
                includeInNetWorth: updates.includeInNetWorth,
                currentBalance: updates.currentBalance
            });
            if (response.updateAccount.errors && response.updateAccount.errors.length > 0) {
                const error = response.updateAccount.errors[0];
                throw new Error(`Failed to update account: ${error.message}`);
            }
            return response.updateAccount.account;
        }
        catch (error) {
            utils_1.logger.error(`Failed to update account ${id}`, error);
            throw error;
        }
    }
    async deleteAccount(id) {
        (0, utils_1.validateAccountId)(id);
        utils_1.logger.debug(`Deleting account: ${id}`);
        try {
            const DELETE_ACCOUNT = `
        mutation DeleteAccount($id: ID!) {
          deleteAccount(id: $id) {
            success
            errors {
              message
            }
          }
        }
      `;
            const response = await this.graphql.mutation(DELETE_ACCOUNT, { id });
            if (response.deleteAccount.errors && response.deleteAccount.errors.length > 0) {
                const error = response.deleteAccount.errors[0];
                throw new Error(`Failed to delete account: ${error.message}`);
            }
            return response.deleteAccount.success;
        }
        catch (error) {
            utils_1.logger.error(`Failed to delete account ${id}`, error);
            throw error;
        }
    }
    async requestRefresh(accountIds) {
        utils_1.logger.debug('Requesting account refresh', { accountIds });
        try {
            const REQUEST_REFRESH = `
        mutation RequestAccountsRefresh($accountIds: [ID!]) {
          requestAccountsRefresh(accountIds: $accountIds) {
            success
            refreshId
            errors {
              message
            }
          }
        }
      `;
            const response = await this.graphql.mutation(REQUEST_REFRESH, { accountIds });
            if (response.requestAccountsRefresh.errors && response.requestAccountsRefresh.errors.length > 0) {
                const error = response.requestAccountsRefresh.errors[0];
                throw new Error(`Failed to request refresh: ${error.message}`);
            }
            return response.requestAccountsRefresh.success;
        }
        catch (error) {
            utils_1.logger.error('Failed to request account refresh', error);
            throw error;
        }
    }
    async isRefreshComplete(refreshId) {
        utils_1.logger.debug('Checking refresh status', { refreshId });
        try {
            const CHECK_REFRESH = `
        query CheckAccountsRefresh($refreshId: String) {
          accountsRefreshStatus(refreshId: $refreshId) {
            isComplete
            progress
            errors {
              message
            }
          }
        }
      `;
            const response = await this.graphql.query(CHECK_REFRESH, { refreshId }, { cache: false });
            return response.accountsRefreshStatus.isComplete;
        }
        catch (error) {
            utils_1.logger.error('Failed to check refresh status', error);
            return false;
        }
    }
}
exports.AccountsAPIImpl = AccountsAPIImpl;
//# sourceMappingURL=AccountsAPI.js.map
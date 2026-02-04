import { validateTransactionId, validateDateRange, logger } from '../../utils';
export class TransactionsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getTransactions(options = {}) {
        const { limit = 100, offset = 0, startDate, endDate, categoryIds, accountIds, tagIds, merchantIds, search, isCredit, absAmountRange } = options;
        if (startDate && endDate) {
            validateDateRange(startDate, endDate);
        }
        // Build filters object for web app compatibility
        const filters = {
            transactionVisibility: 'non_hidden_transactions_only'
        };
        if (startDate)
            filters.startDate = startDate;
        if (endDate)
            filters.endDate = endDate;
        if (categoryIds && categoryIds.length > 0)
            filters.categoryIds = categoryIds;
        if (accountIds && accountIds.length > 0)
            filters.accountIds = accountIds;
        if (tagIds && tagIds.length > 0)
            filters.tagIds = tagIds;
        if (merchantIds && merchantIds.length > 0)
            filters.merchantIds = merchantIds;
        if (search)
            filters.search = search;
        if (isCredit !== undefined)
            filters.isCredit = isCredit;
        if (absAmountRange) {
            if (absAmountRange[0] !== undefined)
                filters.minAmount = absAmountRange[0];
            if (absAmountRange[1] !== undefined)
                filters.maxAmount = absAmountRange[1];
        }
        const variables = {
            limit,
            offset,
            filters,
            orderBy: 'date'
        };
        logger.debug('Getting transactions with options:', variables);
        // FIXED: Use exact working query from MonarchMoney web app
        const query = `
      query Web_GetTransactionsList($offset: Int, $limit: Int, $filters: TransactionFilterInput, $orderBy: TransactionOrdering) {
        allTransactions(filters: $filters) {
          totalCount
          totalSelectableCount
          results(offset: $offset, limit: $limit, orderBy: $orderBy) {
            id
            ...TransactionOverviewFields
            __typename
          }
          __typename
        }
        transactionRules {
          id
          __typename
        }
      }

      fragment TransactionOverviewFields on Transaction {
        id
        amount
        pending
        date
        hideFromReports
        hiddenByAccount
        plaidName
        notes
        isRecurring
        reviewStatus
        needsReview
        isSplitTransaction
        dataProviderDescription
        attachments {
          id
          __typename
        }
        goal {
          id
          name
          __typename
        }
        category {
          id
          name
          icon
          group {
            id
            type
            __typename
          }
          __typename
        }
        merchant {
          name
          id
          transactionsCount
          logoUrl
          recurringTransactionStream {
            frequency
            isActive
            __typename
          }
          __typename
        }
        tags {
          id
          name
          color
          order
          __typename
        }
        account {
          id
          displayName
          icon
          logoUrl
          __typename
        }
        __typename
      }
    `;
        const data = await this.graphql.query(query, variables);
        logger.debug(`Retrieved ${data.allTransactions.results.length} transactions using web app schema`);
        return {
            transactions: data.allTransactions.results,
            totalCount: data.allTransactions.totalCount,
            hasMore: offset + limit < data.allTransactions.totalCount,
            limit,
            offset
        };
    }
    async getTransactionDetails(transactionId) {
        validateTransactionId(transactionId);
        const query = `
      query GetTransactionDrawer($transactionId: String!) {
        getTransaction(id: $transactionId) {
          id
          amount
          date
          merchant {
            name
          }
          category {
            id
            name
            icon
            color
          }
          account {
            id
            displayName
            type {
              name
            }
            institution {
              name
              plaidInstitutionId
            }
          }
          tags {
            id
            name
            color
          }
          splits {
            id
            amount
            category {
              id
              name
            }
          }
          isRecurring
          reviewStatus
          notes
          originalDescription
          needsReview
          dataProvider
          dataProviderDescription
          isHide
          importIdentifier
          plaidTransactionId
        }
      }
    `;
        const data = await this.graphql.query(query, { transactionId });
        return data.getTransaction;
    }
    async createTransaction(data) {
        const { accountId, merchant, amount, date, categoryId, notes } = data;
        const mutation = `
      mutation CreateTransaction(
        $accountId: String!
        $merchant: String!
        $amount: Float!
        $date: String!
        $categoryId: String
        $notes: String
      ) {
        createTransaction(
          accountId: $accountId
          merchant: $merchant
          amount: $amount
          date: $date
          categoryId: $categoryId
          notes: $notes
        ) {
          transaction {
            id
            amount
            date
            merchant {
              name
            }
            category {
              id
              name
              icon
              color
            }
            account {
              id
              displayName
            }
            notes
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { accountId, merchant, amount, date, categoryId, notes });
        if (result.createTransaction.errors?.length > 0) {
            throw new Error(`Transaction creation failed: ${result.createTransaction.errors[0].messages.join(', ')}`);
        }
        logger.info('Transaction created successfully:', result.createTransaction.transaction.id);
        return result.createTransaction.transaction;
    }
    // Uses Web_TransactionDrawerUpdateTransaction mutation captured from Monarch web app (2026-02-03)
    // Input type: UpdateTransactionMutationInput! (NOT individual parameters)
    async updateTransaction(transactionId, data) {
        validateTransactionId(transactionId);
        // Build input matching Monarch's UpdateTransactionMutationInput
        const input = { id: transactionId };
        // Support both field names: library convention and Monarch API names
        const categoryId = data.category ?? data.categoryId;
        const merchantName = data.merchantName ?? data.merchant;
        const hideFromReports = data.hideFromReports ?? data.isHidden;
        if (categoryId !== undefined)
            input.category = categoryId;
        if (merchantName !== undefined)
            input.merchantName = merchantName;
        if (data.notes !== undefined)
            input.notes = data.notes;
        if (data.date !== undefined)
            input.date = data.date;
        if (data.amount !== undefined)
            input.amount = data.amount;
        if (hideFromReports !== undefined)
            input.hideFromReports = hideFromReports;
        const mutation = `
      mutation Web_TransactionDrawerUpdateTransaction($input: UpdateTransactionMutationInput!) {
        updateTransaction(input: $input) {
          transaction {
            id
            amount
            date
            category {
              id
              name
            }
            merchant {
              id
              name
            }
            notes
            hideFromReports
          }
          errors {
            ...PayloadErrorFields
          }
        }
      }
      fragment PayloadErrorFields on PayloadError {
        fieldErrors {
          field
          messages
        }
        message
        code
      }
    `;
        const result = await this.graphql.mutation(mutation, { input });
        if (result.updateTransaction.errors?.length > 0) {
            const errors = result.updateTransaction.errors;
            const msg = errors[0]?.message || errors[0]?.fieldErrors?.[0]?.messages?.join(', ') || 'Unknown error';
            throw new Error(`Transaction update failed: ${msg}`);
        }
        logger.info('Transaction updated successfully:', transactionId);
        return result.updateTransaction.transaction;
    }
    async deleteTransaction(transactionId) {
        validateTransactionId(transactionId);
        const mutation = `
      mutation DeleteTransaction($transactionId: String!) {
        deleteTransaction(transactionId: $transactionId) {
          deleted
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId });
        if (result.deleteTransaction.errors?.length > 0) {
            throw new Error(`Transaction deletion failed: ${result.deleteTransaction.errors[0].messages.join(', ')}`);
        }
        logger.info('Transaction deleted successfully:', transactionId);
        return result.deleteTransaction.deleted;
    }
    async getTransactionsSummary() {
        const query = `
      query GetTransactionsPage {
        transactionsSummary {
          totalIncome
          totalExpenses
          netTotal
          transactionCount
          categorySummary {
            categoryId
            categoryName
            totalAmount
            transactionCount
          }
          monthlyTrend {
            month
            income
            expenses
            net
          }
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.transactionsSummary;
    }
    async getTransactionsSummaryCard() {
        const query = `
      query GetTransactionsSummaryCard {
        transactionsSummaryCard {
          totalTransactions
          totalAmount
          averageTransaction
          topCategories {
            categoryId
            categoryName
            amount
            count
          }
          recentTransactions {
            id
            merchant {
              name
            }
            amount
            date
          }
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.transactionsSummaryCard;
    }
    async getTransactionSplits(transactionId) {
        validateTransactionId(transactionId);
        const query = `
      query TransactionSplitQuery($transactionId: String!) {
        getTransaction(id: $transactionId) {
          splits {
            id
            amount
            category {
              id
              name
              icon
              color
            }
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { transactionId });
        return data.getTransaction.splits;
    }
    async updateTransactionSplits(transactionId, splits) {
        validateTransactionId(transactionId);
        const mutation = `
      mutation SplitTransaction($transactionId: String!, $splits: [SplitInput!]!) {
        splitTransaction(transactionId: $transactionId, splits: $splits) {
          transaction {
            id
            amount
            splits {
              id
              amount
              category {
                id
                name
              }
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId, splits });
        if (result.splitTransaction.errors?.length > 0) {
            throw new Error(`Transaction split failed: ${result.splitTransaction.errors[0].messages.join(', ')}`);
        }
        return result.splitTransaction.transaction;
    }
    // Exact query captured from Monarch web app (2026-02-03)
    // Type on each rule is TransactionRuleV2
    async getTransactionRules() {
        const query = `
      query GetTransactionRules {
        transactionRules {
          id
          order
          ...TransactionRuleFields
          __typename
        }
      }

      fragment TransactionRuleFields on TransactionRuleV2 {
        id
        merchantCriteriaUseOriginalStatement
        merchantCriteria {
          operator
          value
          __typename
        }
        originalStatementCriteria {
          operator
          value
          __typename
        }
        merchantNameCriteria {
          operator
          value
          __typename
        }
        amountCriteria {
          operator
          isExpense
          value
          valueRange {
            lower
            upper
            __typename
          }
          __typename
        }
        categoryIds
        accountIds
        categories {
          id
          name
          icon
          __typename
        }
        accounts {
          id
          displayName
          icon
          logoUrl
          __typename
        }
        setMerchantAction {
          id
          name
          __typename
        }
        setCategoryAction {
          id
          name
          icon
          __typename
        }
        addTagsAction {
          id
          name
          color
          __typename
        }
        reviewStatusAction
        splitTransactionsAction {
          amountType
          splitsInfo {
            categoryId
            merchantName
            amount
            __typename
          }
          __typename
        }
        recentApplicationCount
        lastAppliedAt
        __typename
      }
    `;
        const data = await this.graphql.query(query);
        return data.transactionRules || [];
    }
    // Uses Common_CreateTransactionRuleMutationV2 mutation captured from Monarch web app (2026-02-03)
    // Input type: CreateTransactionRuleInput! (NOT individual name/conditions/actions params)
    // Key differences from original:
    //   - merchantNameCriteria (NOT merchantCriteria), operator lowercase "contains"
    //   - setCategoryAction is a plain category ID string (NOT {id: ...})
    async createTransactionRule(data) {
        const input = {
            categoryIds: data.categoryIds ?? null,
            accountIds: data.accountIds ?? null,
            merchantCriteria: data.merchantCriteria ?? null,
            amountCriteria: data.amountCriteria ?? null,
            merchantNameCriteria: data.merchantNameCriteria ?? null,
            originalStatementCriteria: data.originalStatementCriteria ?? null,
            merchantCriteriaUseOriginalStatement: data.merchantCriteriaUseOriginalStatement ?? false,
            addTagsAction: data.addTagsAction ?? null,
            splitTransactionsAction: data.splitTransactionsAction ?? null,
            setMerchantAction: data.setMerchantAction ?? null,
            setCategoryAction: data.setCategoryAction ?? null,
            linkGoalAction: data.linkGoalAction ?? null,
            linkSavingsGoalAction: data.linkSavingsGoalAction ?? null,
            reviewStatusAction: data.reviewStatusAction ?? null,
            actionSetBusinessEntity: data.actionSetBusinessEntity ?? null,
            applyToExistingTransactions: data.applyToExistingTransactions ?? false,
        };
        const mutation = `
      mutation Common_CreateTransactionRuleMutationV2($input: CreateTransactionRuleInput!) {
        createTransactionRuleV2(input: $input) {
          errors {
            ...PayloadErrorFields
            __typename
          }
          __typename
        }
      }
      fragment PayloadErrorFields on PayloadError {
        fieldErrors {
          field
          messages
          __typename
        }
        message
        code
        __typename
      }
    `;
        const result = await this.graphql.mutation(mutation, { input });
        if (result.createTransactionRuleV2?.errors?.length > 0) {
            const errors = result.createTransactionRuleV2.errors;
            const msg = errors[0]?.message || errors[0]?.fieldErrors?.[0]?.messages?.join(', ') || 'Unknown error';
            throw new Error(`Transaction rule creation failed: ${msg}`);
        }
        logger.info('Transaction rule created successfully');
        // V2 mutation doesn't return the rule object, return a minimal representation
        return { id: 'created', applyToExistingTransactions: data.applyToExistingTransactions ?? false };
    }
    async updateTransactionRule(ruleId, data) {
        const mutation = `
      mutation UpdateTransactionRule(
        $ruleId: String!
        $name: String
        $conditions: [RuleConditionInput!]
        $actions: [RuleActionInput!]
        $priority: Int
        $isEnabled: Boolean
      ) {
        updateTransactionRule(
          ruleId: $ruleId
          name: $name
          conditions: $conditions
          actions: $actions
          priority: $priority
          isEnabled: $isEnabled
        ) {
          transactionRule {
            id
            name
            isEnabled
            priority
            conditions {
              field
              operator
              value
            }
            actions {
              type
              value
            }
            updatedAt
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { ruleId, ...data });
        if (result.updateTransactionRule.errors?.length > 0) {
            throw new Error(`Transaction rule update failed: ${result.updateTransactionRule.errors[0].messages.join(', ')}`);
        }
        logger.info('Transaction rule updated successfully:', ruleId);
        return result.updateTransactionRule.transactionRule;
    }
    // Uses Common_DeleteTransactionRule mutation captured from Monarch web app (2026-02-03)
    async deleteTransactionRule(ruleId) {
        const mutation = `
      mutation Common_DeleteTransactionRule($id: ID!) {
        deleteTransactionRule(id: $id) {
          deleted
          errors {
            ...PayloadErrorFields
            __typename
          }
          __typename
        }
      }
      fragment PayloadErrorFields on PayloadError {
        fieldErrors {
          field
          messages
          __typename
        }
        message
        code
        __typename
      }
    `;
        const result = await this.graphql.mutation(mutation, { id: ruleId });
        if (result.deleteTransactionRule.errors?.length > 0) {
            const err = result.deleteTransactionRule.errors[0];
            throw new Error(`Transaction rule deletion failed: ${err.message || err.fieldErrors?.map((e) => e.messages.join(', ')).join('; ')}`);
        }
        logger.info('Transaction rule deleted successfully:', ruleId);
        return result.deleteTransactionRule.deleted;
    }
    async deleteAllTransactionRules() {
        const mutation = `
      mutation DeleteAllTransactionRules {
        deleteAllTransactionRules {
          deletedCount
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation);
        if (result.deleteAllTransactionRules.errors?.length > 0) {
            throw new Error(`Delete all transaction rules failed: ${result.deleteAllTransactionRules.errors[0].messages.join(', ')}`);
        }
        logger.info('All transaction rules deleted successfully:', result.deleteAllTransactionRules.deletedCount);
        return result.deleteAllTransactionRules.deletedCount > 0;
    }
    async previewTransactionRule(conditions, actions) {
        const mutation = `
      mutation PreviewTransactionRule(
        $conditions: [RuleConditionInput!]!
        $actions: [RuleActionInput!]!
      ) {
        previewTransactionRule(conditions: $conditions, actions: $actions) {
          affectedTransactions {
            id
            merchant {
              name
            }
            amount
            date
            category {
              id
              name
            }
          }
          previewChanges {
            field
            currentValue
            newValue
          }
        }
      }
    `;
        const data = await this.graphql.mutation(mutation, { conditions, actions });
        return data.previewTransactionRule;
    }
    async getTransactionCategories() {
        const query = `
      query GetCategories {
        categories {
          id
          name
          icon
          color
          group {
            id
            name
            type
          }
          systemCategory
          isHidden
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.categories;
    }
    async createTransactionCategory(data) {
        const { name, groupId, icon, color } = data;
        const mutation = `
      mutation CreateCategory(
        $name: String!
        $groupId: String!
        $icon: String
        $color: String
      ) {
        createCategory(
          name: $name
          groupId: $groupId
          icon: $icon
          color: $color
        ) {
          category {
            id
            name
            icon
            color
            group {
              id
              name
              type
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { name, groupId, icon, color });
        if (result.createCategory.errors?.length > 0) {
            throw new Error(`Category creation failed: ${result.createCategory.errors[0].messages.join(', ')}`);
        }
        logger.info('Category created successfully:', result.createCategory.category.id);
        return result.createCategory.category;
    }
    async updateTransactionCategory(categoryId, data) {
        const mutation = `
      mutation UpdateCategory(
        $categoryId: String!
        $name: String
        $icon: String
        $color: String
      ) {
        updateCategory(
          categoryId: $categoryId
          name: $name
          icon: $icon
          color: $color
        ) {
          category {
            id
            name
            icon
            color
            group {
              id
              name
              type
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { categoryId, ...data });
        if (result.updateCategory.errors?.length > 0) {
            throw new Error(`Category update failed: ${result.updateCategory.errors[0].messages.join(', ')}`);
        }
        logger.info('Category updated successfully:', categoryId);
        return result.updateCategory.category;
    }
    async deleteTransactionCategory(categoryId) {
        const mutation = `
      mutation DeleteCategory($categoryId: String!) {
        deleteCategory(categoryId: $categoryId) {
          deleted
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { categoryId });
        if (result.deleteCategory.errors?.length > 0) {
            throw new Error(`Category deletion failed: ${result.deleteCategory.errors[0].messages.join(', ')}`);
        }
        logger.info('Category deleted successfully:', categoryId);
        return result.deleteCategory.deleted;
    }
    async getTransactionCategoryGroups() {
        const query = `
      query GetCategoryGroups {
        categoryGroups {
          id
          name
          type
          categories {
            id
            name
            icon
            color
          }
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.categoryGroups;
    }
    async getCategoryDetails(categoryId) {
        const query = `
      query GetCategoryDetails($categoryId: String!) {
        getCategoryDetails(categoryId: $categoryId) {
          id
          name
          icon
          color
          group {
            id
            name
            type
          }
          transactionCount
          totalAmount
          averageAmount
          monthlyBreakdown {
            month
            amount
            count
          }
          recentTransactions {
            id
            merchant {
              name
            }
            amount
            date
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { categoryId });
        return data.getCategoryDetails;
    }
    async getTransactionTags() {
        const query = `
      query GetTransactionTags {
        transactionTags {
          id
          name
          color
          transactionCount
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.transactionTags;
    }
    async createTransactionTag(data) {
        const { name, color } = data;
        const mutation = `
      mutation CreateTransactionTag($name: String!, $color: String!) {
        createTransactionTag(name: $name, color: $color) {
          tag {
            id
            name
            color
            transactionCount
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { name, color });
        if (result.createTransactionTag.errors?.length > 0) {
            throw new Error(`Tag creation failed: ${result.createTransactionTag.errors[0].messages.join(', ')}`);
        }
        logger.info('Transaction tag created successfully:', result.createTransactionTag.tag.id);
        return result.createTransactionTag.tag;
    }
    async setTransactionTags(transactionId, tagIds) {
        validateTransactionId(transactionId);
        const mutation = `
      mutation SetTransactionTags($transactionId: String!, $tagIds: [String!]!) {
        setTransactionTags(transactionId: $transactionId, tagIds: $tagIds) {
          transaction {
            id
            tags {
              id
              name
              color
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId, tagIds });
        if (result.setTransactionTags.errors?.length > 0) {
            throw new Error(`Set transaction tags failed: ${result.setTransactionTags.errors[0].messages.join(', ')}`);
        }
        logger.info('Transaction tags updated successfully:', transactionId);
        return result.setTransactionTags.transaction;
    }
    async getMerchants(options = {}) {
        // Note: Monarch's merchants query doesn't support search/limit params directly
        // Filter client-side if needed
        const query = `
      query Web_GetMerchants {
        merchants {
          id
          name
          transactionCount
          logoUrl
        }
      }
    `;
        const data = await this.graphql.query(query, {});
        let merchants = data.merchants.map(m => ({
            id: m.id,
            name: m.name,
            transactionCount: m.transactionCount,
            totalAmount: 0, // Not available in this query
            logoUrl: m.logoUrl,
        }));
        // Client-side filtering if search is provided
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            merchants = merchants.filter(m => m.name.toLowerCase().includes(searchLower));
        }
        // Client-side limit (handle limit=0 edge case)
        if (options.limit !== undefined && merchants.length > options.limit) {
            merchants = merchants.slice(0, options.limit);
        }
        return merchants;
    }
    async getMerchantDetails(merchantId) {
        const query = `
      query GetMerchantDetails($merchantId: String!) {
        getMerchantDetails(merchantId: $merchantId) {
          id
          name
          transactionCount
          totalAmount
          logoUrl
          categoryBreakdown {
            categoryId
            categoryName
            amount
            count
          }
          recentTransactions {
            id
            amount
            date
            account {
              displayName
            }
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { merchantId });
        return data.getMerchantDetails;
    }
    async getEditMerchant(merchantId) {
        const query = `
      query GetEditMerchant($merchantId: String!) {
        getEditMerchant(merchantId: $merchantId) {
          id
          name
          logoUrl
          suggestedCategories {
            id
            name
            confidence
          }
          recurringTransactionSettings {
            isRecurring
            frequency
            nextDate
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { merchantId });
        return data.getEditMerchant;
    }
    async getRecurringTransactions(options = {}) {
        const { startDate, endDate } = options;
        const query = `
      query GetRecurringTransactions($startDate: String, $endDate: String) {
        recurringTransactions(startDate: $startDate, endDate: $endDate) {
          id
          merchant {
            name
          }
          amount
          frequency
          nextDate
          category {
            id
            name
          }
          account {
            id
            displayName
          }
          isActive
          reviewStatus
        }
      }
    `;
        const data = await this.graphql.query(query, { startDate, endDate });
        return data.recurringTransactions;
    }
    /**
     * Get recurring transaction streams (flattened).
     * Returns a flat array of stream objects for convenience.
     *
     * Note: RecurringAPI.getRecurringStreams returns `{ stream: T }[]` (wrapped),
     * while this method returns `T[]` (unwrapped) for easier consumption.
     */
    async getRecurringStreams(options = {}) {
        const { includeLiabilities = true } = options;
        // FIXED: Use correct field name recurringTransactionStreams (not recurringStreams)
        const query = `
      query Web_GetRecurringStreams($includeLiabilities: Boolean) {
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
              name
            }
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { includeLiabilities });
        // Transform to flat array of streams
        return (data.recurringTransactionStreams || []).map(item => item.stream);
    }
    async getAggregatedRecurringItems(options) {
        const { startDate, endDate, groupBy = 'status', filters } = options;
        const query = `
      query GetAggregatedRecurringItems(
        $startDate: String!
        $endDate: String!
        $groupBy: String
        $filters: JSON
      ) {
        aggregatedRecurringItems(
          startDate: $startDate
          endDate: $endDate
          groupBy: $groupBy
          filters: $filters
        ) {
          totalAmount
          totalCount
          groupedData {
            groupKey
            amount
            count
            items {
              id
              merchant {
                name
              }
              amount
              date
            }
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { startDate, endDate, groupBy, filters });
        return data.aggregatedRecurringItems;
    }
    async getAllRecurringTransactionItems(options = {}) {
        const { filters, includeLiabilities = true } = options;
        const query = `
      query GetAllRecurringTransactionItems(
        $filters: JSON
        $includeLiabilities: Boolean
      ) {
        allRecurringTransactionItems(
          filters: $filters
          includeLiabilities: $includeLiabilities
        ) {
          id
          merchant {
            name
          }
          amount
          predictedDate
          category {
            id
            name
          }
          account {
            id
            displayName
          }
          confidence
          status
        }
      }
    `;
        const data = await this.graphql.query(query, { filters, includeLiabilities });
        return data.allRecurringTransactionItems;
    }
    async reviewRecurringStream(streamId, reviewStatus) {
        const mutation = `
      mutation ReviewStream($streamId: String!, $reviewStatus: String!) {
        reviewStream(streamId: $streamId, reviewStatus: $reviewStatus) {
          stream {
            id
            reviewStatus
            updatedAt
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { streamId, reviewStatus });
        if (result.reviewStream.errors?.length > 0) {
            throw new Error(`Stream review failed: ${result.reviewStream.errors[0].messages.join(', ')}`);
        }
        logger.info('Recurring stream reviewed successfully:', streamId);
        return result.reviewStream.stream;
    }
    async markStreamAsNotRecurring(streamId) {
        const mutation = `
      mutation MarkAsNotRecurring($streamId: String!) {
        markAsNotRecurring(streamId: $streamId) {
          success
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { streamId });
        if (result.markAsNotRecurring.errors?.length > 0) {
            throw new Error(`Mark as not recurring failed: ${result.markAsNotRecurring.errors[0].messages.join(', ')}`);
        }
        logger.info('Stream marked as not recurring successfully:', streamId);
        return result.markAsNotRecurring.success;
    }
    async getRecurringMerchantSearchStatus() {
        const query = `
      query RecurringMerchantSearch {
        recurringMerchantSearchStatus {
          isRunning
          lastRunAt
          completedCount
          totalCount
          estimatedTimeRemaining
        }
      }
    `;
        const data = await this.graphql.query(query);
        return data.recurringMerchantSearchStatus;
    }
    async bulkUpdateTransactions(data) {
        const { transactionIds, updates, excludedTransactionIds, allSelected = false, filters } = data;
        const mutation = `
      mutation BulkUpdateTransactions(
        $transactionIds: [String!]!
        $updates: JSON!
        $excludedTransactionIds: [String!]
        $allSelected: Boolean
        $filters: JSON
      ) {
        bulkUpdateTransactions(
          transactionIds: $transactionIds
          updates: $updates
          excludedTransactionIds: $excludedTransactionIds
          allSelected: $allSelected
          filters: $filters
        ) {
          affectedCount
          successful
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionIds, updates, excludedTransactionIds, allSelected, filters });
        if (result.bulkUpdateTransactions.errors && result.bulkUpdateTransactions.errors.length > 0) {
            throw new Error(`Bulk update failed: ${result.bulkUpdateTransactions.errors[0].messages.join(', ')}`);
        }
        logger.info('Bulk transaction update completed:', result.bulkUpdateTransactions.affectedCount);
        return result.bulkUpdateTransactions;
    }
    async bulkHideTransactions(transactionIds, filters) {
        return this.bulkUpdateTransactions({
            transactionIds,
            updates: { hide: true },
            filters
        });
    }
    async bulkUnhideTransactions(transactionIds, filters) {
        return this.bulkUpdateTransactions({
            transactionIds,
            updates: { hide: false },
            filters
        });
    }
    async getHiddenTransactions(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'date' } = options;
        const query = `
      query GetHiddenTransactions($limit: Int, $offset: Int, $orderBy: String) {
        hiddenTransactions(limit: $limit, offset: $offset, orderBy: $orderBy) {
          totalCount
          results {
            id
            amount
            date
            merchant {
              name
            }
            category {
              id
              name
            }
            account {
              id
              displayName
            }
            isHide
          }
        }
      }
    `;
        const data = await this.graphql.query(query, { limit, offset, orderBy });
        return {
            transactions: data.hiddenTransactions.results,
            totalCount: data.hiddenTransactions.totalCount,
            hasMore: offset + limit < data.hiddenTransactions.totalCount,
            limit,
            offset
        };
    }
}
//# sourceMappingURL=TransactionsAPI.js.map
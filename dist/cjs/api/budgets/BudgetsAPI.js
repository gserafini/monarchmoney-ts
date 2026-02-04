"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetsAPIImpl = void 0;
const utils_1 = require("../../utils");
class BudgetsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getBudgets(options = {}) {
        const { startDate, endDate } = options;
        // Use current month if no dates provided
        const now = new Date();
        const defaultStartDate = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const defaultEndDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        if (startDate && endDate) {
            (0, utils_1.validateDateRange)(startDate, endDate);
        }
        // FIXED: Use exact Python library query structure
        const query = `
      query Common_GetJointPlanningData($startDate: Date!, $endDate: Date!) {
        budgetSystem
        budgetData(startMonth: $startDate, endMonth: $endDate) {
          monthlyAmountsByCategory {
            category {
              id
              __typename
            }
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          monthlyAmountsByCategoryGroup {
            categoryGroup {
              id
              __typename
            }
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          monthlyAmountsForFlexExpense {
            budgetVariability
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          totalsByMonth {
            month
            totalIncome {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalFixedExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalNonMonthlyExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalFlexibleExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            __typename
          }
          __typename
        }
        categoryGroups {
          id
          name
          order
          type
          budgetVariability
          updatedAt
          groupLevelBudgetingEnabled
          categories {
            id
            name
            icon
            order
            budgetVariability
            excludeFromBudget
            isSystemCategory
            updatedAt
            group {
              id
              type
              budgetVariability
              groupLevelBudgetingEnabled
              __typename
            }
            __typename
          }
          __typename
        }
        goalsV2 {
          id
          name
          archivedAt
          completedAt
          priority
          imageStorageProvider
          imageStorageProviderId
          plannedContributions(startMonth: $startDate, endMonth: $endDate) {
            id
            month
            amount
            __typename
          }
          monthlyContributionSummaries(startMonth: $startDate, endMonth: $endDate) {
            month
            sum
            __typename
          }
          __typename
        }
      }
    `;
        const data = await this.graphql.query(query, {
            startDate: defaultStartDate,
            endDate: defaultEndDate
        });
        utils_1.logger.debug('Retrieved budget data using Python library schema');
        return data;
    }
    async setBudgetAmount(params) {
        const { amount, categoryId, categoryGroupId, timeframe = 'month', startDate, applyToFuture = false } = params;
        if (categoryId && categoryGroupId) {
            throw new Error('Cannot specify both categoryId and categoryGroupId');
        }
        if (!categoryId && !categoryGroupId) {
            throw new Error('Must specify either categoryId or categoryGroupId');
        }
        if (startDate) {
            (0, utils_1.validateDate)(startDate);
        }
        const mutation = `
      mutation UpdateBudgetItem(
        $amount: Float!
        $categoryId: String
        $categoryGroupId: String
        $timeframe: String!
        $startDate: String
        $applyToFuture: Boolean!
      ) {
        updateBudgetItem(
          amount: $amount
          categoryId: $categoryId
          categoryGroupId: $categoryGroupId
          timeframe: $timeframe
          startDate: $startDate
          applyToFuture: $applyToFuture
        ) {
          budgetItem {
            id
            amount
            categoryId
            categoryGroupId
            timeframe
            startDate
            endDate
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { amount, categoryId, categoryGroupId, timeframe, startDate, applyToFuture });
        if (result.updateBudgetItem.errors?.length > 0) {
            throw new Error(`Budget update failed: ${result.updateBudgetItem.errors[0].messages.join(', ')}`);
        }
        utils_1.logger.info('Budget amount updated successfully');
        return result.updateBudgetItem.budgetItem;
    }
    async getGoals() {
        // FIXED: The standalone goals query uses wrong fields.
        // Extract goals from getBudgets() which returns goalsV2 with correct schema.
        const budgetData = await this.getBudgets();
        // Map goalsV2 to Goal interface shape with proper field mapping
        const goalsV2 = budgetData.goalsV2 || [];
        return goalsV2.map((goal) => {
            // Calculate targetAmount from plannedContributions array if targetAmount not directly available
            const plannedContributionsSum = Array.isArray(goal.plannedContributions)
                ? goal.plannedContributions.reduce((sum, contrib) => sum + (typeof contrib.amount === 'number' ? contrib.amount : 0), 0)
                : 0;
            // Calculate currentAmount from monthlyContributionSummaries if not directly available
            const monthlyContributionsSum = Array.isArray(goal.monthlyContributionSummaries)
                ? goal.monthlyContributionSummaries.reduce((sum, summary) => sum + (typeof summary.sum === 'number' ? summary.sum : 0), 0)
                : 0;
            return {
                id: goal.id,
                name: goal.name || '',
                targetAmount: goal.targetAmount ?? plannedContributionsSum,
                currentAmount: goal.currentAmount ?? monthlyContributionsSum,
                targetDate: goal.targetDate,
                createdAt: goal.createdAt ?? new Date().toISOString(),
                updatedAt: goal.updatedAt ?? new Date().toISOString(),
                completedAt: goal.completedAt,
            };
        });
    }
    async createGoal(params) {
        const { name, targetAmount, targetDate, description, categoryId, accountIds } = params;
        if (name.length < 1 || name.length > 100) {
            throw new Error('Goal name must be between 1 and 100 characters');
        }
        if (description && description.length > 500) {
            throw new Error('Goal description must be 500 characters or less');
        }
        if (targetDate) {
            (0, utils_1.validateDate)(targetDate);
        }
        const mutation = `
      mutation CreateGoal(
        $name: String!
        $targetAmount: Float!
        $targetDate: String
        $description: String
        $categoryId: String
        $accountIds: [String!]
      ) {
        createGoal(
          name: $name
          targetAmount: $targetAmount
          targetDate: $targetDate
          description: $description
          categoryId: $categoryId
          accountIds: $accountIds
        ) {
          goal {
            id
            name
            description
            targetAmount
            currentAmount
            targetDate
            progress
            createdAt
            category {
              id
              name
            }
            accounts {
              id
              displayName
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { name, targetAmount, targetDate, description, categoryId, accountIds });
        if (result.createGoal.errors && result.createGoal.errors.length > 0) {
            throw new Error(`Goal creation failed: ${result.createGoal.errors[0].messages.join(', ')}`);
        }
        utils_1.logger.info('Goal created successfully:', result.createGoal.goal.id);
        return result.createGoal;
    }
    async updateGoal(goalId, updates) {
        if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
            throw new Error('Goal name must be between 1 and 100 characters');
        }
        if (updates.description && updates.description.length > 500) {
            throw new Error('Goal description must be 500 characters or less');
        }
        if (updates.targetDate) {
            (0, utils_1.validateDate)(updates.targetDate);
        }
        const mutation = `
      mutation UpdateGoal(
        $goalId: String!
        $name: String
        $targetAmount: Float
        $targetDate: String
        $description: String
        $isCompleted: Boolean
      ) {
        updateGoal(
          goalId: $goalId
          name: $name
          targetAmount: $targetAmount
          targetDate: $targetDate
          description: $description
          isCompleted: $isCompleted
        ) {
          goal {
            id
            name
            description
            targetAmount
            currentAmount
            targetDate
            progress
            completedAt
            updatedAt
          }
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { goalId, ...updates });
        if (result.updateGoal.errors && result.updateGoal.errors.length > 0) {
            throw new Error(`Goal update failed: ${result.updateGoal.errors[0].messages.join(', ')}`);
        }
        utils_1.logger.info('Goal updated successfully:', goalId);
        return result.updateGoal;
    }
    async deleteGoal(goalId) {
        const mutation = `
      mutation DeleteGoal($goalId: String!) {
        deleteGoal(goalId: $goalId) {
          deleted
          errors {
            field
            messages
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { goalId });
        if (result.deleteGoal.errors?.length > 0) {
            throw new Error(`Goal deletion failed: ${result.deleteGoal.errors[0].messages.join(', ')}`);
        }
        utils_1.logger.info('Goal deleted successfully:', goalId);
        return result.deleteGoal.deleted;
    }
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.cashflow.getCashflow()` instead which uses the correct API.
     */
    async getCashFlow(_options = {}) {
        throw new Error('BudgetsAPI.getCashFlow() is deprecated due to broken GraphQL schema. ' +
            'Use client.cashflow.getCashflow() instead.');
    }
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.cashflow.getCashflowSummary()` instead which uses the correct API.
     */
    async getCashFlowSummary(_options = {}) {
        throw new Error('BudgetsAPI.getCashFlowSummary() is deprecated due to broken GraphQL schema. ' +
            'Use client.cashflow.getCashflowSummary() instead.');
    }
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.recurring.getRecurringStreams()` instead and filter for
     * `recurringType === 'expense'` to get bills.
     */
    async getBills(_options = {}) {
        throw new Error('BudgetsAPI.getBills() is deprecated due to broken GraphQL schema. ' +
            'Use client.recurring.getRecurringStreams() and filter for recurringType === "expense" instead.');
    }
}
exports.BudgetsAPIImpl = BudgetsAPIImpl;
//# sourceMappingURL=BudgetsAPI.js.map
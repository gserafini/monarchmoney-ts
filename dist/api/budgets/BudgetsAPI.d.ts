import { GraphQLClient } from '../../client/graphql';
import { BudgetItem, Goal, CashFlowData, CashFlowSummary, BillsData } from '../../types';
export interface BudgetsAPI {
    getBudgets(options?: BudgetOptions): Promise<BudgetData>;
    setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem>;
    getGoals(): Promise<Goal[]>;
    createGoal(params: CreateGoalParams): Promise<CreateGoalResponse>;
    updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse>;
    deleteGoal(goalId: string): Promise<boolean>;
    getCashFlow(options?: CashFlowOptions): Promise<CashFlowData>;
    getCashFlowSummary(options?: CashFlowSummaryOptions): Promise<CashFlowSummary>;
    getBills(options?: BillsOptions): Promise<BillsData>;
}
export interface BudgetOptions {
    startDate?: string;
    endDate?: string;
    categoryIds?: string[];
}
export interface BudgetData {
    budgetSystem: string;
    budgetData: {
        monthlyAmountsByCategory: Array<{
            category: {
                id: string;
            };
            monthlyAmounts: Array<{
                month: string;
                plannedCashFlowAmount: number;
                plannedSetAsideAmount: number;
                actualAmount: number;
                remainingAmount: number;
                previousMonthRolloverAmount: number;
                rolloverType: string;
                cumulativeActualAmount: number;
                rolloverTargetAmount: number;
            }>;
        }>;
        monthlyAmountsByCategoryGroup: Array<{
            categoryGroup: {
                id: string;
            };
            monthlyAmounts: Array<{
                month: string;
                plannedCashFlowAmount: number;
                plannedSetAsideAmount: number;
                actualAmount: number;
                remainingAmount: number;
                previousMonthRolloverAmount: number;
                rolloverType: string;
                cumulativeActualAmount: number;
                rolloverTargetAmount: number;
            }>;
        }>;
        monthlyAmountsForFlexExpense: {
            budgetVariability: string;
            monthlyAmounts: Array<{
                month: string;
                plannedCashFlowAmount: number;
                plannedSetAsideAmount: number;
                actualAmount: number;
                remainingAmount: number;
                previousMonthRolloverAmount: number;
                rolloverType: string;
                cumulativeActualAmount: number;
                rolloverTargetAmount: number;
            }>;
        };
        totalsByMonth: Array<{
            month: string;
            totalIncome: {
                actualAmount: number;
                plannedAmount: number;
                previousMonthRolloverAmount: number;
                remainingAmount: number;
            };
            totalExpenses: {
                actualAmount: number;
                plannedAmount: number;
                previousMonthRolloverAmount: number;
                remainingAmount: number;
            };
            totalFixedExpenses: {
                actualAmount: number;
                plannedAmount: number;
                previousMonthRolloverAmount: number;
                remainingAmount: number;
            };
            totalNonMonthlyExpenses: {
                actualAmount: number;
                plannedAmount: number;
                previousMonthRolloverAmount: number;
                remainingAmount: number;
            };
            totalFlexibleExpenses: {
                actualAmount: number;
                plannedAmount: number;
                previousMonthRolloverAmount: number;
                remainingAmount: number;
            };
        }>;
    };
    categoryGroups: Array<{
        id: string;
        name: string;
        order: number;
        type: string;
        budgetVariability: string;
        updatedAt: string;
        groupLevelBudgetingEnabled: boolean;
        categories: Array<{
            id: string;
            name: string;
            icon: string;
            order: number;
            budgetVariability: string;
            excludeFromBudget: boolean;
            isSystemCategory: boolean;
            updatedAt: string;
            group: {
                id: string;
                type: string;
                budgetVariability: string;
                groupLevelBudgetingEnabled: boolean;
            };
        }>;
    }>;
    goalsV2: Array<{
        id: string;
        name: string;
        archivedAt?: string;
        completedAt?: string;
        priority: string;
        imageStorageProvider?: string;
        imageStorageProviderId?: string;
        plannedContributions: Array<{
            id: string;
            month: string;
            amount: number;
        }>;
        monthlyContributionSummaries: Array<{
            month: string;
            sum: number;
        }>;
    }>;
}
export interface BudgetCategory {
    categoryId: string;
    categoryName: string;
    plannedAmount: number;
    actualAmount: number;
    remainingAmount: number;
    percentSpent: number;
}
export interface BudgetCategoryGroup {
    id: string;
    name: string;
    categories: BudgetCategory[];
}
export interface BudgetAmountParams {
    amount: number;
    categoryId?: string;
    categoryGroupId?: string;
    timeframe?: string;
    startDate?: string;
    applyToFuture?: boolean;
}
export interface CreateGoalParams {
    name: string;
    targetAmount: number;
    targetDate?: string;
    description?: string;
    categoryId?: string;
    accountIds?: string[];
}
export interface CreateGoalResponse {
    goal: Goal;
    errors?: any[];
}
export interface UpdateGoalParams {
    name?: string;
    targetAmount?: number;
    targetDate?: string;
    description?: string;
    isCompleted?: boolean;
}
export interface UpdateGoalResponse {
    goal: Goal;
    errors?: any[];
}
export interface CashFlowOptions {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
    limit?: number;
}
export interface CashFlowSummaryOptions {
    startDate?: string;
    endDate?: string;
}
export interface BillsOptions {
    startDate?: string;
    endDate?: string;
    includeCompleted?: boolean;
    limit?: number;
}
export declare class BudgetsAPIImpl implements BudgetsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getBudgets(options?: BudgetOptions): Promise<BudgetData>;
    setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem>;
    getGoals(): Promise<Goal[]>;
    createGoal(params: CreateGoalParams): Promise<CreateGoalResponse>;
    updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse>;
    deleteGoal(goalId: string): Promise<boolean>;
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.cashflow.getCashflow()` instead which uses the correct API.
     */
    getCashFlow(_options?: CashFlowOptions): Promise<CashFlowData>;
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.cashflow.getCashflowSummary()` instead which uses the correct API.
     */
    getCashFlowSummary(_options?: CashFlowSummaryOptions): Promise<CashFlowSummary>;
    /**
     * @deprecated This method uses a broken GraphQL query.
     * Use `client.recurring.getRecurringStreams()` instead and filter for
     * `recurringType === 'expense'` to get bills.
     */
    getBills(_options?: BillsOptions): Promise<BillsData>;
}
//# sourceMappingURL=BudgetsAPI.d.ts.map
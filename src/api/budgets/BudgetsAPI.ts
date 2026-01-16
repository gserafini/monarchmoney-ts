import { GraphQLClient } from '../../client/graphql'
import { 
  BudgetItem,
  Goal,
  CashFlowData,
  CashFlowSummary,
  BillsData
} from '../../types'
import {
  validateDate,
  validateDateRange,
  logger
} from '../../utils'

export interface BudgetsAPI {
  // Budget management
  getBudgets(options?: BudgetOptions): Promise<BudgetData>
  setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem>

  // Goals management  
  getGoals(): Promise<Goal[]>
  createGoal(params: CreateGoalParams): Promise<CreateGoalResponse>
  updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse>
  deleteGoal(goalId: string): Promise<boolean>

  // Cash flow analysis
  getCashFlow(options?: CashFlowOptions): Promise<CashFlowData>
  getCashFlowSummary(options?: CashFlowSummaryOptions): Promise<CashFlowSummary>

  // Bills tracking
  getBills(options?: BillsOptions): Promise<BillsData>
}

// Input/Options interfaces
export interface BudgetOptions {
  startDate?: string
  endDate?: string
  categoryIds?: string[]
}

export interface BudgetData {
  budgetSystem: string
  budgetData: {
    monthlyAmountsByCategory: Array<{
      category: { id: string }
      monthlyAmounts: Array<{
        month: string
        plannedCashFlowAmount: number
        plannedSetAsideAmount: number
        actualAmount: number
        remainingAmount: number
        previousMonthRolloverAmount: number
        rolloverType: string
        cumulativeActualAmount: number
        rolloverTargetAmount: number
      }>
    }>
    monthlyAmountsByCategoryGroup: Array<{
      categoryGroup: { id: string }
      monthlyAmounts: Array<{
        month: string
        plannedCashFlowAmount: number
        plannedSetAsideAmount: number
        actualAmount: number
        remainingAmount: number
        previousMonthRolloverAmount: number
        rolloverType: string
        cumulativeActualAmount: number
        rolloverTargetAmount: number
      }>
    }>
    monthlyAmountsForFlexExpense: {
      budgetVariability: string
      monthlyAmounts: Array<{
        month: string
        plannedCashFlowAmount: number
        plannedSetAsideAmount: number
        actualAmount: number
        remainingAmount: number
        previousMonthRolloverAmount: number
        rolloverType: string
        cumulativeActualAmount: number
        rolloverTargetAmount: number
      }>
    }
    totalsByMonth: Array<{
      month: string
      totalIncome: {
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalExpenses: {
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalFixedExpenses: {
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalNonMonthlyExpenses: {
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalFlexibleExpenses: {
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
    }>
  }
  categoryGroups: Array<{
    id: string
    name: string
    order: number
    type: string
    budgetVariability: string
    updatedAt: string
    groupLevelBudgetingEnabled: boolean
    categories: Array<{
      id: string
      name: string
      icon: string
      order: number
      budgetVariability: string
      excludeFromBudget: boolean
      isSystemCategory: boolean
      updatedAt: string
      group: {
        id: string
        type: string
        budgetVariability: string
        groupLevelBudgetingEnabled: boolean
      }
    }>
  }>
  goalsV2: Array<{
    id: string
    name: string
    archivedAt?: string
    completedAt?: string
    priority: string
    imageStorageProvider?: string
    imageStorageProviderId?: string
    plannedContributions: Array<{
      id: string
      month: string
      amount: number
    }>
    monthlyContributionSummaries: Array<{
      month: string
      sum: number
    }>
  }>
}

export interface BudgetCategory {
  categoryId: string
  categoryName: string
  plannedAmount: number
  actualAmount: number
  remainingAmount: number
  percentSpent: number
}

export interface BudgetCategoryGroup {
  id: string
  name: string
  categories: BudgetCategory[]
}

export interface BudgetAmountParams {
  amount: number
  categoryId?: string
  categoryGroupId?: string
  timeframe?: string
  startDate?: string
  applyToFuture?: boolean
}

export interface CreateGoalParams {
  name: string
  targetAmount: number
  targetDate?: string
  description?: string
  categoryId?: string
  accountIds?: string[]
}

export interface CreateGoalResponse {
  goal: Goal
  errors?: any[]
}

export interface UpdateGoalParams {
  name?: string
  targetAmount?: number
  targetDate?: string
  description?: string
  isCompleted?: boolean
}

export interface UpdateGoalResponse {
  goal: Goal
  errors?: any[]
}

export interface CashFlowOptions {
  startDate?: string
  endDate?: string
  groupBy?: string
  limit?: number
}

export interface CashFlowSummaryOptions {
  startDate?: string
  endDate?: string
}

export interface BillsOptions {
  startDate?: string
  endDate?: string
  includeCompleted?: boolean
  limit?: number
}

export class BudgetsAPIImpl implements BudgetsAPI {
  constructor(private graphql: GraphQLClient) {}

  async getBudgets(options: BudgetOptions = {}): Promise<BudgetData> {
    const { startDate, endDate } = options

    // Use current month if no dates provided
    const now = new Date()
    const defaultStartDate = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const defaultEndDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
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
    `

    const data = await this.graphql.query<BudgetData>(query, { 
      startDate: defaultStartDate, 
      endDate: defaultEndDate 
    })

    logger.debug('Retrieved budget data using Python library schema')
    return data
  }

  async setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem> {
    const {
      amount,
      categoryId,
      categoryGroupId,
      timeframe = 'month',
      startDate,
      applyToFuture = false
    } = params

    if (categoryId && categoryGroupId) {
      throw new Error('Cannot specify both categoryId and categoryGroupId')
    }

    if (!categoryId && !categoryGroupId) {
      throw new Error('Must specify either categoryId or categoryGroupId')
    }

    if (startDate) {
      validateDate(startDate)
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
    `

    const result = await this.graphql.mutation<{
      updateBudgetItem: {
        budgetItem: BudgetItem
        errors: any[]
      }
    }>(mutation, { amount, categoryId, categoryGroupId, timeframe, startDate, applyToFuture })

    if (result.updateBudgetItem.errors?.length > 0) {
      throw new Error(`Budget update failed: ${result.updateBudgetItem.errors[0].messages.join(', ')}`)
    }

    logger.info('Budget amount updated successfully')
    return result.updateBudgetItem.budgetItem
  }

  async getGoals(): Promise<Goal[]> {
    // FIXED: The standalone goals query uses wrong fields.
    // Extract goals from getBudgets() which returns goalsV2 with correct schema.
    const budgetData = await this.getBudgets()

    // Map goalsV2 to Goal interface shape with proper field mapping
    const goalsV2 = (budgetData as any).goalsV2 || []

    return goalsV2.map((goal: any): Goal => {
      // Calculate targetAmount from plannedContributions array if targetAmount not directly available
      const plannedContributionsSum = Array.isArray(goal.plannedContributions)
        ? goal.plannedContributions.reduce(
            (sum: number, contrib: { amount?: number }) =>
              sum + (typeof contrib.amount === 'number' ? contrib.amount : 0),
            0
          )
        : 0

      // Calculate currentAmount from monthlyContributionSummaries if not directly available
      const monthlyContributionsSum = Array.isArray(goal.monthlyContributionSummaries)
        ? goal.monthlyContributionSummaries.reduce(
            (sum: number, summary: { sum?: number }) =>
              sum + (typeof summary.sum === 'number' ? summary.sum : 0),
            0
          )
        : 0

      return {
        id: goal.id,
        name: goal.name || '',
        targetAmount: goal.targetAmount ?? plannedContributionsSum,
        currentAmount: goal.currentAmount ?? monthlyContributionsSum,
        targetDate: goal.targetDate ?? undefined,
        createdAt: goal.createdAt ?? new Date().toISOString(),
        updatedAt: goal.updatedAt ?? new Date().toISOString(),
        completedAt: goal.completedAt ?? undefined,
      }
    })
  }

  async createGoal(params: CreateGoalParams): Promise<CreateGoalResponse> {
    const { name, targetAmount, targetDate, description, categoryId, accountIds } = params

    if (name.length < 1 || name.length > 100) {
      throw new Error('Goal name must be between 1 and 100 characters')
    }

    if (description && description.length > 500) {
      throw new Error('Goal description must be 500 characters or less')
    }

    if (targetDate) {
      validateDate(targetDate)
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
    `

    const result = await this.graphql.mutation<{
      createGoal: CreateGoalResponse
    }>(mutation, { name, targetAmount, targetDate, description, categoryId, accountIds })

    if (result.createGoal.errors && result.createGoal.errors.length > 0) {
      throw new Error(`Goal creation failed: ${result.createGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('Goal created successfully:', result.createGoal.goal.id)
    return result.createGoal
  }

  async updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse> {
    if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
      throw new Error('Goal name must be between 1 and 100 characters')
    }

    if (updates.description && updates.description.length > 500) {
      throw new Error('Goal description must be 500 characters or less')
    }

    if (updates.targetDate) {
      validateDate(updates.targetDate)
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
    `

    const result = await this.graphql.mutation<{
      updateGoal: UpdateGoalResponse
    }>(mutation, { goalId, ...updates })

    if (result.updateGoal.errors && result.updateGoal.errors.length > 0) {
      throw new Error(`Goal update failed: ${result.updateGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('Goal updated successfully:', goalId)
    return result.updateGoal
  }

  async deleteGoal(goalId: string): Promise<boolean> {
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
    `

    const result = await this.graphql.mutation<{
      deleteGoal: {
        deleted: boolean
        errors: any[]
      }
    }>(mutation, { goalId })

    if (result.deleteGoal.errors?.length > 0) {
      throw new Error(`Goal deletion failed: ${result.deleteGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('Goal deleted successfully:', goalId)
    return result.deleteGoal.deleted
  }

  /**
   * @deprecated This method uses a broken GraphQL query.
   * Use `client.cashflow.getCashflow()` instead which uses the correct API.
   */
  async getCashFlow(_options: CashFlowOptions = {}): Promise<CashFlowData> {
    throw new Error(
      'BudgetsAPI.getCashFlow() is deprecated due to broken GraphQL schema. ' +
      'Use client.cashflow.getCashflow() instead.'
    )
  }

  /**
   * @deprecated This method uses a broken GraphQL query.
   * Use `client.cashflow.getCashflowSummary()` instead which uses the correct API.
   */
  async getCashFlowSummary(_options: CashFlowSummaryOptions = {}): Promise<CashFlowSummary> {
    throw new Error(
      'BudgetsAPI.getCashFlowSummary() is deprecated due to broken GraphQL schema. ' +
      'Use client.cashflow.getCashflowSummary() instead.'
    )
  }

  /**
   * @deprecated This method uses a broken GraphQL query.
   * Use `client.recurring.getRecurringStreams()` instead and filter for
   * `recurringType === 'expense'` to get bills.
   */
  async getBills(_options: BillsOptions = {}): Promise<BillsData> {
    throw new Error(
      'BudgetsAPI.getBills() is deprecated due to broken GraphQL schema. ' +
      'Use client.recurring.getRecurringStreams() and filter for recurringType === "expense" instead.'
    )
  }
}
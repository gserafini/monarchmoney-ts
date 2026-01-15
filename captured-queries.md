# Captured GraphQL Queries from Monarch Money Web App

Captured: 2026-01-15

## Investment Queries

### Web_GetPortfolio
```graphql
query Web_GetPortfolio($portfolioInput: PortfolioInput) {
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
        __typename
      }
      benchmarks {
        security {
          id
          ticker
          name
          oneDayChangePercent
          __typename
        }
        historicalChart {
          date
          returnPercent
          __typename
        }
        __typename
      }
      __typename
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
                __typename
              }
              type {
                name
                display
                __typename
              }
              subtype {
                name
                display
                __typename
              }
              displayName
              currentBalance
              __typename
            }
            taxLots {
              id
              createdAt
              acquisitionDate
              acquisitionQuantity
              costBasisPerUnit
              __typename
            }
            __typename
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
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
```

Variables:
```json
{
  "portfolioInput": {}
}
```

### Web_GetAllocation
```graphql
query Web_GetAllocation($porfolioInput: PortfolioInput) {
  portfolio(input: $porfolioInput) {
    allocationSimple {
      type
      typeDisplay
      allocationPercent
      totalValue
      __typename
    }
    performance {
      totalValue
      __typename
    }
    __typename
  }
}
```

### Web_GetSecuritiesHistoricalPerformance
```graphql
query Web_GetSecuritiesHistoricalPerformance($input: SecurityHistoricalPerformanceInput!) {
  securityHistoricalPerformance(input: $input) {
    security {
      id
      __typename
    }
    historicalChart {
      date
      returnPercent
      __typename
    }
    __typename
  }
}
```

Variables:
```json
{
  "input": {
    "securityIds": [],
    "startDate": "2025-12-15",
    "endDate": "2026-01-15"
  }
}
```

## Report Queries

### Common_GetReportsData
```graphql
query Common_GetReportsData($filters: TransactionFilterInput!, $groupBy: [ReportsGroupByEntity!], $groupByTimeframe: ReportsGroupByTimeframe, $sortBy: ReportsSortBy, $includeCategory: Boolean = false, $includeCategoryGroup: Boolean = false, $includeMerchant: Boolean = false, $fillEmptyValues: Boolean = true) {
  reports(
    groupBy: $groupBy
    groupByTimeframe: $groupByTimeframe
    filters: $filters
    sortBy: $sortBy
    fillEmptyValues: $fillEmptyValues
  ) {
    groupBy {
      date
      ...ReportsCategoryFields @include(if: $includeCategory)
      ...ReportsCategoryGroupFields @include(if: $includeCategoryGroup)
      ...ReportsMerchantFields @include(if: $includeMerchant)
      __typename
    }
    summary {
      ...ReportsSummaryFields
      __typename
    }
    __typename
  }
  aggregates(filters: $filters, fillEmptyValues: $fillEmptyValues) {
    summary {
      ...ReportsSummaryFields
      __typename
    }
    __typename
  }
}

fragment ReportsCategoryFields on ReportsGroupByData {
  category {
    id
    name
    icon
    group {
      id
      name
      type
      __typename
    }
    __typename
  }
  __typename
}

fragment ReportsCategoryGroupFields on ReportsGroupByData {
  categoryGroup {
    id
    name
    type
    __typename
  }
  __typename
}

fragment ReportsMerchantFields on ReportsGroupByData {
  merchant {
    id
    name
    __typename
  }
  __typename
}

fragment ReportsSummaryFields on TransactionsSummary {
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
  __typename
}
```

Variables:
```json
{
  "includeCategory": true,
  "includeCategoryGroup": true,
  "includeMerchant": false,
  "fillEmptyValues": true,
  "filters": {
    "transactionVisibility": "non_hidden_transactions_only"
  },
  "groupBy": ["category", "category_group"]
}
```

### Web_GetReportConfigurations
```graphql
query Web_GetReportConfigurations {
  reportConfigurations {
    ...ReportConfigurationFields
    __typename
  }
}

fragment TransactionFilterSetFields on TransactionFilterSet {
  id
  displayName
  categories {
    id
    name
    icon
    __typename
  }
  categoryGroups {
    id
    name
    type
    __typename
  }
  accounts {
    id
    displayName
    logoUrl
    icon
    __typename
  }
  merchants {
    id
    name
    logoUrl
    __typename
  }
  tags {
    id
    name
    color
    __typename
  }
  isUntagged
  goals {
    id
    name
    imageStorageProvider
    imageStorageProviderId
    __typename
  }
  savingsGoals {
    id
    name
    imageStorageProvider
    imageStorageProviderId
    __typename
  }
  searchQuery
  systemCategories
  systemCategoryGroups
  isUncategorized
  budgetVariability
  isFlexSpending
  startDate
  endDate
  timeframePeriod {
    unit
    value
    includeCurrent
    __typename
  }
  createdBefore
  createdAfter
  absAmountGte
  absAmountLte
  isSplit
  isRecurring
  isInvestmentAccount
  isPending
  creditsOnly
  debitsOnly
  hasNotes
  hasAttachments
  hiddenFromReports
  importedFromMint
  syncedFromInstitution
  needsReview
  needsReviewUnassigned
  needsReviewByUser {
    id
    name
    __typename
  }
  ownershipSet {
    includeJointlyOwned
    users {
      id
      name
      profilePictureUrl
      __typename
    }
    __typename
  }
  __typename
}

fragment ReportConfigurationFields on ReportConfiguration {
  id
  displayName
  transactionFilterSet {
    ...TransactionFilterSetFields
    __typename
  }
  reportView {
    analysisScope
    chartType
    chartCalculation
    chartLayout
    chartDensity
    dimensions
    timeframe
    __typename
  }
  __typename
}
```

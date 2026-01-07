import { GraphQLClient } from '../../core/transport/graphql.js';

export interface InvestmentAccount {
  id: string;
  displayName?: string;
  isTaxable?: boolean;
  icon?: string;
  order?: number;
  logoUrl?: string | null;
  includeInNetWorth?: boolean;
  syncDisabled?: boolean;
}

export interface PortfolioResponse {
  performance?: unknown;
  aggregateHoldings?: unknown;
}

export interface AllocationResponse {
  portfolio?: {
    allocationSimple?: unknown;
    performance?: unknown;
  };
}

export interface SecurityPerformance {
  securityHistoricalPerformance: unknown[];
}

export interface SpinwheelCreditReport {
  spinwheelUser: unknown;
  creditReportLiabilityAccounts: unknown[];
}

const WEB_GET_INVESTMENTS_ACCOUNTS = /* GraphQL */ `
  query Web_GetInvestmentsAccounts {
    accounts {
      id
      displayName
      isTaxable
      icon
      order
      logoUrl
      includeInNetWorth
      syncDisabled
      __typename
    }
  }
`;

const WEB_GET_PORTFOLIO = /* GraphQL */ `
  query Web_GetPortfolio($portfolioInput: PortfolioInput!) {
    portfolio(portfolioInput: $portfolioInput) {
      performance
      aggregateHoldings
      __typename
    }
  }
`;

const WEB_GET_ALLOCATION = /* GraphQL */ `
  query Web_GetAllocation($portfolioInput: PortfolioInput!) {
    portfolio(portfolioInput: $portfolioInput) {
      allocationSimple
      performance
      __typename
    }
  }
`;

const WEB_GET_SECURITIES_PERFORMANCE = /* GraphQL */ `
  query Web_GetSecuritiesHistoricalPerformance($input: SecuritiesHistoricalPerformanceInput!) {
    securityHistoricalPerformance(input: $input)
  }
`;

const COMMON_GET_SPINWHEEL_CREDIT_REPORT = /* GraphQL */ `
  query Common_GetSpinwheelCreditReport {
    spinwheelUser {
      id
      user
      onboardingStatus
      onboardingErrorMessage
      isBillSyncTrackingEnabled
      __typename
    }
    creditReportLiabilityAccounts {
      spinwheelLiabilityId
      liabilityType
      isOpen
      currentTotalBalance
      account
      description
      termsFrequency
      spinwheelUser
      __typename
    }
  }
`;

export class PortfolioClient {
  constructor(private graphql: GraphQLClient) {}

  async listInvestmentAccounts(): Promise<InvestmentAccount[]> {
    const data = await this.graphql.query<{ accounts: InvestmentAccount[] }>(WEB_GET_INVESTMENTS_ACCOUNTS);
    return data.accounts;
  }

  async getPortfolio(portfolioInput: Record<string, unknown>): Promise<PortfolioResponse> {
    const data = await this.graphql.query<{ portfolio: PortfolioResponse }>(WEB_GET_PORTFOLIO, { portfolioInput });
    return data.portfolio;
  }

  async getAllocation(portfolioInput: Record<string, unknown>): Promise<AllocationResponse> {
    const data = await this.graphql.query<AllocationResponse>(WEB_GET_ALLOCATION, { portfolioInput });
    return data;
  }

  async getSecuritiesPerformance(input: Record<string, unknown>): Promise<SecurityPerformance> {
    const data = await this.graphql.query<SecurityPerformance>(WEB_GET_SECURITIES_PERFORMANCE, { input });
    return data;
  }

  async getSpinwheelCreditReport(): Promise<SpinwheelCreditReport> {
    const data = await this.graphql.query<SpinwheelCreditReport>(COMMON_GET_SPINWHEEL_CREDIT_REPORT);
    return data;
  }
}

import { GraphQLClient } from '../../client/graphql';
export interface ReportConfiguration {
    id: string;
    name: string;
    type: 'spending' | 'income' | 'net_worth' | 'cashflow' | 'custom';
    dateRange: {
        startDate: string;
        endDate: string;
        preset?: string;
    };
    filters?: {
        accounts?: string[];
        categories?: string[];
        tags?: string[];
    };
    groupBy?: 'category' | 'merchant' | 'account' | 'month' | 'week';
    includeSubcategories?: boolean;
}
export interface ReportData {
    id: string;
    name: string;
    type: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    summary: {
        total: number;
        average: number;
        count: number;
    };
    breakdown: Array<{
        label: string;
        value: number;
        percentage: number;
        count: number;
    }>;
    timeSeries?: Array<{
        date: string;
        value: number;
    }>;
}
export interface TransactionExportSession {
    sessionId: string;
    downloadUrl: string;
    expiresAt: string;
    format: 'csv' | 'xlsx';
    filters?: {
        startDate?: string;
        endDate?: string;
        accounts?: string[];
        categories?: string[];
    };
}
export interface ReportsAPI {
    getReportConfigurations(): Promise<ReportConfiguration[]>;
    getReportConfiguration(reportId: string): Promise<ReportConfiguration | null>;
    generateReport(config: Partial<ReportConfiguration>): Promise<ReportData>;
    getSpendingReport(startDate: string, endDate: string, options?: {
        groupBy?: 'category' | 'merchant' | 'account';
        accountIds?: string[];
        categoryIds?: string[];
    }): Promise<ReportData>;
    getIncomeReport(startDate: string, endDate: string, options?: {
        groupBy?: 'category' | 'merchant' | 'account';
        accountIds?: string[];
    }): Promise<ReportData>;
    createTransactionExport(options: {
        startDate?: string;
        endDate?: string;
        accountIds?: string[];
        categoryIds?: string[];
        format?: 'csv' | 'xlsx';
    }): Promise<TransactionExportSession>;
    getExportStatus(sessionId: string): Promise<{
        status: 'pending' | 'ready' | 'expired' | 'error';
        downloadUrl?: string;
        error?: string;
    }>;
}
export declare class ReportsAPIImpl implements ReportsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getReportConfigurations(): Promise<ReportConfiguration[]>;
    getReportConfiguration(reportId: string): Promise<ReportConfiguration | null>;
    generateReport(config: Partial<ReportConfiguration>): Promise<ReportData>;
    getSpendingReport(startDate: string, endDate: string, options?: {
        groupBy?: 'category' | 'merchant' | 'account';
        accountIds?: string[];
        categoryIds?: string[];
    }): Promise<ReportData>;
    getIncomeReport(startDate: string, endDate: string, options?: {
        groupBy?: 'category' | 'merchant' | 'account';
        accountIds?: string[];
    }): Promise<ReportData>;
    createTransactionExport(options: {
        startDate?: string;
        endDate?: string;
        accountIds?: string[];
        categoryIds?: string[];
        format?: 'csv' | 'xlsx';
    }): Promise<TransactionExportSession>;
    getExportStatus(sessionId: string): Promise<{
        status: 'pending' | 'ready' | 'expired' | 'error';
        downloadUrl?: string;
        error?: string;
    }>;
}
//# sourceMappingURL=ReportsAPI.d.ts.map
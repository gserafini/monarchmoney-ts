/**
 * Response formatters for different verbosity levels
 * Optimizes context usage for MCP and other integrations
 */
export type VerbosityLevel = 'ultra-light' | 'light' | 'standard';
export declare class ResponseFormatter {
    /**
     * Format accounts based on verbosity level
     */
    static formatAccounts(accounts: any[], verbosity: VerbosityLevel): string;
    /**
     * Format transactions based on verbosity level
     */
    static formatTransactions(transactions: any[], verbosity: VerbosityLevel, originalQuery?: string): string;
    /**
     * Format quick financial overview (ultra-compact)
     */
    static formatQuickStats(accounts: any[], recentTransactions?: any[]): string;
    /**
     * Format spending by category summary (ultra-compact)
     */
    static formatSpendingSummary(transactions: any[], topN?: number): string;
    /**
     * Get emoji icon for category
     */
    private static getCategoryIcon;
}
//# sourceMappingURL=ResponseFormatter.d.ts.map
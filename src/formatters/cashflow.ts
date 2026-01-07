import type { CashflowSummary } from '../domains/cashflow/index.js';

export function formatCashflowSummary(summary?: CashflowSummary): string {
  if (!summary) return 'No cashflow data';
  const income = summary.sumIncome ?? 0;
  const expense = summary.sumExpense ?? 0;
  const savings = summary.savings ?? income - expense;
  const savingsRate = summary.savingsRate ?? (income ? (savings / income) * 100 : 0);
  return `Income $${income.toLocaleString()} • Expense $${expense.toLocaleString()} • Savings $${savings.toLocaleString()} (${savingsRate.toFixed(1)}%)`;
}

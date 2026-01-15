#!/usr/bin/env node
/**
 * Quick test script for updated APIs
 */

const fs = require('fs');
const path = require('path');

// Load session from saved location
const sessionPath = path.join(process.env.HOME, '.mm', 'session.json');
if (!fs.existsSync(sessionPath)) {
  console.error('Session not found at ~/.mm/session.json');
  console.error('Run: monarch login');
  process.exit(1);
}

const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

async function main() {
  // Import built module
  const { MonarchClient } = require('./dist/cjs/index.js');

  const client = new MonarchClient();

  // Apply saved session
  client._token = session.token;

  console.log('Testing InvestmentsAPI...');
  try {
    const portfolio = await client.investments.getPortfolio();
    console.log('✅ getPortfolio() succeeded');
    console.log(`   Total Value: $${portfolio.summary?.totalValue?.toLocaleString() || 'N/A'}`);
    console.log(`   Holdings: ${portfolio.holdings?.length || 0}`);
  } catch (err) {
    console.error('❌ getPortfolio() failed:', err.message);
  }

  console.log('\nTesting ReportsAPI...');
  try {
    const configs = await client.reports.getReportConfigurations();
    console.log('✅ getReportConfigurations() succeeded');
    console.log(`   Report Configs: ${configs?.length || 0}`);
  } catch (err) {
    console.error('❌ getReportConfigurations() failed:', err.message);
  }

  try {
    const report = await client.reports.generateReport({
      type: 'spending',
      dateRange: {
        startDate: '2024-12-01',
        endDate: '2025-01-15'
      },
      groupBy: 'category'
    });
    console.log('✅ generateReport() succeeded');
    console.log(`   Total: $${report.summary?.total?.toLocaleString() || 'N/A'}`);
    console.log(`   Breakdown items: ${report.breakdown?.length || 0}`);
  } catch (err) {
    console.error('❌ generateReport() failed:', err.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

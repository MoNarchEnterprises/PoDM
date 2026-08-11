/**
 * PoDM Autonomous QA Test Suite — Execution CLI Script
 * Usage:
 *   npx ts-node scripts/run-autonomous-suite.ts --all
 *   npx ts-node scripts/run-autonomous-suite.ts --category=Payments
 *   npx ts-node scripts/run-autonomous-suite.ts --priority=P0
 *   npx ts-node scripts/run-autonomous-suite.ts --id=PAY-013
 *   npx ts-node scripts/run-autonomous-suite.ts --target-url=http://localhost:5000/api/v1
 */

import * as path from 'path';
import { SuiteRunner } from '../tests/autonomous/helpers/runner.helper';
import { TestFilterOpts, ScenarioCategory, ScenarioPriority } from '../tests/autonomous/types';

import { authScenarios } from '../tests/autonomous/auth/auth.test';
import { paymentScenarios } from '../tests/autonomous/payments/payments.test';
import { blockchainScenarios } from '../tests/autonomous/blockchain/blockchain.test';
import { creatorScenarios } from '../tests/autonomous/creators/creators.test';
import { fanScenarios } from '../tests/autonomous/fans/fans.test';
import { adminScenarios } from '../tests/autonomous/admin/admin.test';
import { securityScenarios } from '../tests/autonomous/security/security.test';
import { integrationScenarios } from '../tests/autonomous/integrations/integrations.test';

async function main() {
  const args = process.argv.slice(2);
  const opts: TestFilterOpts = {};
  let targetUrl = process.env.TARGET_API_URL || 'http://localhost:5000/api/v1';

  for (const arg of args) {
    if (arg === '--all') {
      opts.all = true;
    } else if (arg.startsWith('--category=')) {
      opts.category = arg.split('=')[1] as ScenarioCategory;
    } else if (arg.startsWith('--priority=')) {
      opts.priority = arg.split('=')[1] as ScenarioPriority;
    } else if (arg.startsWith('--id=')) {
      opts.id = arg.split('=')[1];
    } else if (arg.startsWith('--target-url=')) {
      targetUrl = arg.split('=')[1];
      process.env.TARGET_API_URL = targetUrl;
    }
  }

  // Default to --all if no specific filter provided
  if (!opts.category && !opts.priority && !opts.id) {
    opts.all = true;
  }

  const runner = new SuiteRunner();

  // Register all scenarios across all functional domains
  runner.registerScenarios([
    ...authScenarios,
    ...paymentScenarios,
    ...blockchainScenarios,
    ...creatorScenarios,
    ...fanScenarios,
    ...adminScenarios,
    ...securityScenarios,
    ...integrationScenarios,
  ]);

  const resultsBaseDir = path.resolve(__dirname, '..', 'qa-results');

  const isLive = await runner.checkServerHealth(targetUrl);

  console.log(`=======================================================`);
  console.log(`🤖 PoDM Autonomous QA Test Suite Execution Engine`);
  console.log(`Execution Mode : ${isLive ? 'LIVE UN-MOCKED API & BLOCKCHAIN' : 'OFFLINE (SERVER UNREACHABLE)'}`);
  console.log(`Target REST API: ${targetUrl}`);
  console.log(`Network Target : Base Sepolia Testnet (84532)`);
  console.log(`=======================================================\n`);

  const { summary } = await runner.executeSuite(opts, resultsBaseDir);

  console.log(`-------------------------------------------------------`);
  console.log(` Execution Complete!`);
  console.log(` Total Scenarios : ${summary.total_scenarios}`);
  console.log(` Passed          : ${summary.passed} ✅`);
  console.log(` Failed          : ${summary.failed} ❌`);
  console.log(` Blocked         : ${summary.blocked} 🚫`);
  console.log(` Skipped         : ${summary.skipped} ⏭️`);
  console.log(` Errors          : ${summary.errors} ⚠️`);
  console.log(` Pass Rate       : ${summary.pass_percentage}%`);
  console.log(` Avg Confidence  : ${summary.average_confidence} / 100`);
  console.log(` Output Folder   : ${summary.run_directory}`);
  console.log(` Latest Summary  : ${path.join(resultsBaseDir, 'latest', 'summary.md')}`);
  console.log(`-------------------------------------------------------\n`);

  if (summary.failed > 0 || summary.critical_failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal error running autonomous QA suite:', err);
  process.exit(1);
});

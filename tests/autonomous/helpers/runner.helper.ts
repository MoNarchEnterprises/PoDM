/**
 * PoDM Autonomous QA Test Suite — Runner Helper Engine
 * Discovers, filters, executes test scenarios, calculates confidence scores,
 * and writes machine-readable & markdown reports to qa-results/
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  AutonomousTestScenario,
  AutonomousTestResult,
  TestSuiteSummary,
  TestFilterOpts,
} from '../types';
import { EvidenceCollector } from './evidence.helper';
import { ApiClient } from './api.helper';
import { DbHelper } from './db.helper';
import { Web3Helper } from './web3.helper';

export class SuiteRunner {
  private scenarios: AutonomousTestScenario[] = [];

  public registerScenario(scenario: AutonomousTestScenario): void {
    this.scenarios.push(scenario);
  }

  public registerScenarios(scenarios: AutonomousTestScenario[]): void {
    this.scenarios.push(...scenarios);
  }

  public getScenarios(): AutonomousTestScenario[] {
    return this.scenarios;
  }

  public filterScenarios(opts: TestFilterOpts): AutonomousTestScenario[] {
    return this.scenarios.filter((s) => {
      if (opts.id && s.scenario_id.toLowerCase() !== opts.id.toLowerCase()) {
        return false;
      }
      if (opts.category && s.category.toLowerCase() !== opts.category.toLowerCase()) {
        return false;
      }
      if (opts.priority && s.priority.toLowerCase() !== opts.priority.toLowerCase()) {
        return false;
      }
      if (opts.subset && opts.subset.length > 0) {
        return opts.subset.includes(s.scenario_id);
      }
      return true;
    });
  }

  public async checkServerHealth(targetUrl: string = 'http://localhost:5000/api/v1'): Promise<boolean> {
    try {
      const serverRoot = targetUrl.replace(/\/api\/v1\/?$/, '');
      const res = await axios.get(serverRoot || 'http://localhost:5000/', { timeout: 2500, validateStatus: () => true });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  public async executeSuite(
    opts: TestFilterOpts,
    resultsBaseDir: string
  ): Promise<{ summary: TestSuiteSummary; results: AutonomousTestResult[] }> {
    const startTime = Date.now();
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const historyDir = path.join(resultsBaseDir, 'history', timestampStr);
    const latestDir = path.join(resultsBaseDir, 'latest');
    const evidenceDir = path.join(historyDir, 'evidence');

    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.mkdirSync(latestDir, { recursive: true });

    const targetScenarios = this.filterScenarios(opts);
    const results: AutonomousTestResult[] = [];

    const targetUrl = process.env.TARGET_API_URL || 'http://localhost:5000/api/v1';
    const isServerLive = await this.checkServerHealth(targetUrl);

    if (!isServerLive) {
      console.warn(`\n⚠️  WARNING: Express server is not reachable at ${targetUrl}`);
      console.warn(`   Run 'npm run dev:server' in PoDM_project to execute tests live.\n`);
    }

    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let skipped = 0;
    let errors = 0;
    let criticalFailures = 0;
    let highFailures = 0;
    let totalConfidence = 0;

    for (const scenario of targetScenarios) {
      const scenarioStart = Date.now();
      const collector = new EvidenceCollector();
      collector.log(`Executing scenario ${scenario.scenario_id}: ${scenario.scenario_name}`);

      const api = new ApiClient(targetUrl);

      let outcome;
      try {
        outcome = await scenario.run({
          evidenceCollector: collector,
          api,
          db: DbHelper,
          web3: Web3Helper,
          isServerLive,
        });
      } catch (err: any) {
        collector.recordError(err.message || String(err));
        outcome = {
          status: 'ERROR' as const,
          actual_result: `Execution error: ${err.message || String(err)}`,
          failure_reason: err.message || String(err),
          severity: 'HIGH' as const,
          evidence: collector.getEvidence(),
          confidence_score: 95,
          recommendations: ['Investigate test execution harness exception'],
        };
      }

      const scenarioDuration = Date.now() - scenarioStart;
      const resultRecord: AutonomousTestResult = {
        scenario_id: scenario.scenario_id,
        scenario_name: scenario.scenario_name,
        category: scenario.category,
        priority: scenario.priority,
        started_at: new Date(scenarioStart).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: scenarioDuration,
        agents_used: ['AutonomousQAAgent'],
        steps_executed: scenario.test_steps.length,
        expected_result: scenario.expected_results.join('; '),
        ...outcome,
      };

      results.push(resultRecord);

      // Aggregate statistics
      totalConfidence += outcome.confidence_score;
      switch (outcome.status) {
        case 'PASS':
          passed++;
          break;
        case 'FAIL':
          failed++;
          if (outcome.severity === 'CRITICAL') criticalFailures++;
          if (outcome.severity === 'HIGH') highFailures++;
          break;
        case 'BLOCKED':
          blocked++;
          break;
        case 'SKIPPED':
          skipped++;
          break;
        case 'ERROR':
          errors++;
          break;
      }

      // Save individual evidence file
      const scenarioEvidencePath = path.join(evidenceDir, `${scenario.scenario_id}.json`);
      fs.writeFileSync(scenarioEvidencePath, JSON.stringify(resultRecord, null, 2));
    }

    const totalDuration = Date.now() - startTime;
    const totalCount = targetScenarios.length;
    const avgConfidence = totalCount > 0 ? Math.round(totalConfidence / totalCount) : 100;
    const passPercentage = totalCount > 0 ? Number(((passed / totalCount) * 100).toFixed(1)) : 0;

    const summary: TestSuiteSummary = {
      timestamp: new Date().toISOString(),
      total_scenarios: totalCount,
      passed,
      failed,
      blocked,
      skipped,
      errors,
      pass_percentage: passPercentage,
      average_confidence: avgConfidence,
      critical_failures: criticalFailures,
      high_failures: highFailures,
      duration_ms: totalDuration,
      run_directory: historyDir,
    };

    // Write report artifacts
    this.writeReports(historyDir, latestDir, summary, results);

    return { summary, results };
  }

  private writeReports(
    historyDir: string,
    latestDir: string,
    summary: TestSuiteSummary,
    results: AutonomousTestResult[]
  ): void {
    // 1. summary.md
    const summaryMd = this.generateSummaryMarkdown(summary, results);
    fs.writeFileSync(path.join(historyDir, 'summary.md'), summaryMd);
    fs.writeFileSync(path.join(latestDir, 'summary.md'), summaryMd);

    // 2. results.json
    const resultsJson = JSON.stringify({ summary, results }, null, 2);
    fs.writeFileSync(path.join(historyDir, 'results.json'), resultsJson);
    fs.writeFileSync(path.join(latestDir, 'results.json'), resultsJson);

    // 3. coverage.md
    const coverageMd = this.generateCoverageMarkdown(results);
    fs.writeFileSync(path.join(historyDir, 'coverage.md'), coverageMd);
    fs.writeFileSync(path.join(latestDir, 'coverage.md'), coverageMd);

    // 4. failures.md
    const failuresMd = this.generateFailuresMarkdown(results);
    fs.writeFileSync(path.join(historyDir, 'failures.md'), failuresMd);
    fs.writeFileSync(path.join(latestDir, 'failures.md'), failuresMd);

    // 5. recommendations.md
    const recommendationsMd = this.generateRecommendationsMarkdown(results);
    fs.writeFileSync(path.join(historyDir, 'recommendations.md'), recommendationsMd);
    fs.writeFileSync(path.join(latestDir, 'recommendations.md'), recommendationsMd);
  }

  private generateSummaryMarkdown(summary: TestSuiteSummary, results: AutonomousTestResult[]): string {
    return `# Executive Autonomous QA Test Summary

**Run Timestamp**: ${summary.timestamp}  
**Execution Time**: ${(summary.duration_ms / 1000).toFixed(2)}s  
**Network**: Base Sepolia Testnet (Chain ID 84532) & Local Test Engine  

---

## Overall Results

| Metric | Value |
|---|---|
| **Total Scenarios** | ${summary.total_scenarios} |
| **Passed** | ${summary.passed} ✅ |
| **Failed** | ${summary.failed} ❌ |
| **Blocked** | ${summary.blocked} 🚫 |
| **Skipped** | ${summary.skipped} ⏭️ |
| **Errors** | ${summary.errors} ⚠️ |
| **Pass Percentage** | **${summary.pass_percentage}%** |
| **Average Confidence Score** | **${summary.average_confidence} / 100** |
| **Critical Failures** | ${summary.critical_failures} |
| **High Severity Failures** | ${summary.high_failures} |

---

## Execution Status Breakdown

| Scenario ID | Category | Priority | Status | Confidence | Duration | Result Summary |
|---|---|---|---|---|---|---|
${results
  .map(
    (r) =>
      `| \`${r.scenario_id}\` | ${r.category} | **${r.priority}** | ${r.status} | ${r.confidence_score}% | ${r.duration_ms}ms | ${r.actual_result.replace(/\|/g, '\\|')} |`
  )
  .join('\n')}

---

*Generated by PoDM Autonomous QA Test Suite*
`;
  }

  private generateCoverageMarkdown(results: AutonomousTestResult[]): string {
    const categories = Array.from(new Set(results.map((r) => r.category)));

    let md = `# Autonomous QA Test Coverage Report

**Date**: ${new Date().toISOString()}  
**Total Executed Scenarios**: ${results.length}  

---

## Category Execution Matrix

| Category | Total | Passed | Failed | Blocked | Coverage Status |
|---|---|---|---|---|---|
`;

    for (const cat of categories) {
      const catResults = results.filter((r) => r.category === cat);
      const passed = catResults.filter((r) => r.status === 'PASS').length;
      const failed = catResults.filter((r) => r.status === 'FAIL').length;
      const blocked = catResults.filter((r) => r.status === 'BLOCKED').length;
      const statusStr =
        failed > 0 ? '❌ Failures Detected' : blocked > 0 ? '🟡 Partial / Blocked' : '✅ 100% Passed';

      md += `| ${cat} | ${catResults.length} | ${passed} | ${failed} | ${blocked} | ${statusStr} |\n`;
    }

    md += `\n---\n\n## Scenario Level Mapping\n\n`;

    for (const cat of categories) {
      md += `### ${cat}\n\n`;
      md += `| Scenario ID | Name | Priority | Status | Verification Method |\n|---|---|---|---|---|\n`;
      const catResults = results.filter((r) => r.category === cat);
      for (const r of catResults) {
        md += `| \`${r.scenario_id}\` | ${r.scenario_name} | ${r.priority} | ${r.status} | Automated Runtime Verification |\n`;
      }
      md += `\n`;
    }

    return md;
  }

  private generateFailuresMarkdown(results: AutonomousTestResult[]): string {
    const failures = results.filter((r) => r.status === 'FAIL' || r.status === 'ERROR');

    let md = `# Failure Analysis Report

**Run Date**: ${new Date().toISOString()}  
**Total Failures / Errors**: ${failures.length}  

---

`;

    if (failures.length === 0) {
      md += `✅ **No test failures or execution errors detected in this run.**\n`;
      return md;
    }

    for (const f of failures) {
      md += `### ${f.scenario_id}: ${f.scenario_name}\n\n`;
      md += `- **Category**: ${f.category}\n`;
      md += `- **Priority**: ${f.priority}\n`;
      md += `- **Severity**: ${f.severity || 'HIGH'}\n`;
      md += `- **Status**: ${f.status}\n`;
      md += `- **Confidence Score**: ${f.confidence_score} / 100\n`;
      md += `- **Expected**: ${f.expected_result}\n`;
      md += `- **Actual**: ${f.actual_result}\n`;
      md += `- **Failure Reason**: ${f.failure_reason || 'N/A'}\n\n`;

      if (f.recommendations && f.recommendations.length > 0) {
        md += `**Recommended Remediation**:\n`;
        for (const rec of f.recommendations) {
          md += `- ${rec}\n`;
        }
      }
      md += `\n---\n\n`;
    }

    return md;
  }

  private generateRecommendationsMarkdown(results: AutonomousTestResult[]): string {
    const issues = results.filter((r) => r.status === 'FAIL' || r.status === 'BLOCKED');

    let md = `# Prioritized Recommendations & Action Items

**Run Date**: ${new Date().toISOString()}  

---

`;

    if (issues.length === 0) {
      md += `✅ **All test scenarios passed cleanly. No urgent recommendations.**\n`;
      return md;
    }

    const critical = issues.filter((i) => i.priority === 'P0' || i.severity === 'CRITICAL');
    const high = issues.filter((i) => i.priority === 'P1' || i.severity === 'HIGH');
    const rest = issues.filter((i) => !critical.includes(i) && !high.includes(i));

    if (critical.length > 0) {
      md += `## P0 — Immediate Action Items (Block Production)\n\n`;
      for (const item of critical) {
        md += `### \`${item.scenario_id}\`: ${item.scenario_name}\n`;
        md += `- **Status**: ${item.status}\n`;
        md += `- **Impact**: High risk defect or blocked critical security/payment path\n`;
        md += `- **Recommendation**: ${item.recommendations?.[0] || 'Inspect service implementation and underlying invariant checks.'}\n\n`;
      }
    }

    if (high.length > 0) {
      md += `## P1 — Address Before Release\n\n`;
      for (const item of high) {
        md += `### \`${item.scenario_id}\`: ${item.scenario_name}\n`;
        md += `- **Status**: ${item.status}\n`;
        md += `- **Recommendation**: ${item.recommendations?.[0] || 'Review implementation logic and edge case guards.'}\n\n`;
      }
    }

    if (rest.length > 0) {
      md += `## P2/P3 — General Hardening\n\n`;
      for (const item of rest) {
        md += `- **\`${item.scenario_id}\`**: ${item.scenario_name} (${item.status})\n`;
      }
    }

    return md;
  }
}

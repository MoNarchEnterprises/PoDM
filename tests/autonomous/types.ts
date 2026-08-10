/**
 * PoDM Autonomous QA Test Suite — Type Definitions
 * Grounded in Deliverables 1–12 & Prompt Specifications
 */

export type ScenarioPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type ScenarioCategory =
  | 'Authentication'
  | 'Payments'
  | 'Blockchain'
  | 'Commission'
  | 'Content'
  | 'Messaging'
  | 'Subscriptions'
  | 'Admin'
  | 'Notifications'
  | 'Contests'
  | 'Gallery'
  | 'Security'
  | 'Integrations';

export type TestResultStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED' | 'ERROR';

export interface EvidenceRecord {
  timestamp: string;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: any;
  };
  blockchain?: {
    network: string;
    contractAddress?: string;
    txHash?: string;
    receiptStatus?: string | number;
    gasSupplier?: string;
    paymasterUsed?: boolean;
    feeSplit?: {
      platformFee: string;
      creatorAmount: string;
      referralFee: string;
      referrer: string;
    };
  };
  dbState?: Record<string, any>;
  logs?: string[];
  errorMessage?: string;
}

export interface AutonomousTestScenario {
  scenario_id: string;
  scenario_name: string;
  category: ScenarioCategory;
  priority: ScenarioPriority;
  goal: string;
  preconditions: string[];
  required_test_data?: Record<string, any>;
  agent_roles: ('Audience' | 'Creator' | 'Admin' | 'Guest' | 'EnclaveCreator')[];
  permissions_required: string[];
  initial_state?: string;
  test_steps: string[];
  expected_results: string[];
  verification_methods: string[];
  failure_conditions: string[];
  cleanup_requirements?: string[];
  run: (helpers: any) => Promise<TestExecutionOutcome>;
}

export interface TestExecutionOutcome {
  status: TestResultStatus;
  actual_result: string;
  failure_reason?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  evidence: EvidenceRecord[];
  confidence_score: number; // 0 - 100
  recommendations?: string[];
}

export interface AutonomousTestResult extends TestExecutionOutcome {
  scenario_id: string;
  scenario_name: string;
  category: ScenarioCategory;
  priority: ScenarioPriority;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  agents_used: string[];
  steps_executed: number;
  expected_result: string;
}

export interface TestSuiteSummary {
  timestamp: string;
  total_scenarios: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  errors: number;
  pass_percentage: number;
  average_confidence: number;
  critical_failures: number;
  high_failures: number;
  duration_ms: number;
  run_directory: string;
}

export interface TestFilterOpts {
  all?: boolean;
  category?: ScenarioCategory;
  priority?: ScenarioPriority;
  id?: string;
  subset?: string[];
}

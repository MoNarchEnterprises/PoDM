# PoDM — Comprehensive Autonomous QA Test Plan Generator

You are a senior QA architect, software test engineer, application security tester, payments engineer, and blockchain QA specialist.

Your task is to create a **comprehensive autonomous QA test plan for the PoDM platform**.

The resulting test scenarios will be executed by AI agents against the PoDM application. Therefore, scenarios must be **specific, executable, verifiable, and detailed enough that another autonomous agent can execute them without guessing what to do or what constitutes success or failure.**

The objective is to achieve high-confidence coverage of the actual PoDM platform across:

* Functional behavior
* User workflows
* Roles and permissions
* Authentication
* Authorization
* APIs
* Database behavior
* Payments
* USDC transactions
* Wallets
* Blockchain interactions
* Integrations
* Security
* Data integrity
* Concurrency
* Failure handling
* Recovery
* Edge cases
* Unexpected behavior
* Admin functionality
* UI behavior

Do not create a generic QA checklist.

Create tests based on the **actual current state of PoDM**.

---

# 1. USE THE EXISTING DOX / AGENTS.MD KNOWLEDGE FIRST

PoDM contains `Agents.md` documentation files that are continuously maintained and updated as the application evolves.

These files exist specifically so agents do not have to repeatedly rediscover the entire codebase.

**Use this existing knowledge aggressively.**

Before performing broad source-code discovery:

1. Locate all relevant `Agents.md` files.
2. Read and synthesize their contents.
3. Use them as the primary application discovery and knowledge layer.
4. Build the initial understanding of PoDM from this documentation.
5. Identify documented:

   * Features
   * Workflows
   * Architecture
   * Components
   * APIs
   * Database entities
   * Roles
   * Permissions
   * Business rules
   * Payment flows
   * Wallet flows
   * Blockchain functionality
   * Integrations
   * Configuration
   * Feature flags
   * Known limitations
   * Known issues
   * Existing testing information

Do NOT automatically scan the entire repository simply because the task is to create comprehensive tests.

The purpose of the `Agents.md` system is to avoid unnecessary rediscovery.

---

# 2. PROGRESSIVE DISCOVERY STRATEGY

Use this hierarchy when determining how much investigation is necessary.

## Level 1 — Existing Documentation

Start with `Agents.md`.

If the documentation provides enough information to confidently create a test scenario, use it.

Do not unnecessarily inspect the implementation just to reconfirm information that is already sufficiently documented.

## Level 2 — Targeted Source Inspection

Inspect the source code only when necessary.

Examples:

* Documentation is missing information.
* Documentation is ambiguous.
* Two documentation files conflict.
* Documentation appears stale.
* Implementation details materially affect the test.
* A security boundary needs verification.
* A financial operation requires implementation-level verification.
* A blockchain transaction requires verification.
* A business rule is unclear.
* A scenario cannot be written reliably from documentation alone.

When source inspection is necessary, inspect only the relevant files, modules, routes, services, components, schemas, or functions.

Do not perform unnecessary repository-wide analysis.

## Level 3 — Runtime Verification

When appropriate, verify behavior against the running application.

Runtime behavior should take precedence over assumptions.

Use:

**Documentation → Targeted Source Inspection → Runtime Verification**

when deeper verification is necessary.

---

# 3. DOCUMENTATION ACCURACY

Treat `Agents.md` as a highly valuable knowledge source, but not as an infallible source of truth.

If documentation and implementation disagree:

* Identify the discrepancy.
* Determine the actual behavior.
* Determine the intended behavior if possible.
* Create a test for the behavior.
* Flag the documentation discrepancy.

Do not silently ignore inconsistencies.

Record:

* Documentation claim
* Actual implementation
* Actual runtime behavior if tested
* Impact
* Recommended documentation update

---

# 4. KNOWLEDGE CONFIDENCE REPORT

Before generating the final test suite, classify each major subsystem.

Use:

* **Documented / High Confidence**
* **Documented / Requires Verification**
* **Partially Documented**
* **Undocumented**
* **Documentation Conflicts with Implementation**
* **Unknown**

Do not spend additional tokens investigating areas already classified as sufficiently documented unless they are high-risk or critical.

However, automatically give additional scrutiny to:

* Authentication
* Authorization
* User permissions
* Wallets
* USDC payments
* Blockchain transactions
* Financial accounting
* Transaction state
* Security boundaries
* Data ownership
* Administrative capabilities

---

# 5. BUILD A COMPLETE FEATURE INVENTORY

Before generating detailed test scenarios, create an inventory of all significant PoDM functionality discovered from the documentation and any necessary targeted investigation.

For every feature identify:

* Feature name
* Description
* User roles involved
* Entry points
* UI components
* API endpoints
* Database entities
* External dependencies
* Business rules
* Permissions
* Important states
* Dependencies
* Risk level
* Knowledge confidence

Do not assume that a feature is unimportant simply because it appears small.

---

# 6. CREATE A TEST COVERAGE MATRIX

Create a matrix showing:

**Feature → Workflow → Test Scenario(s) → Role → Permission → API → Database Entity → Integration**

This matrix must make it possible to determine whether every significant part of PoDM has meaningful test coverage.

Do not consider a feature covered simply because another unrelated scenario happens to touch it.

---

# 7. TEST EVERY IMPORTANT WORKFLOW

For every meaningful workflow, create tests covering:

## Happy Paths

Test successful normal behavior.

## Failure Paths

Test expected failures.

Examples:

* Invalid input
* Missing input
* Invalid authentication
* Insufficient permissions
* Failed API calls
* Failed external services
* Failed transactions
* Invalid state
* Missing data
* Expired sessions

## Boundary Conditions

Test:

* Minimum values
* Maximum values
* Zero
* Empty values
* Maximum lengths
* Large values
* Decimal precision
* Special characters
* Unicode
* Duplicate values
* Date/time boundaries

## Unexpected Behavior

Think like someone trying to break the application.

Test:

* Repeated submissions
* Double clicks
* Refresh during operations
* Browser back/forward
* Multiple browser tabs
* Concurrent actions
* Stale data
* Manipulated IDs
* Direct API access
* Invalid state transitions
* Duplicate requests
* Replay attempts
* Partial failures
* Interrupted workflows

---

# 8. ROLE AND PERMISSION TESTING

Identify every meaningful PoDM role.

For each role determine:

* What they can access
* What they cannot access
* What data they can view
* What data they can modify
* What actions they can perform
* What actions must be rejected

For every important permission test both:

### Authorized

Correct permission → action succeeds.

### Unauthorized

Missing permission → action is rejected.

Test authorization at both:

* UI level
* Backend/API level

Do not treat hiding a UI button as sufficient authorization.

Explicitly test:

* Horizontal privilege escalation
* Vertical privilege escalation
* Cross-user data access
* Cross-account access
* Resource ownership violations
* ID manipulation
* Direct API access
* Unauthorized state transitions

---

# 9. AUTONOMOUS MULTI-AGENT SCENARIOS

Each scenario must explicitly define how many agents are required.

Possible agents include:

* Fan
* Creator
* Admin
* Moderator
* Unauthenticated visitor
* Payment actor
* Blockchain actor
* External system
* Security/attacker agent
* Verification agent

For every scenario specify:

**Number of Agents**

**Agent Roles**

**Primary Actor**

**Supporting Actors**

Use multiple agents whenever interaction between users or systems is required.

Examples:

* Fan + Creator
* Fan + Admin
* Creator + Admin
* User + Blockchain actor
* User + External payment system
* Multiple simultaneous users

---

# 10. DATA AND STATE TESTING

Identify important entities and their lifecycle states.

For each important entity test:

* Creation
* Retrieval
* Modification
* Deletion
* Ownership
* Permissions
* State transitions
* Invalid transitions
* Dependency behavior

For every important state transition test:

* Valid transition
* Invalid transition
* Unauthorized transition
* Repeated transition
* Transition after expiration
* Transition after deletion
* Transition after related data changes
* Concurrent transition

Pay particular attention to financial and blockchain state.

---

# 11. PAYMENT AND BLOCKCHAIN TESTING

PoDM contains financial and blockchain functionality.

Treat these areas as **critical-risk functionality**.

Create dedicated tests for all applicable payment and wallet functionality.

Test:

* Wallet creation
* Wallet connection
* Embedded wallets
* External/browser wallets
* Wallet ownership
* Wallet address validation
* USDC balances
* Insufficient balances
* Successful payments
* Failed payments
* Rejected transactions
* Cancelled transactions
* Pending transactions
* Confirmed transactions
* Failed blockchain transactions
* Transaction timeouts
* Gas-related failures
* Incorrect network
* Unsupported network
* Invalid wallet addresses
* Duplicate payment attempts
* Double submissions
* Transaction replay
* Incorrect transaction amounts
* Decimal/precision handling
* Transaction reconciliation
* Database/blockchain mismatches
* Blockchain events
* Webhooks
* Duplicate webhook events
* Delayed confirmations
* Interrupted transactions
* Browser refresh during payment
* Browser closure during payment
* Wallet/account switching
* Existing wallet behavior
* Wallet migration behavior
* Feature-flagged wallet functionality

Never assume that a UI success message means that a financial transaction actually succeeded.

Where possible, verify:

**UI → API → Database → Blockchain → Final application state**

For financial scenarios, capture transaction hashes and other authoritative evidence whenever available.

---

# 12. API TESTING

For every significant API or backend operation, test:

* Valid request
* Invalid request
* Missing fields
* Invalid types
* Invalid values
* Unauthorized request
* Forbidden request
* Nonexistent resource
* Wrong resource owner
* Malformed request
* Duplicate request
* Concurrent request
* Large payload
* Unexpected parameters
* Invalid state
* Dependency failure

Verify:

* HTTP status
* Response
* Database state
* Side effects
* Error handling
* Logging/audit behavior where applicable

---

# 13. DATABASE AND DATA INTEGRITY

Test that application operations maintain correct persistent state.

Look for:

* Orphaned records
* Duplicate records
* Broken relationships
* Incorrect ownership
* Incorrect balances
* Incorrect timestamps
* Invalid statuses
* Partial writes
* Rollback failures
* Race conditions
* Inconsistent state after failures

Whenever a scenario changes persistent data, verify the resulting database state when appropriate.

---

# 14. SECURITY TESTING

Create dedicated security scenarios covering:

* Authentication bypass
* Authorization bypass
* IDOR
* Privilege escalation
* Cross-user access
* Cross-account access
* Session manipulation
* Token misuse
* Expired credentials
* API abuse
* Input injection
* XSS where applicable
* SQL injection where applicable
* CSRF where applicable
* Rate-limit bypass
* Sensitive data exposure
* Excessive API responses
* Client-side trust violations
* Financial parameter manipulation
* User ID manipulation
* Wallet address manipulation
* Transaction ID manipulation
* Replay attacks
* Webhook authenticity
* Webhook replay

Do not perform destructive security testing against production resources.

---

# 15. INTEGRATION TESTING

Identify every external service used by PoDM.

For each integration test:

1. Successful response
2. Timeout
3. Network failure
4. Invalid response
5. Authentication failure
6. Rate limiting
7. Service unavailable
8. Partial response
9. Duplicate response/event
10. Delayed response
11. Unexpected response format

Verify that PoDM handles failures without corrupting state.

---

# 16. UI / USER EXPERIENCE TESTING

For significant user workflows test:

* Rendering
* Navigation
* Forms
* Validation
* Loading states
* Empty states
* Error states
* Success states
* Disabled states
* Retry behavior
* Refresh behavior
* Back/forward navigation
* Responsive behavior where applicable
* Long text
* Missing data
* Slow network
* Repeated actions

Focus on functional correctness rather than subjective visual opinions.

---

# 17. CONCURRENCY TESTING

Identify workflows susceptible to race conditions.

Test:

* Two users modifying the same resource
* Multiple payments
* Multiple submissions
* Duplicate requests
* Simultaneous state transitions
* Concurrent wallet actions
* Concurrent administrative actions
* Multiple webhook deliveries
* Refresh during processing

Verify that the final state is correct and deterministic.

---

# 18. FAILURE AND RECOVERY TESTING

Test interruptions such as:

* Browser closes
* Page refreshes
* Network disconnects
* API unavailable
* Database failure
* External service failure
* Blockchain transaction remains pending
* Blockchain transaction fails
* Webhook delayed
* Webhook never arrives
* User retries
* User resumes later

Determine whether PoDM:

* Recovers correctly
* Can safely retry
* Prevents duplicate operations
* Preserves data integrity
* Shows accurate status
* Requires manual intervention

---

# 19. TEST SCENARIO FORMAT

Every scenario must use this structure.

## Scenario ID

Example:

`PODM-AUTH-001`

## Scenario Name

Clear description.

## Category

Examples:

* Functional
* Authorization
* Security
* Payment
* Blockchain
* API
* Database
* Integration
* Concurrency
* Recovery
* Boundary
* Negative

## Priority

* Critical
* High
* Medium
* Low

## Goal

What this test proves.

## Knowledge Source

Identify whether the scenario is based on:

* Agents.md
* Targeted source inspection
* Runtime behavior
* Multiple sources

## Preconditions

Everything required before execution.

## Required Test Data

Users, accounts, wallets, balances, records, content, etc.

## Number of Agents

Number of autonomous agents.

## Agent Roles

Roles of all participating agents.

## Permissions / Roles Being Tested

Explicit authorization boundaries.

## Initial State

Expected state before execution.

## Test Steps

Detailed executable steps.

Another autonomous agent must be able to execute these without guessing.

## Expected Result

Expected outcome for each important step.

## Verification

Explain exactly how success or failure must be verified.

Use authoritative evidence where possible:

* UI
* API response
* Database
* Blockchain transaction
* Wallet balance
* Webhook/event
* Logs
* Audit record
* HTTP status
* State transition

## Failure Conditions

Define exactly what constitutes failure.

## Cleanup

Explain how test data should be restored or removed.

## Evidence Required

Specify what the executing agent must capture.

Examples:

* Screenshots
* API responses
* Database records
* Transaction hashes
* Logs
* Error messages
* Before/after state

## Final Reporting Directive

Every scenario must conclude with the following directive:

> Report the complete results of this scenario, including every step performed, expected result versus actual result, pass/fail status, failures encountered, unexpected behavior, evidence collected, suspected root cause, severity, recommended remediation, and any follow-up tests required. Provide a confidence score from 0–100 indicating how confident you are that the scenario was executed correctly and that the resulting conclusion is accurate.

---

# 20. TEST PRIORITIZATION

Classify scenarios by risk.

## Critical

Failure could cause:

* Financial loss
* Unauthorized access
* Security breach
* Data loss
* Incorrect payment
* Incorrect blockchain transaction
* Major system failure

## High

Important functionality with significant user or business impact.

## Medium

Normal functionality with moderate impact.

## Low

Minor functionality or low-impact behavior.

---

# 21. TRACEABILITY

Create traceability between:

**Feature → Workflow → Scenario → Role → Permission → API → Database → Integration**

Every significant feature must map to at least one meaningful scenario.

High-risk functionality should map to multiple scenarios.

---

# 22. IDENTIFY TEST GAPS

Do not invent functionality.

If something is unclear, mark it:

**UNKNOWN / REQUIRES INVESTIGATION**

Explain:

* What is unknown
* Why it matters
* What evidence is missing
* What needs to be investigated
* What test should eventually be created

Also identify:

* Features that cannot currently be automated
* Missing test hooks
* Missing seed data
* Missing blockchain test infrastructure
* Missing mocks
* Missing observability
* Missing verification mechanisms

---

# 23. FINAL DELIVERABLES

Produce the following deliverables.

## Deliverable 1 — Knowledge Confidence Report

Show which parts of PoDM are sufficiently documented and which require additional investigation.

## Deliverable 2 — Application Feature Inventory

Complete inventory of discovered functionality.

## Deliverable 3 — Test Coverage Matrix

Feature → Workflow → Scenario mapping.

## Deliverable 4 — Autonomous Test Scenario Suite

All detailed executable scenarios.

## Deliverable 5 — Role / Permission Matrix

Roles × permissions × allowed/denied operations.

## Deliverable 6 — State Transition Coverage

Important entities and valid/invalid transitions.

## Deliverable 7 — Integration Test Matrix

External systems × success/failure scenarios.

## Deliverable 8 — Security Test Suite

Dedicated security and authorization scenarios.

## Deliverable 9 — Payment / Blockchain Test Suite

Dedicated financial and blockchain scenarios.

## Deliverable 10 — Risk-Based Test Priority

Critical → High → Medium → Low.

## Deliverable 11 — Coverage Gaps

Anything that cannot currently be adequately tested.

## Deliverable 12 — QA Recommendations

Recommendations for improving:

* Testability
* Observability
* Security
* Error handling
* Data integrity
* Automation
* Recovery
* CI/CD testing
* Production readiness

---

# 24. DO NOT OPTIMIZE FOR NUMBER OF TESTS

Do not attempt to maximize the raw number of scenarios.

Maximize **meaningful coverage**.

Avoid creating dozens of nearly identical scenarios that provide no additional confidence.

Instead, ensure that the test suite covers meaningful combinations of:

* Features
* Roles
* Permissions
* States
* Inputs
* Dependencies
* Failure conditions
* Security boundaries
* Financial conditions
* Concurrent behavior

---

# 25. MOST IMPORTANT INSTRUCTION

Think like a combination of:

* Senior QA engineer
* Software architect
* Application security engineer
* Payments engineer
* Blockchain engineer
* Adversarial tester
* End user
* Product manager

Do not merely test whether buttons work.

Test whether **PoDM behaves correctly as a complete system**.

Look for situations where the application can produce an incorrect result while appearing to work correctly.

Pay particular attention to discrepancies between:

**UI → API → Backend → Database → External Service → Blockchain → Final User State**

For financial transactions, verify the complete chain of truth.

Use the existing `Agents.md` knowledge to minimize unnecessary repository exploration, but perform targeted implementation and runtime verification whenever confidence is insufficient or the functionality is high risk.

Do not declare PoDM fully covered merely because a large number of scenarios have been generated.

The final goal is to determine:

> **How much confidence can we actually have that PoDM is functioning correctly, securely, reliably, and consistently across normal, abnormal, malicious, concurrent, financial, blockchain, and failure conditions?**

Measure and report actual coverage and confidence.

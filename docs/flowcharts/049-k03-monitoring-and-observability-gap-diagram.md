## K-03: Monitoring & Observability Gap Diagram

Side-by-side comparison of the current monitoring state versus the ideal observability stack, with gap annotations linking each deficiency to a recommended remediation.

```mermaid
flowchart LR
    subgraph Current["Current State"]
        direction TB
        C1["1. console.log() - 100+ scattered"]
        C2["2. fs.appendFileSync('debug.log') - synchronous"]
        C3["3. No structured logging - format varies"]
        C4["4. No request logging - no morgan/winston"]
        C5["5. No APM - no Sentry / Datadog"]
        C6["6. No metrics - no Prometheus endpoint"]
        C7["7. No health checks - /health missing"]
        C8["8. No dashboards - no Grafana"]
        C9["9. No alerts - no PagerDuty / Slack"]
        C10["10. Zero monitoring infrastructure"]
    end

    subgraph Ideal["Ideal State"]
        direction TB
        I1["1. Structured logger (pino/winston) - JSON output, request IDs"]
        I2["2. Request logger (morgan) - response time tracking"]
        I3["3. APM (Sentry) - error tracking, performance monitoring"]
        I4["4. Prometheus metrics - request count, latency, error rate"]
        I5["5. /health endpoint - DB + R2 + RPC checks"]
        I6["6. Grafana dashboard - system overview, API perf, errors"]
        I7["7. PagerDuty / Slack alerts - error rate thresholds"]
    end

    C1 -.->|"Gap 1: Replace with pino"| I1
    C2 -.->|"Gap 2: Replace with structured async logging"| I2
    C3 -.->|"Gap 3: Add morgan / pino-http"| I3
    C4 -.->|"Gap 4: Integrate Sentry"| I4
    C5 -.->|"Gap 5: Expose Prometheus at /metrics"| I5
    C6 -.->|"Gap 6: Implement /health with dependency checks"| I6
    C7 -.->|"Gap 7: Set up Grafana dashboard"| I7
    C8 -.->|"Gap 8: Configure alert thresholds"| I7
```

Paired comparison reveals 10 gaps in the current observability stack versus 7 ideal components. Current state relies on ad-hoc `console.log` and synchronous file logging with no structured logging, APM, metrics, health checks, dashboards, or alerts. The ideal state proposes pino/winston for structured logging, Sentry for APM, Prometheus for metrics, a `/health` endpoint with dependency checks, a Grafana dashboard, and PagerDuty/Slack alerting. Gaps 7 and 8 both feed into the same ideal target (alerting infrastructure).

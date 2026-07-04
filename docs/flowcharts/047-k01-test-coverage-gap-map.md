## K-01: Test Coverage Gap Map

Test coverage gap map across all module categories showing file counts, tested file counts, coverage percentages, and critical observations.

```mermaid
flowchart TD
    subgraph Coverage["Test Coverage by Module Category"]
        direction TB

        subgraph Critical["Untested / Near-Zero Coverage"]
            direction LR
            Models["Models: 0 / 13 files -- 0%<br/>Database layer completely untested"]
            Middleware["Middleware: 0 / 4 files -- 0%"]
            Routes["Routes: 0 / 15 files -- 0%"]
            Config["Config: 0 / 8+ files -- 0%"]
            FComponents["Frontend Components: 0 / 28+ files -- 0%"]
            FHooks["Frontend Hooks: 0 / 9 files -- 0%"]
            FLib["Frontend Lib: 0 / 6 files -- 0%"]
            Contract["Smart Contract: 0 / 1 file -- 0%"]
        end

        subgraph Low["Low Coverage"]
            direction LR
            Controllers["Controllers: 1 / 15 files -- ~7%<br/>auth.controller.test.ts only"]
            Services["Services: 1 / 15 files -- ~7%<br/>auth.service.test.ts only"]
        end

        subgraph Partial["Partial Coverage"]
            direction LR
            Utils["Utils: 4 / 13 files -- ~31%<br/>apiError, asyncHandler, etc."]
        end

        subgraph E2E["E2E Tests - Written but Not Automated"]
            direction LR
            Playwright["Playwright: 5 specs -- 100% written<br/>0% automated (not in CI)"]
        end
    end

    Critical --> Low --> Partial --> E2E
```

Coverage matrix showing critical gaps across all tiers. Only 6 of 127+ files have tests (~5%). The database layer (13 models), all frontend components (28+), middleware (4), routes (15), and the smart contract (1) have zero tests. Utils lead at ~31%. All 5 Playwright E2E specs exist but none run in CI, creating a gap between development and deployment verification.

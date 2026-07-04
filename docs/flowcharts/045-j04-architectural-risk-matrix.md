## J-04: Architectural Risk Matrix

Architectural risk matrix mapping 14 identified security and operational risks across a 3×3 Impact × Likelihood grid, annotated with mitigation status and source file paths.

```mermaid
flowchart TD
    subgraph Matrix["Architectural Risk Matrix -- 3x3 Grid"]
        direction TB

        subgraph Header["Likelihood >"]
            direction LR
            L_col["Low"] --> M_col["Medium"] --> H_col["High"]
        end

        subgraph Row_High["Impact: High"]
            direction LR
            H_L["--"]
            H_M["4. No Stripe webhooks<br/>5. No DB transactions<br/>6. Dynamic require()<br/>Status: No mitigation"]
            H_H["1. 0x0000 sandbox bypass<br/>2. Missing fan route guard<br/>3. Memory exhaustion<br/>Status: None / None / Partial"]
        end

        subgraph Row_Med["Impact: Medium"]
            direction LR
            M_L["--"]
            M_M["10. Sync fs.appendFileSync<br/>11. Mocked off-ramp<br/>12. No Redis/ElastiCache<br/>Status: None / None / Partial"]
            M_H["7. Unprotected referral routes<br/>8. JWT_SECRET in frontend<br/>9. Duplicate AppError classes<br/>Status: No mitigation"]
        end

        subgraph Row_Low["Impact: Low"]
            direction LR
            L_L["--"]
            L_M["13. Dead Stripe endpoints<br/>14. CSS blur bypass<br/>Status: No mitigation / Partial"]
            L_H["--"]
        end
    end

    Header --> Row_High --> Row_Med --> Row_Low
```

Matrix places each risk in one of nine cells by Impact (rows) and Likelihood (columns). Critical zone (High × High) contains the `0x0000` sandbox bypass, missing fan route guard, and memory exhaustion. High zone (High × Medium and Medium × High) contains six risks across payment drift, DB partial failures, dynamic require, unprotected routes, exposed secrets, and duplicate error classes. Medium and Low zones contain the remaining five items. No risks appear in Low × Low or Low × High cells.

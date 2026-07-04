## K-02: End-to-End Test Journey Coverage

Mapping of 5 Playwright E2E test specs against 40 user journeys, showing covered and uncovered journeys plus aggregate coverage statistics.

```mermaid
flowchart LR
    subgraph Specs["E2E Test Specs"]
        direction TB
        A["auth.spec.ts"]
        FS["fan-subscribe.spec.ts"]
        T["tipping.spec.ts"]
        CD["creator-dashboard.spec.ts"]
        AM["admin-moderation.spec.ts"]
    end

    subgraph Covered["Covered Journeys"]
        direction TB
        J1["F-01 Signup"]
        J2["F-02 Login"]
        J3["F-03 Logout"]
        J4["C-01 Creator Signup"]
        J5["F-05 Browse Creator"]
        J6["F-06 Subscribe"]
        J7["F-07 View Content"]
        J8["F-09 Send Tip"]
        J9["C-03 Dashboard View"]
        J10["C-04 Upload Content"]
        J11["C-05 Manage Content"]
        J12["M-01 Admin Login"]
        J13["M-03 Moderate Content"]
    end

    subgraph Uncovered["Uncovered Journeys (35)"]
        direction TB
        U1["F-04 Password Reset"]
        U2["F-08 PPV Unlock"]
        U3["F-10 Message Creator"]
        U4["F-11 Enter Contest"]
        U5["F-12 Refer Friend"]
        U6["C-06 Creator Payout"]
        U7["C-07 Broadcast Message"]
        U8["C-08 Bulk Upload"]
        U9["C-09 AI Captions"]
        U10["C-10 Run Contest"]
        U11["M-02 User Management"]
        U12["M-04 Support Tickets"]
        U13["M-05 Impersonation"]
        U14["M-06 Platform Settings"]
        U15["M-07 Verification Docs"]
        U16["All Gallery / Feed Journeys"]
    end

    A --> J1 & J2 & J3 & J4
    FS --> J5 & J6 & J7
    T --> J8
    CD --> J9 & J10 & J11
    AM --> J12 & J13

    subgraph Stats["Coverage Statistics"]
        S["5 / 40 journeys covered = 12.5% -- 35 / 40 journeys have no E2E tests"]
    end
```

Five E2E specs cover only 13 of 40 user journeys (12.5%). `auth.spec.ts` covers auth journeys (F-01–F-03, C-01). `fan-subscribe.spec.ts` covers browse/subscribe/view (F-05–F-07). `tipping.spec.ts` covers send tip (F-09). `creator-dashboard.spec.ts` covers creator journeys (C-03–C-05). `admin-moderation.spec.ts` covers admin journeys (M-01, M-03). Thirty-five journeys — including password reset, PPV unlock, creator payout, bulk upload, impersonation, and all gallery/feed journeys — have no E2E test coverage.

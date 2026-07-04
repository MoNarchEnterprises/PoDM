## B-04: Route Authentication Matrix

Maps all 14 backend route groups to their middleware chains, HTTP methods, and security anomalies.

```mermaid
classDiagram
    class AuthRoutes {
        +prefix: /api/v1/auth
        +middleware: none (login/signup), protect (reset)
        +POST login, POST signup, POST reset-password
    }
    class UserRoutes {
        +prefix: /api/v1/users
        +middleware: protect
        +GET/PUT profile, POST follow/unfollow
    }
    class ContentRoutes {
        +prefix: /api/v1/content
        +middleware: protect, protectAndCreator (create)
        +POST create, GET read, PUT update, DELETE delete, POST report/flag
    }
    class SubscriptionRoutes {
        +prefix: /api/v1/subscriptions
        +middleware: protect
        +manage subscriptions
    }
    class StripePaymentRoutes {
        +prefix: /api/v1/payments
        +middleware: protect
        +Stripe payment intents
    }
    class CryptoPaymentRoutes {
        +prefix: /api/v1/payments/crypto
        +middleware: protect
        +crypto verify
    }
    class MessageRoutes {
        +prefix: /api/v1/messages
        +middleware: protect
        +conversations, messages, mass message
    }
    class NotificationRoutes {
        +prefix: /api/v1/notifications
        +middleware: protect
        +list, mark read
    }
    class AnalyticsRoutes {
        +prefix: /api/v1/analytics
        +middleware: optionalProtect (log event)
        +log events, dashboard stats
    }
    class AdminRoutes {
        +prefix: /api/v1/admin
        +middleware: protectAndAdmin
        +all admin panels
    }
    class AIRoutes {
        +prefix: /api/v1/ai
        +middleware: protectAndCreator
        +AI caption generation
    }
    class ReferralRoutes {
        +prefix: /api/v1/referrals
        +middleware: protect (most), MISSING on 2 routes
        +codes, bonuses
    }
    class ContestRoutes {
        +prefix: /api/v1/contests
        +middleware: protect
        +CRUD, entry, finalize
    }
    class SupportRoutes {
        +prefix: /api/v1/support
        +middleware: protect, admin (all)
        +tickets CRUD
    }

    Note1["ANOMALY: 2 unprotected referral routes - no protect middleware"]
    Note2["ANOMALY: Missing fan route guard on frontend /fan/* routes"]
```

Each class represents a route group showing its prefix, middleware chain, and HTTP methods. Highlights 2 unprotected referral routes and the missing frontend fan route guard as security anomalies.

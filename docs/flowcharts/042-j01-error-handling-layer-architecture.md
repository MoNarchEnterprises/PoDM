## Error Handling Layer Architecture

**Diagram ID:** J-01

This flowchart shows the five-layer error handling pipeline spanning backend and frontend, from async route handler wrapping to React component error boundaries.

```mermaid
flowchart TB
    subgraph L1["Layer 1: asyncHandler Wrapper (utils/asyncHandler.ts)"]
        AH["asyncHandler(fn) catches unhandled promise rejections in route handlers and passes to next(err)"]
    end

    subgraph L2["Layer 2: AppError Classes (utils/apiError.ts)"]
        AE["AppError with statusCode, message, isOperational"]
        SUB["Subtypes: NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError"]
        DUP["WARNING: Two identical AppError classes exist in different locations"]
    end

    subgraph L3["Layer 3: Error Handler Middleware (middleware/error.middleware.ts)"]
        EM["Global catch-all: app.use(err, req, res, next)"]
        EM2["Prunes stack trace in production (NODE_ENV === production)"]
        EM3["Returns: { success: false, error: { message, statusCode } }"]
        EM4["Unknown errors become generic Internal server error"]
    end

    subgraph L4["Layer 4: Axios Response Interceptor (apiClient.ts)"]
        AX["Catches HTTP errors on frontend"]
        AX401["401: auto-clear auth token and redirect to login"]
        AXOTHER["Other errors: display toast notification"]
        AXNO["No retry logic (except where 5xx configured)"]
    end

    subgraph L5["Layer 5: React ErrorBoundary"]
        MISSING["MISSING: No ErrorBoundary component exists uncaught React errors crash the UI"]
    end

    ROUTE["Route Handler"]
    ROUTE -->|"throw error"| AH
    AH -->|"next(err)"| EM
    EM -->|"structured JSON"| RESP["HTTP JSON Response"]
    RESP -->|"HTTP error"| AX
    AX -->|"401"| AX401
    AX -->|"other"| AXOTHER
    REACT_UI["React Component"] -->|"uncaught error"| MISSING

    style L1 fill:#e3f2fd,stroke:#1565c0
    style L2 fill:#e8f5e9,stroke:#2e7d32
    style L3 fill:#fff3e0,stroke:#e65100
    style L4 fill:#f3e5f5,stroke:#6a1b9a
    style L5 fill:#ffebee,stroke:#c62828
    style MISSING fill:#ffcdd2,stroke:#b71c1c
    style DUP fill:#fff9c4,stroke:#f57f17
```

Error propagation: backend route handlers throw errors caught by `asyncHandler`, which passes them to `next(err)`. The global error middleware returns structured JSON. On the frontend, the Axios interceptor catches HTTP errors to show toasts or redirect on 401. The critical gap is the missing React ErrorBoundary, meaning any uncaught render error crashes the UI entirely.

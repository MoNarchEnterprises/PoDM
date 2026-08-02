# GEMINI.md: PoDM Project Context

## Project Overview

This project is a creator-fan interaction platform called PoDM, similar to OnlyFans or FanVue. It enables creators to monetize their content through subscriptions and direct interactions with fans.

The project is structured as a monorepo with two main parts:

*   **Backend (`PoDM_project`):** A Node.js application using Express and TypeScript. It handles business logic, API endpoints, and database interactions.
*   **Frontend (`podm-frontend`):** A React application built with Vite and TypeScript. It provides the user interface for fans, creators, and administrators.

The database is powered by Supabase (PostgreSQL), and payments are handled through USDC on Base (EVM blockchain) via the PoDMPaymentProtocol smart contract, with Coinbase On-Ramp for fiat-to-crypto conversion.

## Building and Running

### Backend (`PoDM_project`)

*   **Run in development mode:**
    ```bash
    npm run dev:server
    ```
    This will start the backend server with hot-reloading.

*   **Run tests:**
    ```bash
    npm test
    ```

### Frontend (`podm-frontend`)

*   **Run in development mode:**
    ```bash
    npm run dev
    ```
    This will start the frontend development server.

*   **Build for production:**
    ```bash
    npm run build
    ```

*   **Lint the code:**
    ```bash
    npm run lint
    ```

## Development Conventions

*   **TypeScript:** Both the frontend and backend are written in TypeScript.
*   **Monorepo Structure:** The project is organized as a monorepo, with separate `package.json` files for the frontend and backend.
*   **Backend Architecture:** The backend follows a standard controller-service pattern, with routes defined in the `routes` directory, business logic in the `services` directory, and data models in the `models` directory.
*   **Frontend Architecture:** The frontend is organized by features (e.g., `features/admin`, `features/creator`, `features/fan`). It uses React Router for navigation and has a clear separation of components into `ui`, `shared`, and `layout`.
*   **API Communication:** The frontend communicates with the backend via a REST API, with the `apiClient` module handling requests.
*   **Real-time Communication:** WebSockets are used for real-time features like messaging.
*   **Styling:** The frontend uses Tailwind CSS for styling.

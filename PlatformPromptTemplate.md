# PlatformPromptTemplate

## Overview
Create a comprehensive prompt that can be given to an AI model (e.g., GPT, Claude) to generate a full‑stack creator‑fan platform similar to **PoDM**. The prompt should describe the high‑level architecture, core features, tech stack, and integration points, while also providing **question placeholders** where the model can ask the user for clarification or customization.

---

### 1. Project Scope
- **Goal**: Build a web application where creators can publish content, fans can subscribe, purchase pay‑per‑view (PPV) items, and interact via messages.
- **Core Modules**:
  1. **Backend** – Node.js, Express, TypeScript, Supabase (PostgreSQL), Stripe integration, WebSocket (Socket.IO) for real‑time messaging.
  2. **Frontend** – React, Vite, TypeScript, Tailwind CSS, Stripe Elements, Socket.IO client.
  3. **Content Delivery** – Media storage (Supabase storage or Cloudflare R2), FFmpeg for video thumbnail generation, watermarking.
  4. **Admin Dashboard** – Analytics, user management, content moderation.
  5. **Creator Dashboard** – Content creation, contest management, messaging, earnings view.
  6. **Fan Dashboard** – Subscription management, content browsing, messaging, contest participation.

---

### 2. High‑Level Architecture Diagram (Mermaid)
```mermaid
flowchart LR
    subgraph Frontend
        FE[React (Vite) + TS]
    end
    subgraph Backend
        BE[Express + TS]
        DB[(Supabase PostgreSQL)]
        Storage[(Supabase Storage / R2)]
        Stripe[Stripe API]
        WS[Socket.IO]
    end
    FE -->|REST API| BE
    FE -->|WebSocket| WS
    BE --> DB
    BE --> Storage
    BE --> Stripe
    WS --> BE
```
---

### 3. Detailed Feature List (with customization questions)
#### 3.1. Authentication & Authorization
- **Requirement**: JWT stored in `localStorage` (`authToken`).
- **Question**: *Do you need social login (Google, Apple) in addition to email/password?*

#### 3.2. Creator Content Types
- Text posts, images, videos, audio, downloadable files.
- **Question**: *Which content types should be mandatory vs optional?*

#### 3.3. Monetization
- **Subscriptions** – tiered monthly plans.
- **Pay‑Per‑View (PPV)** – one‑time purchase.
- **Contests** – prize content, manual winner selection.
- **Question**: *Do you want automated winner selection for any contest type?*

#### 3.4. Messaging System
- Real‑time chat via Socket.IO.
- Attach paid content to messages.
- **Question**: *Should fans be able to send attachments, or only creators?*

#### 3.5. Payments & Stripe Integration
- Customer creation, payment intents, 3‑D Secure handling.
- **Question**: *Do you need support for multiple currencies?*

#### 3.6. Admin Analytics
- Revenue, top creators, custom date ranges.
- **Question**: *Any additional KPI you’d like to track?*

#### 3.7. Media Processing
- FFmpeg for video thumbnails, Sharp for image resizing.
- **Question**: *Do you need watermarking on all media uploads?*

---

### 4. Tech Stack Summary
| Layer | Technology |
|-------|------------|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, @stripe/react‑stripe‑js, socket.io-client |
| **Backend** | Node.js, Express, TypeScript, Supabase client, Stripe SDK, socket.io |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (or Cloudflare R2) |
| **Media Tools** | FFmpeg, Sharp |
| **CI/CD** | GitHub Actions (optional) |

---

### 5. Prompt Template Skeleton
```
You are an AI software engineer tasked with building a **PoDM‑style creator‑fan platform**.

**Project Overview**:
{Insert brief description of the platform’s purpose and target audience.}

**Required Features** (list each feature, then ask the user for any customizations):
1. Authentication (email/password, optional social logins?)
2. Creator dashboard (content creation, contests, earnings)
3. Fan dashboard (subscriptions, PPV, messaging)
4. Admin analytics (revenue, top creators, custom date ranges)
5. Real‑time messaging (Socket.IO, attach paid content?)
6. Payments (Stripe integration, multi‑currency?)
7. Media processing (FFmpeg thumbnails, optional watermarking?)

**Technical Stack**:
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: Supabase (PostgreSQL)
- Storage: Supabase Storage (or Cloudflare R2)
- Payments: Stripe
- Real‑time: Socket.IO
- Media: FFmpeg, Sharp

**Customization Questions** (the model should pause and ask the user):
- Which authentication methods do you want?
- Which content types are required?
- Do you need automated contest winner selection?
- Should fans be able to send attachments?
- Do you need multi‑currency support?
- Any extra analytics KPIs?
- Do you want watermarking on all media?

**Deliverables**:
- Monorepo structure with `backend` and `frontend` directories.
- README with setup instructions, environment variables, and deployment notes.
- Sample `.env.example` files for both sides.
- Basic CI pipeline (optional).

**Implementation Steps** (high‑level, can be expanded later):
1. Scaffold the monorepo (npm workspaces or separate repos).
2. Set up Supabase project, create tables for users, creators, fans, content, subscriptions, contests, messages, transactions.
3. Implement authentication flow.
4. Build core APIs (content CRUD, subscription management, contest entry, messaging endpoints).
5. Wire Stripe payment intents and webhook handling.
6. Create React pages for creator and fan dashboards.
7. Add Socket.IO client/server integration for real‑time chat.
8. Implement admin analytics UI.
9. Add media processing pipelines (FFmpeg thumbnail generation, Sharp image resizing).
10. Write tests (unit & integration) and documentation.

**Final Note**: After each major step, pause and ask the user for confirmation or additional preferences before proceeding.
```
---

### 6. Usage Instructions
1. Copy the template into a new file `PlatformPromptTemplate.md`.
2. Replace the placeholder sections (`{Insert brief description...}`) with your specific project description.
3. Feed the completed prompt to the chosen AI model.
4. Iterate based on the model’s clarification questions.

---

*End of Template*

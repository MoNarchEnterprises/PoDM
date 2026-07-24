# Flowchart Prompts — Batch 02 (Categories E–H)

> Self-contained prompts for generating Mermaid diagrams for the PoDM platform.
> Each prompt can be given to an AI system to produce a specific diagram.
>
> File: `docs/flowcharts/flowchart-prompts-02.md`
> Covers: E-02–E-05, F-02–F-06, G-01–G-04, H-02–H-06

---

## E-02: WebSocket Event Catalog

**Type:** Graph (flowchart)
**Priority:** P1

Generate a Mermaid flowchart cataloging all Socket.IO events in the system.

Use subgraphs for event direction:
- **Server → Client (emitted)**
  - `new_message` — sent to conversation room when a message is created
  - `message_deleted` — sent to conversation room when a message is deleted
  - `conversation_read` — sent when a conversation is marked as read

- **Client → Server (received)**
  - `join_conversation` — client joins a room (conversation ID as room name)
  - `leave_conversation` — client leaves a room

- **Dead events (registered but never emitted)**
  - `message_updated` — frontend listener exists (`FanMessages.tsx`, `CreatorMessages.tsx`) but server never emits it

Connect each event to its handling code:
- Server side: `socket.ts` (connection handler, room management)
- Client side: `FanMessages.tsx`, `CreatorMessages.tsx` (Socket.IO listeners)

Annotate:
- 🔴 `message_updated` event is registered in frontend but never emitted by server
- 🟡 No typing indicators — `typing` / `stop_typing` events don't exist
- 🟡 No offline delivery — messages sent while user is disconnected are loaded on next page load (REST), not pushed via WebSocket

**Sources:** `socket.ts`, `message.service.ts`, `FanMessages.tsx`, `CreatorMessages.tsx`, `07-data-flow.md §8`, `07-cross-cutting-concerns.md §4`

---

## E-03: Support Ticket ↔ DM Sync Sequence

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram showing the cross-service synchronization between support tickets and direct messages.

Participants:
- `U` — User (Fan/Creator)
- `A` — Admin
- `SC` — Support Controller
- `SS` — Support Service (`support.service.ts`)
- `MS` — Message Service (`message.service.ts`)
- `SK` — Socket.IO
- `DB` — Supabase DB

Flow:

**Admin replies to ticket:**
1. `A → SC:` POST `/api/v1/support/tickets/:id/reply` — admin sends reply
2. `SC → SS:` `replyToTicket(ticketId, adminId, message)`
3. `SS → DB:` Append message to `support_tickets.conversation` JSONB array
4. `SS → SS:` Calls `MessageService.sendDirectMessage()` via **dynamic `require()`**: `require('../messages/message.service')`
5. `MS → DB:` INSERT into `messages` table — creates DM from admin to user
6. `MS → SK:` Broadcast `new_message` to user's conversation room
7. `SK → U:` Real-time notification of new message

**User replies to DM:**
8. `U → MS:` POST `/api/v1/messages` — user sends DM to admin
9. `MS → DB:` INSERT message record
10. `MS → MS:` Detects admin receiver
11. `MS → SS:` `appendUserMessageToActiveTicket(userId, messageText)` — calls support service
12. `SS → DB:` Append to `support_tickets.conversation` JSONB
13. `SS → SS:` If ticket was `Pending` → change status back to `Open`
14. `MS → SK:` Broadcast `new_message` to admin's conversation room
15. `SK → A:` Admin sees new message

Annotate:
- 🔴 **Dynamic `require()`** at `support.service.ts:71` — `require('../messages/message.service')` instead of static import; can cause circular dependency or runtime failure
- 🟡 JSONB conversation array — no relational model for support messages (no separate `support_messages` table)
- 🟡 No email notification when ticket is replied to (SMTP configured but unused)

**Sources:** `support.service.ts`, `message.service.ts`, `SupportTicketsPanel.tsx`, `FanMessages.tsx`, `10-internal-workflows.md §13`, `07-data-flow.md §14`

---

## E-04: Creator Broadcast Message Delivery

**Type:** Sequence
**Priority:** P2

Generate a Mermaid sequence diagram for creator broadcast (mass message) delivery.

Participants:
- `C` — Creator
- `F-Batch` — All active subscribers (fan group)
- `MC` — Message Controller
- `MS` — Message Service (`message.service.ts`)
- `SM` — Subscription Model
- `DB` — Supabase DB

Flow:
1. `C → MC:` POST `/api/v1/messages/mass-message` `{ subject, body }`
2. `MC → MS:` `sendMassMessage(creatorId, { subject, body })`
3. `MS → SM:` `SubscriptionModel.findActiveByCreator(creatorId)` — query all active subscriptions
4. `SM → DB:` SELECT from subscriptions WHERE creator_id = ? AND status = 'active'
5. `DB → SM:` Returns array of subscriber records (with preferences)
6. `MS → MS:` Iterate each subscriber:
   - Check `subscriber.preferences.notifications.massMessages` — skip if opted out
   - `MS → MS:` `sendDirectMessage(creatorId, subscriberId, { subject, body })` — creates individual DM
7. `MS → DB:` INSERT into `messages` table per subscriber
8. `MS → SK:` Socket.IO broadcast `new_message` per subscriber's conversation room
9. `MS → MC:` `{ success: true, deliveredCount: N, skippedCount: M }`
10. `MC → C:` Broadcast result

Annotate:
- 🔴 **N+1 query pattern**: One query to fetch subscribers, then N individual `sendDirectMessage` calls
- 🟡 **Fire-and-forget**: No retry on individual message failure; if one subscriber's insert fails, others still proceed
- 🟡 **No rate limiting**: Creator could send unlimited broadcasts; no throttling mechanism

**Sources:** `message.service.ts` (sendMassMessage), `BroadcastModal.tsx`, `SubscriptionModel`, `10-internal-workflows.md §12`

---

## E-05: Subscriber Notification Delivery Flow

**Type:** Flowchart
**Priority:** P2

Generate a Mermaid flowchart showing how new content notifications are delivered to subscribers.

Flow nodes:
1. **Trigger**: Content published → `content.service.ts:298-301`
2. **Service call**: `notifySubscribersOfNewContent(creatorId, contentId)` — fire-and-forget via `.catch()`
3. **Fetch subscribers**: `SubscriptionModel.findActiveByCreator(creatorId)` — queries for `status = 'active'`
4. **For each subscriber**:
   - Check `preferences.notifications.newContent` — JSONB field in profiles
   - If disabled → skip
   - If enabled → `NotificationModel.create({ userId, type: 'new_content', referenceId: contentId, message })`
5. **DB insert**: INSERT into `notifications` table
6. **Failure handling**: Each `.create()` is independent — one failure doesn't affect others
7. **No Socket.IO push**: Notifications are loaded on next page load (REST GET `/api/v1/notifications`)

Annotate:
- 🔴 **No real-time delivery** — notifications persist to DB but are never pushed via Socket.IO
- 🟡 **Fire-and-forget** — the entire method is `.catch()`'d; if an error occurs, it's silently swallowed
- 🟡 **Per-notification failure isolation**: Good — one subscriber failure doesn't cascade

**Sources:** `notification.service.ts:12-66`, `content.service.ts:298-301`, `SubscriptionModel`, `NotificationModel`, `10-internal-workflows.md §5`

---

## F-02: Data Flow Layer Architecture

**Type:** Flowchart
**Priority:** P0 — Core

Generate a Mermaid flowchart showing the cross-cutting 10-step data lifecycle shared across all 14 features.

Create a vertical pipeline with 10 stages. For each stage, list which features deviate from the standard pattern and annotate specific code references.

Stages:
1. **Origin** — Where data enters the system (API request, webhook, WebSocket, cron)
   - Standard: REST POST body → controller
   - Deviations: R2 upload (Multer buffer), Socket.IO (event), cron (internal trigger)
2. **Validation** — Input validation and sanitization
   - Standard: Zod schema / manual checks in controller
   - Deviations: Multer MIME filter (content), Supabase Auth (login)
3. **Transformation** — Data transformation before storage
   - Standard: Controller reshapes request body
   - Deviations: `reshapeUserForApp` (auth), sharp/ffmpeg (content), fee calculation (payments)
4. **Storage** — Persistence to database or object store
   - Standard: Model.create() → INSERT
   - Deviations: R2 s3.putObject (content files), JSONB array append (support tickets)
5. **Caching** — Any caching layer (if present)
   - **No caching anywhere** — all features fall through
6. **Retrieval** — Reading data for API responses
   - Standard: Model.findById() → controller reshapes → response
   - Deviations: Signed URL generation (content), aggregation queries (analytics/admin)
7. **Modification** — Updating existing records
   - Standard: Model.update() → SET
   - Deviations: JSONB append (support tickets), R2 delete+re-upload (content)
8. **Deletion** — Removing data
   - Standard: Model.delete() → hard delete
   - Deviations: R2 cleanup cascade (content), auth user + profile cleanup (signup orphan)
9. **Synchronization** — Cross-service data sync
   - Standard: none
   - Deviations: Support ticket ↔ DM sync, notification after content publish, payout after earnings aggregation
10. **External Transmission** — Sending data outside the system
    - Standard: Response JSON to client
    - Deviations: Socket.IO broadcast (messaging), R2 upload (storage), Stripe API (legacy), OpenAI API (AI captions), Ethereum RPC (crypto verify)

**Sources:** `07-data-flow.md` (all 14 features), `07-cross-cutting-concerns.md §1`, `03-architecture-kb.md`

---

## F-03: Analytics Pipeline

**Type:** Flowchart
**Priority:** P2

Generate a Mermaid flowchart showing the analytics event lifecycle.

Flow nodes:
1. **User action triggers event**: view content, visit profile, add to gallery, send tip
2. **Frontend request**: POST `/api/v1/analytics/log` with `{ eventType, targetId, metadata? }`
3. **Middleware**: `optionalProtect` — nullable `req.user` (can be anonymous)
4. **Analytics Controller**: Validates event type against known enum
5. **Analytics Service**: 
   - Skip if admin or self (optionalProtect + filter)
   - INSERT into `analytics_events` table: `{ viewer_id, event_type, target_id, metadata_json, created_at }`
   - **If `post_view`**: Postgres RPC function `increment_content_view_count(contentId)` → updates `content.stats.views` JSONB field
6. **Data consumers**:
   - Creator dashboard: `countEventsForCreator(creatorId, eventType, period)` — COUNT(*) query
   - Admin: `getDashboardStats()` — 5 parallel queries (see G-01)

Annotate:
- 🔴 **No data aggregation/caching**: Every dashboard load runs raw COUNT(*) on full table
- 🔴 **Unbounded table growth**: `analytics_events` has no TTL, archive, or deletion policy
- 🟡 Guest tracking works with nullable `viewer_id` — no privacy consideration documented

**Sources:** `analytics.service.ts`, `analytics.controller.ts`, `analytics.routes.ts`, `ContentModel (stats JSONB)`, `10-internal-workflows.md §4`, `07-data-flow.md §10`

---

## F-04: Support Ticket State Diagram

**Type:** State
**Priority:** P2

Generate a Mermaid state diagram for support ticket lifecycle.

States:
- `Open` — Created by user or re-opened when user replies to a `Pending` ticket
- `Pending` — Admin has viewed/replied; waiting for user response
- `Resolved` — Admin has closed the ticket

Transitions:
- `[initial] → Open`: User creates ticket via POST `/api/v1/support/tickets`
- `Open → Pending`: Admin views or replies to ticket → status set to `Pending`
- `Pending → Open`: User replies to ticket → status set back to `Open`
- `Open → Resolved`: Admin resolves ticket
- `Pending → Resolved`: Admin resolves ticket
- `Resolved → Open`: *(not supported — no re-open)*

Annotate:
- ⚠️ **No `Closed` state** — only `Resolved` exists
- ⚠️ **No re-open from Resolved** — once resolved, ticket is terminal
- ⚠️ State transitions are implicit in service methods, not enforced at DB level (no CHECK constraint on status)

**Sources:** `support.service.ts`, `supportTicket.model.ts`, `07-data-flow.md §14`, `05-user-journeys.md §M-07`

---

## F-05: Contest Lifecycle State Diagram

**Type:** State
**Priority:** P2

Generate a Mermaid state diagram for contest lifecycle.

States:
- `draft` — Creator creates contest with title, description, prize, entry period. Not yet visible to fans.
- `active` — Creator publishes contest. Fans can view and enter during entry period.
- `completed` — Creator finalizes contest with a winner. No further entries accepted.
- `canceled` — Creator cancels contest (from draft or active state).

Transitions:
- `[initial] → draft`: Creator creates contest (`status: 'draft'`, sets `start_date` + `end_date`)
- `draft → active`: Creator publishes contest (`status: 'active'`)
- `draft → canceled`: Creator cancels before publishing
- `active → completed`: Creator finalizes → winner selected → `status: 'completed'`
- `active → canceled`: Creator cancels during entry period (no entries lost? — check contest.service.ts)
- `active → completed` auto: When `end_date` passes → *(no auto-transition implemented — creator must manually finalize)*

Annotate:
- ⚠️ **No auto-complete**: When `end_date` passes, contest stays `active` — creator must manually finalize
- ⚠️ **No `canceled` entry refund**: If canceled during active period, no mechanism to refund entry fees (no entry fees in current implementation — entries are free with subscription check)

**Sources:** `contest.service.ts`, `contest.model.ts`, `07-data-flow.md §13`, `05-user-journeys.md §C-10`

---

## F-06: Contest Winner Selection Flow

**Type:** Flowchart
**Priority:** P3

Generate a Mermaid flowchart showing the two winner selection algorithms.

Flow:
1. **Entry period ends**: Creator clicks "Finalize" on contest
2. **Fetch entries**: `ContestEntryModel.findByContestId(contestId)` — all active entries
3. **Algorithm selection**: Based on `contest.winnerSelection` field:
   - `standard` → uniform random
   - `weighted_spend` → weighted by transaction history

**Standard algorithm:**
4a. Generate `randomIndex = Math.floor(Math.random() * entries.length)`
5a. Select `entries[randomIndex]` as winner

**Weighted Spend algorithm:**
4b. For each entrant: `TransactionModel.getTotalSpendByUser(entrant.userId, contestId)` — query transactions table
5b. Compute tickets per entrant: `tickets = 1 + Math.floor(totalSpend / spendThreshold) * additionalEntries`
   - Where `spendThreshold` and `additionalEntries` are contest parameters
6b. Build weighted array: each entrant appears `tickets` times
7b. Generate random index against weighted array
8b. Select corresponding entrant as winner

**Common:**
9. `ContestModel.finalize(contestId, winnerEntryId)` — update contest record
10. Winner is announced in contest UI

Annotate:
- 🔴 **Not cryptographically secure**: `Math.random()` used for winner selection — no verifiable randomness
- 🔴 **No audit trail**: No record of random seed, algorithm inputs, or selected winner's probability
- 🟡 Weighted algorithm queries `transactions` table with real dollar amounts — privacy concern for entrants

**Sources:** `contest.service.ts` (finalize), `TransactionModel`, `07-data-flow.md §13`

---

## G-01: Admin Dashboard Data Flow

**Type:** Flowchart
**Priority:** P1

Generate a Mermaid flowchart showing how the admin dashboard aggregates data from 5 parallel queries.

Flow:
1. **Admin navigates to dashboard**: `GET /api/v1/admin/dashboard`
2. **`protectAndAdmin` middleware**: Ensures admin role
3. **Admin Controller**: `getDashboardStats(req, res)`
4. **Admin Service**: `getDashboardStats()` — runs 5 parallel queries via `Promise.all()`:
   - `UserModel.countAllUsers()` → `SELECT COUNT(*) FROM profiles`
   - `UserModel.countActiveCreators()` → `SELECT COUNT(*) FROM profiles WHERE role = 'creator' AND status = 'active'`
   - `TransactionModel.sumPlatformFeeForPeriod(30)` → `SELECT COALESCE(SUM(platform_fee), 0) FROM transactions WHERE created_at > NOW() - INTERVAL '30 days'`
   - `SupportTicketModel.countOpenTickets()` → `SELECT COUNT(*) FROM support_tickets WHERE status IN ('Open', 'Pending')`
   - `UserModel.getNewUsersOverTime(6)` → `SELECT DATE_TRUNC('day', created_at), COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '6 months' GROUP BY 1 ORDER BY 1`
5. **Response**: `{ totalUsers, activeCreators, platformFees30d, openTickets, newUsersOverTime }`
6. **Frontend**: AdminDashboardPanel.tsx renders 5 cards/charts

Annotate:
- 🟡 **No caching**: Every dashboard page load runs 5 queries against potentially large tables
- 🟡 **No error isolation**: If one query fails, entire Promise.all rejects → dashboard shows error
- 🟡 **`sumPlatformFeeForPeriod` scans transactions table**: No index on `created_at` with partial `platform_fee IS NOT NULL`

**Sources:** `admin.service.ts` (getDashboardStats), `admin.controller.ts`, `UserModel`, `TransactionModel`, `SupportTicketModel`, `07-data-flow.md §11`

---

## G-02: Admin Moderation Workflow

**Type:** Sequence
**Priority:** P2

Generate a Mermaid sequence diagram for content moderation (report → flag → admin action).

Participants:
- `U` — User (Fan)
- `CS` — Content Service
- `DB` — Supabase DB
- `AS` — Admin Service
- `A` — Admin

Flow:
1. `U → CS:` POST `/api/v1/content/:id/report` — user reports content with `{ reason }`
2. `CS → DB:` INSERT into `reports` table — `{ contentId, reporterId, reason, created_at }`
3. `CS → DB:` Check count of reports for this content — `SELECT COUNT(*) FROM reports WHERE content_id = ?`
4. **If count >= 3**: Update content status to `flagged`
5. `DB → CS:` Acknowledged
6. `CS → U:` Report submitted
7. *(Admin opens moderation panel)*
8. `A → AS:` GET `/api/v1/admin/content/flagged`
9. `AS → DB:` SELECT from content WHERE status = 'flagged' — enriched with `reportCount` and creator info
10. `DB → AS:` Returns flagged content list
11. `AS → A:` Flagged content with metadata
12. **Admin action — approve**:
    - `A → AS:` POST `/api/v1/admin/content/:id/approve`
    - `AS → DB:` UPDATE content status → `published`
    - `AS → DB:` DELETE all reports for this content (auto-dismiss)
    - `AS → A:` Content restored
13. **Admin action — remove**:
    - `A → AS:` POST `/api/v1/admin/content/:id/remove`
    - `AS → DB:` UPDATE content status → `removed`
    - `AS → A:` Content removed
    - *(No notification to creator about removal)*

Annotate:
- 🟡 **No creator notification**: Creator isn't notified when their content is flagged or removed
- 🟡 **Auto-dismiss on approve**: All reports deleted — no audit trail of past reports
- 🔴 **No appeal mechanism**: Creator cannot appeal removal decision

**Sources:** `admin.service.ts`, `content.service.ts` (reportContent, auto-flag), `ReportModel`, `ContentModerationPanel.tsx`, `10-internal-workflows.md §22`, `05-user-journeys.md §M-03`

---

## G-03: Admin Panel Structure & Data Sources

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart mapping all 8 admin panels to their backend routes, services, models, and DB tables.

Use subgraphs for each panel:

1. **Dashboard** (`GET /admin/dashboard`)
   - Service: `admin.getDashboardStats()`
   - Tables: profiles, transactions, support_tickets
   - Read-only

2. **Users** (`GET /admin/users`, `GET /admin/users/:id`)
   - Service: `admin.getAllUsers()`, `admin.getUserDetails()`
   - Tables: profiles, transactions, subscriptions
   - Read-only

3. **Analytics** (`GET /admin/analytics`)
   - Service: `admin.getAnalytics()`
   - Tables: transactions, analytics_events
   - Read-only

4. **Content Moderation** (`GET /admin/content/flagged`, `POST /admin/content/:id/approve`, `POST /admin/content/:id/remove`)
   - Service: `admin.getFlaggedContent()`, `admin.approveContent()`, `admin.removeContent()`
   - Tables: content, reports
   - Read-Write

5. **Support Tickets** (`GET /admin/support/tickets`, `POST /admin/support/tickets/:id/reply`, `POST /admin/support/tickets/:id/resolve`)
   - Service: `admin.getAllTickets()`, `admin.replyToTicket()`, `admin.resolveTicket()`
   - Tables: support_tickets
   - Read-Write

6. **Reports** (`GET /admin/reports`)
   - Service: `admin.getCustomReport()`
   - Tables: multiple (custom query builder)
   - Read-only

7. **Settings** (`GET /admin/settings`, `PUT /admin/settings`)
   - Service: `admin.getSettings()`, `admin.updateSettings()`
   - Tables: platform_settings
   - Read-Write

8. **Verification Docs** (`GET /admin/users/:id/verification-docs`)
   - Service: `admin.getVerificationDocs()`, `storage.getPrivateSignedUrl()`
   - Source: R2 (profile.verification_data JSONB has file paths)
   - Read-only

Annotate:
- All panels require `protectAndAdmin` middleware
- 🔴 No admin audit trail — no admin_action_log table

**Sources:** `admin.routes.ts`, `admin.controller.ts`, `admin.service.ts`, all admin panel components, `07-data-flow.md §11`

---

## G-04: Verification Document Access Flow

**Type:** Sequence
**Priority:** P2

Generate a Mermaid sequence diagram for admin access to creator verification documents.

Participants:
- `A` — Admin
- `AC` — Admin Controller
- `AS` — Admin Service
- `SS` — Storage Service
- `R2` — Cloudflare R2
- `DB` — Supabase DB

Flow:
1. `A → AC:` GET `/api/v1/admin/users/:id/verification-docs` — admin requests to view verification docs
2. `AC → AS:` `getVerificationDocs(userId)`
3. `AS → DB:` SELECT `verification_data` FROM `profiles` WHERE `id` = ?
4. `DB → AS:` Returns JSONB `{ idFilePath, selfieFilePath, ... }`
5. `AS → AS:` Check `idFilePath` and `selfieFilePath` exist
6. `AS → SS:` `getPrivateSignedUrl(idFilePath, 60)` — 60-second expiry
7. `SS → R2:` `s3.getSignedUrl('getObject', { Bucket, Key, Expires: 60 })`
8. `R2 → SS:` Returns signed URL for ID document
9. `AS → SS:` `getPrivateSignedUrl(selfieFilePath, 60)`
10. `SS → R2:` Same for selfie
11. `R2 → SS:` Signed URL for selfie
12. `SS → AS:` Both signed URLs
13. `AS → AC:` `{ idDocumentUrl, selfieUrl }` — valid for 60 seconds
14. `AC → A:` Admin views ID and selfie images in VerificationDetailPanel

Annotate:
- 🔴 **PII sensitivity**: ID documents contain full name, date of birth, address, ID number — transmitted via temporary URL
- 🟡 **60-second window**: URLs expire quickly, but are logged in browser history / network tab
- 🟡 **No access audit**: No record of who viewed whose verification docs or when

**Sources:** `admin.service.ts`, `storage.service.ts`, `VerificationDetailPanel.tsx`, `07-data-flow.md §11`

---

## H-02: Business Capability Dependency Graph

**Type:** Graph (flowchart)
**Priority:** P1

Generate a Mermaid flow chart showing dependencies among all 20 business capabilities (from `04-business-capabilities.md`).

Use color-coded subgraphs:
- **Enabling capabilities** (root level): Identity & Access Management (IAM), User Profiles, Platform Settings
- **Core commerce capabilities** (hub level): Payment Processing (most-depended-on), Subscription Commerce, Tipping, PPV
- **Engagement capabilities**: Content Feed, Content Gallery, Real-Time Messaging, Notifications, Contests
- **Growth capabilities**: Referral System, Enclave (premium tier)
- **Governance capabilities**: Admin Dashboard, Content Moderation, Support Tickets, Analytics
- **Productivity capabilities**: AI Captions, Bulk Upload

Draw directed edges:
- IAM → all capabilities (every feature requires auth)
- Payment Processing → Subscriptions, Tipping, PPV, Payouts, Referral Bonuses
- Subscriptions → Content Access, Contests (entry requires subscription)
- Messaging → Support Tickets (DM sync), Notifications
- Content Feed/Gallery → Content Moderation
- Analytics ← multiple (Admin Dashboard, Creator Dashboard)

Annotate:
- **Payment Processing** is the most depended-on capability (5 dependents)
- **Content Feed** and **Content Gallery** share identical data source (Content service)
- **Enclave** is the most isolated (depends only on IAM)

**Sources:** `04-business-capabilities.md` (all 20 capabilities), `03-architecture-kb.md`

---

## H-03: User Journey Map (Fan)

**Type:** Journey
**Priority:** P2

Generate a Mermaid Journey diagram showing the fan's experience through key milestones.

Milestones in order:
1. **Signup** — Email + password → profile creation → redirected to feed
   - Emotion: neutral/positive
   - Friction: None (standard Supabase auth)
2. **Browse creator** — Browse search or suggested creators → view creator profile
   - Emotion: curious
   - Friction: No personalized recommendations
3. **Subscribe** — Click subscribe → connect wallet → approve USDC transaction → wait for verification
   - Emotion: hesitant/anxious (crypto UX is complex)
   - Friction: 🔴 Mocked wallet returns fake txHash, real crypto wallet not integrated
4. **View content** — Browse subscriber-only posts → view unlocked content
   - Emotion: satisfied
   - Friction: 🟡 Watermarking adds load delay, CSS blur easy to bypass
5. **Tip creator** — Select tip amount → connect wallet → approve transaction
   - Emotion: generous → frustrated
   - Friction: 🔴 Dead Stripe endpoints 404; crypto flow is mocked
6. **Message creator** — Open DM → send message → real-time delivery
   - Emotion: connected
   - Friction: 🟡 No typing indicators, no offline delivery
7. **Enter contest** — View contest → enter (subscription check) → wait for winner selection
   - Emotion: excited → uncertain
   - Friction: 🟡 No visibility into winner selection, no audit trail
8. **Refer friend** — Get referral code → share → friend signs up
   - Emotion: positive → confused
   - Friction: 🔴 Referral bonuses calculated but never paid out

**Sources:** `05-user-journeys.md` (F-01 through F-15), `06-frontend-architecture.md`

---

## H-04: User Journey Map (Creator)

**Type:** Journey
**Priority:** P2

Generate a Mermaid Journey diagram showing the creator's experience through key milestones.

Milestones in order:
1. **Signup + verification** — Sign up → select creator role → upload verification docs → wait for admin approval
   - Emotion: hopeful → anxious
   - Friction: 🟡 Verification process is manual, no status updates
2. **First content upload** — Drag file → set caption (or AI generate) → publish
   - Emotion: excited → impatient
   - Friction: 🟡 Synchronous thumbnail generation slows upload, 1GB memory buffer per file
3. **Subscriber notification** — Content published → subscribers notified
   - Emotion: satisfied → curious
   - Friction: 🟡 No real-time push to subscribers (see E-05)
4. **Earnings dashboard** — View earnings → see pending balance
   - Emotion: motivated
   - Friction: None (dashboard loads quickly for small creators)
5. **Payout request** — Enter amount → submit request → receive fake off-ramp ID
   - Emotion: excited → confused
   - Friction: 🔴 Off-ramp is fully mocked — no real money received
6. **Message fans** — View conversations → respond to DMs → send broadcast
   - Emotion: connected
   - Friction: 🟡 Broadcast has N+1 query pattern (see E-04)
7. **Run contest** — Create contest → set prize → select winner → announce
   - Emotion: engaged
   - Friction: 🟡 `Math.random()` winner selection — no verifiable fairness

**Sources:** `05-user-journeys.md` (C-01 through C-12), `06-frontend-architecture.md`

---

## H-05: Role-Based Access Boundaries

**Type:** Graph (flowchart)
**Priority:** P1

Generate a Mermaid flowchart showing the three role boundaries and what each can access.

Use 4 concentric swimlanes (outermost → innermost):
1. **Unauthenticated** (no session)
   - Auth routes: login, signup, forgot-password
   - Public content (visible in feed/gallery before login)
   - Analytics logging (optionalProtect)
   
2. **Fan** (role: fan)
   - All auth routes
   - Browse/search creators
   - View creator profiles
   - Subscribe (crypto payment)
   - View subscriber content (if subscribed)
   - Purchase PPV content
   - Send tips
   - Message subscribed creators
   - Enter contests (if subscribed to creator)
   - Refer friends
   - Report content
   - Create support tickets

3. **Creator** (role: creator)
   - All fan capabilities
   - Upload content (single + bulk)
   - AI caption generation
   - View earnings dashboard
   - Request payouts
   - Manage content (edit, delete, schedule)
   - Send broadcast messages
   - Run contests
   - View subscriber analytics
   - Manage subscription tiers
   - Create referral codes
   - Apply to Enclave

4. **Admin** (role: admin)
   - All capabilities (full system access)
   - Impersonate any user (via `X-Impersonating-User-Id` header)
   - Dashboard (5 parallel queries)
   - User management
   - Content moderation (flag, approve, remove)
   - Support ticket management
   - Platform settings
   - View verification documents
   - Custom reports

Annotate gaps with RED markers:
- 🔴 **No fan route guard**: Frontend `/fan/*` routes lack `withAuthGuard` — accessible to unauthenticated users (content not served by backend, but UI leaks)
- 🔴 **2 unprotected referral routes**: `/api/v1/referrals/*` — no `protect` middleware on backend
- 🔴 **Impersonation boundary bypass**: Admin can impersonate any user; no audit trail of impersonation actions

**Sources:** `auth.middleware.ts`, all route files, `App.tsx` (routing), `withAuthGuard.tsx`, `07-cross-cutting-concerns.md §2`, `06-frontend-architecture.md §3`

---

## H-06: Feature Maturity Radar

**Type:** Graph (flowchart)
**Priority:** P3

Generate a Mermaid flowchart visually classifying all 20 business capabilities into maturity tiers (from `04-business-capabilities.md`).

Use 3 subgraphs by tier:

**Mature (6)**:
- Identity & Access Management
- User Profiles (CRUD)
- Content Feed (browse/search)
- Real-Time Messaging (basic text)
- Admin Dashboard
- Analytics (basic event tracking)

**Functional (12)**:
- Content Gallery
- Tipping (crypto flow works if not mocked)
- PPV (same as tipping)
- Content Upload (with thumbnail gen)
- Subscriptions (basic crypto flow, no renewal)
- Referral System (without payout)
- Support Tickets (with DM sync)
- Contests (with weighted selection)
- Bulk Upload
- AI Captions
- Enclave (applications only)
- Platform Settings

**Basic (2)**:
- Payouts & Earnings (fully mocked)
- Notifications (DB-only, no push)

Add annotations showing the gap between Mature and Basic tiers — which capabilities need investment.

**Sources:** `04-business-capabilities.md` (maturity rubrics per capability)

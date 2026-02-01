# Manager/Agency Functionality - Future Feature

**Status**: Tabled for future implementation  
**Date Discussed**: January 28, 2026  
**Priority**: Low - Focus on creator acquisition first

## Overview

This document outlines the requirements and considerations for adding manager/agency functionality to allow managers or agencies to manage multiple creator accounts from a single dashboard.

## Core Concepts

### Manager/Agency Role
- A new user type that sits between creators and the platform
- Can manage multiple creator accounts from a single dashboard
- Has delegated permissions to perform actions on behalf of creators

## Key Implementation Areas

### 1. Database Schema Changes

New tables needed:
- **`managers`** - Store manager/agency profiles
- **`manager_creator_relationships`** - Link managers to creators (many-to-many relationship)
  - Include permission levels (full access, content-only, analytics-only, financial)
  - Track invitation/approval workflow status
  - Store permission grants and restrictions

### 2. Authentication & Authorization

**Account Switching**
- Managers need ability to switch between creator accounts they manage
- Maintain session context of "acting as" which creator

**Permission System**
- Granular permissions for manager actions:
  - Post content
  - View analytics
  - Manage subscriptions
  - Handle messages
  - Access financial data
  - Modify profile settings

**Audit Logging**
- Track which manager performed which action
- Record on behalf of which creator
- Timestamp and IP logging for security

**Session Management**
- Handle complexity of one user acting as multiple entities
- Secure token management for delegated access

### 3. UI/UX Considerations

**Manager Dashboard**
- Overview of all managed creators
- Aggregated analytics across all creators
- Quick-switch dropdown/menu between creator accounts
- Activity feed across all managed accounts

**Creator Selector Component**
- Persistent UI element showing which creator account is currently active
- Easy switching mechanism
- Visual distinction when acting as manager vs. creator

**Invitation Flow**
- Creators invite managers via email
- Managers accept invitations
- Set initial permission levels during invitation

**Permission Management UI**
- Interface for creators to set what their managers can access
- Ability to modify permissions after initial grant
- Instant revocation capability

### 4. Feature Access & Modifications

Areas requiring manager support:

**Content Management**
- Post on behalf of creators
- Clear attribution in audit logs
- Possible "posted by manager" indicator (decision needed)

**Messaging**
- Respond to fans as the creator
- Consider "managed by" indicator for transparency (decision needed)

**Analytics**
- View performance data for managed creators
- Aggregated cross-creator analytics

**Financial**
- Access earnings data (sensitive - special permission level)
- Manage payout settings (if permitted)

**Subscription Tiers**
- Manage pricing
- Configure tier settings and benefits

**Profile Settings**
- Update creator profiles
- Manage account settings (with appropriate permissions)

### 5. Revenue & Business Logic

**Payment Split Considerations**
- Does the manager take a percentage?
- How is revenue split tracked and enforced?
- Automatic vs. manual distribution

**Stripe Connect**
- May need separate Stripe accounts or sub-accounts
- Payment routing for revenue splits

**Tax Implications**
- Who receives 1099 forms?
- How are earnings reported for tax purposes?
- Legal structure considerations

### 6. Security & Compliance

**Two-Factor Authentication**
- Should 2FA be required for managers?
- Additional security for high-privilege accounts

**IP Logging**
- Track where management actions originate
- Detect suspicious activity patterns

**Consent & Terms**
- Legal agreements between creators and managers
- Terms of service updates
- Liability considerations

**Data Privacy**
- GDPR compliance for managers accessing creator data
- Data processing agreements
- Right to access/deletion requests

### 7. Technical Implementation

**Backend Changes**

New API routes:
```
/api/v1/manager/*
/api/v1/manager/creators (list managed creators)
/api/v1/manager/switch/:creatorId (switch context)
/api/v1/manager/invitations (manage invites)
/api/v1/creator/managers (creator's view of their managers)
```

Middleware updates:
- Handle "acting as" context
- Permission checking middleware
- Audit logging middleware

Service layer updates:
- Accept `actingUserId` vs `creatorId` parameters
- Permission validation in business logic
- Audit trail creation

**Frontend Changes**

New views:
- Manager dashboard
- Manager settings
- Creator-manager relationship management
- Permission configuration UI

New components:
- Account switcher component
- Permission-aware UI wrapper
- Visual indicators for "acting as" state

**WebSocket Considerations**
- Real-time updates for managed accounts
- Namespace/room management for multiple creators
- Permission-aware event emission

## Open Questions

Before implementation, decisions needed on:

1. **Permission Granularity**: How fine-grained should permissions be?
   - Simple: View, Edit, Financial
   - Complex: Per-feature permissions (can post photos but not videos)

2. **Revenue Sharing**: Handled in-app or externally?
   - In-app: Automatic splits, tracked in database
   - External: Managers and creators handle payment separately

3. **Creator Control**: 
   - Can creators revoke access instantly?
   - Can creators view detailed manager activity logs?
   - Can creators set time-limited access?

4. **Manager Limits**: 
   - Can one manager handle unlimited creators?
   - Should there be tiered manager accounts?
   - Platform fees for manager accounts?

5. **Branding/Transparency**: 
   - Should fans know content is manager-posted?
   - Or should it be completely transparent?
   - Legal requirements for disclosure?

6. **Onboarding**: 
   - How do managers sign up?
   - Separate registration flow?
   - Upgrade from existing creator account?

7. **Multi-level Management**: 
   - Can managers have sub-managers or assistants?
   - Delegation of permissions to team members?

## Potential Challenges

**Complexity**
- Significantly increases system complexity
- More code paths to test and maintain
- Increased support burden

**Security**
- More access points = more attack surface
- Need robust permission system
- Audit logging critical for accountability

**Testing**
- Need to test all permission combinations
- Complex user flows to validate
- Integration testing becomes more complex

**Migration**
- How do existing creators transition to using managers?
- Data migration considerations
- Backwards compatibility

**Performance**
- Additional database queries for permission checks
- Caching strategy for permissions
- Impact on response times

## Implementation Phases (When Ready)

### Phase 1: Foundation
- Database schema
- Basic manager account creation
- Simple invitation system
- View-only access to one creator

### Phase 2: Core Functionality
- Full permission system
- Account switching
- Content posting on behalf of creators
- Audit logging

### Phase 3: Advanced Features
- Manager dashboard with aggregated analytics
- Revenue sharing (if applicable)
- Advanced permission granularity
- Multi-creator management UI

### Phase 4: Polish
- Activity logs and reporting
- Enhanced security features
- Performance optimization
- Comprehensive documentation

## Related Files

When implementing, will need to modify:
- Backend: `PoDM_project/src/models/`, `services/`, `routes/`, `middleware/`
- Frontend: `podm-frontend/src/features/`, new `features/manager/` directory
- Database: New migration scripts in Supabase

## Notes

- This feature is **tabled until creator acquisition goals are met**
- Revisit when platform has sufficient creator base to justify complexity
- Consider market research on competitor implementations before building
- May want to survey existing creators about their needs before designing

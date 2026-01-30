# Applicant Management Feature Implementation

## Overview
Implemented a complete Applicant Management workflow for team leaders (post creators) in the Buddy Beacon feature. This allows post creators to view all applicants for their posts, accept or reject applications with custom reasons, and automatically notify applicants via the inbox system.

## Changes Summary

### Frontend Changes

#### 1. **[client/src/components/campus/BuddyBeacon.jsx](client/src/components/campus/BuddyBeacon.jsx)**

**State Management:**
- Added `refreshTrigger` state variable (line ~45) to enable data refreshing after accept/reject actions

**Data Structure Updates:**
- Updated applicants extraction in `renderPostCard` (line 154) to handle both:
  - `post.applicants` (for TeamFindingPost)
  - `post.applicantObjects` (for BuddyBeacon)
- Enhanced `currentTeamSize` to use `post.currentTeamMembers` or fallback to `post.currentMembers`

**UI Components:**
- **Applicants Section** (lines 190-259): Displays list of applicants only to post creator
  - Shows applicant avatar, name, year of study
  - Displays up to 2 skills with overflow indicator (+N more)
  - Accept/Reject action buttons per applicant
  - Only visible when `isOwnPost === true`

**Rejection Modal** (already existed):
- Dropdown for rejection reason: "NOT_A_GOOD_FIT", "TEAM_FULL", "LATE_APPLICATION", "OTHER"
- Optional custom note (up to 100 characters)
- Buttons: Submit/Cancel

**Data Refresh Logic:**
- Updated useEffect dependency array to include `refreshTrigger` (line 108)
- Modified `renderPostCard` for myPosts to properly merge applicants data (lines 458-464)
- `handleAccept` triggers refresh on success (line 289)
- `handleReject` triggers refresh on success (line 306)

### Backend Changes

#### 2. **[server/src/main/java/com/studencollabfin/server/model/TeamFindingPost.java](server/src/main/java/com/studencollabfin/server/model/TeamFindingPost.java)**

- Added `applicants` field of type `List<Map<String, Object>>` to store full applicant data with profiles
- Used for rendering applicants list in UI

#### 3. **[server/src/main/java/com/studencollabfin/server/model/BuddyBeacon.java](server/src/main/java/com/studencollabfin/server/model/BuddyBeacon.java)**

- Added `applicantObjects` field of type `List<Map<String, Object>>`
- Added setter/getter methods: `setApplicantObjects()`, `getApplicantObjects()`
- Maintains compatibility with existing `applicants` field (which only stores IDs)

#### 4. **[server/src/main/java/com/studencollabfin/server/model/Inbox.java](server/src/main/java/com/studencollabfin/server/model/Inbox.java)** (NEW)

New document model for storing user notifications and feedback:

**Fields:**
- `userId`: Recipient of the message
- `type`: Message type (e.g., "APPLICATION_FEEDBACK")
- `title`: Brief notification title
- `message`: Full message content
- `applicationId`: Reference to the application
- `postId`: Reference to the post/team
- `postTitle`: Post title for context
- `senderId`: Who sent the notification
- `applicationStatus`: REJECTED or ACCEPTED
- `rejectionReason`: Why was it rejected
- `rejectionNote`: Additional feedback from rejector
- `createdAt`: Timestamp
- `read`: Boolean flag for read status

#### 5. **[server/src/main/java/com/studencollabfin/server/repository/InboxRepository.java](server/src/main/java/com/studencollabfin/server/repository/InboxRepository.java)** (NEW)

MongoDB repository interface with methods:
- `findByUserId(String userId)`: Get all inbox items for a user
- `findByUserIdAndReadFalse(String userId)`: Get unread items
- `findByUserIdAndType(String userId, String type)`: Get items by type

#### 6. **[server/src/main/java/com/studencollabfin/server/service/BuddyBeaconService.java](server/src/main/java/com/studencollabfin/server/service/BuddyBeaconService.java)**

**Dependencies:**
- Added `InboxRepository` autowired dependency for inbox notifications

**getMyPosts() Method Enhancement:**
- For BuddyBeacon posts:
  - Fetches all applications for the beacon
  - Enriches each application with applicant's full User profile
  - Creates applicant objects with: `_id`, `applicationId`, `applicantId`, `profile`
  - Sets `beacon.applicantObjects` for transmission to frontend
  - Returns applicants in postMap under "applicants" key

- For TeamFindingPost:
  - Same enrichment logic as BuddyBeacon
  - Sets `post.applicants` field with enriched applicant data

**acceptApplication() Method Enhancement:**
- For both BuddyBeacon and TeamFindingPost:
  - After accepting, creates Inbox notification for applicant
  - Inbox fields:
    - `userId`: Applicant ID
    - `type`: "APPLICATION_FEEDBACK"
    - `title`: "Application Accepted!"
    - `message`: "Congratulations! You've been accepted to '[Team Name]'!"
    - `applicationStatus`: "ACCEPTED"
  - Saves to inbox collection

**rejectApplication() Method Enhancement:**
- For both BuddyBeacon and TeamFindingPost:
  - After rejection, creates Inbox notification for applicant
  - Inbox fields:
    - `userId`: Applicant ID
    - `type`: "APPLICATION_FEEDBACK"
    - `title`: "Application Rejected"
    - `message`: "Your application to '[Team Name]' has been rejected."
    - `applicationStatus`: "REJECTED"
    - `rejectionReason`: Reason from dropdown
    - `rejectionNote`: Custom feedback note
  - Saves to inbox collection

### Data Flow

**User Views My Posts Tab:**
1. Frontend calls `getMyBeaconPosts()` API
2. Backend's `getMyPosts(userId)` fetches posts by creator
3. For each post, fetches related applications from ApplicationRepository
4. For each application, enriches with applicant's full User profile
5. Returns applicants array with full data: `{ _id, applicationId, applicantId, profile: { name, yearOfStudy, skills, ... } }`
6. Frontend receives myPosts with applicants array embedded in post object
7. `renderPostCard()` extracts applicants and displays in Applicants Section

**User Clicks Accept Button:**
1. Frontend calls `acceptApplication(applicationId, postId)`
2. Backend accepts the application and adds applicant to team members
3. Backend creates Inbox document: `{ userId: applicantId, type: "APPLICATION_FEEDBACK", title: "Application Accepted!", ... }`
4. Frontend triggers refresh via `setRefreshTrigger`
5. Fresh data fetched, applicants list updated

**User Rejects Application:**
1. Frontend opens rejection modal
2. User selects reason and optionally adds note
3. Frontend calls `rejectApplication(applicationId, postId, reason, note)`
4. Backend rejects application and creates Inbox document with rejection details
5. Frontend triggers refresh
6. Fresh data fetched, applicants list updated

### API Endpoints (Existing - No Changes)

- `POST /api/beacon/application/{applicationId}/accept?postId=...`
- `POST /api/beacon/application/{applicationId}/reject?postId=...&reason=...&note=...`
- `POST /api/beacon/my-posts` - Already returns applicants in response

### Features Implemented

✅ **Applicants List Display**
- Shows all applicants for user's own posts
- Displays avatar, name, year, and skills
- Only visible to post creator

✅ **Accept Applicant**
- Adds applicant to team members
- Creates acceptance notification in inbox
- Refreshes applicants list

✅ **Reject Applicant**
- Rejects with selectable reason
- Optional custom feedback note
- Creates rejection notification with full context
- Refreshes applicants list

✅ **Inbox Notifications**
- Auto-generated for acceptance
- Auto-generated for rejection with reason and feedback
- Stored in MongoDB for later retrieval
- Includes full context (post title, reason, feedback)

✅ **Data Persistence**
- Rejection feedback stored in Inbox collection
- Applicant profiles enriched from User collection
- Application status persisted in Application collection

### Testing Notes

- Post creators can now see all applicants on their posts in "My Posts" tab
- Accept/Reject buttons appear only for post creators (checked via `isOwnPost`)
- Applicants receive notifications automatically
- All data persists correctly across page refreshes
- Refresh trigger ensures UI stays in sync with backend

### Future Enhancements

- Inbox UI component to view notifications
- Mark notifications as read
- Bulk actions (accept/reject multiple)
- Applicant rating/feedback system
- Application filtering by status
- Applicant search/sort functionality


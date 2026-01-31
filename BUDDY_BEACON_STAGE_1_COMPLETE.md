# Buddy Beacon Lifecycle - Stage 1: Entity & Schema Updates ✅ COMPLETE

## Overview
Implemented the database schema foundation for the "Pass the Torch" system:
- **Recruiting Phase**: Users create `TeamFindingPost` linked to an `Event`
- **Expiry Phase**: After 24 hours, scheduled task evaluates posts
- **Accounting Phase**: Event stats = Active Posts + Formed Pods

---

## Stage 1 Implementation Details

### 1. ✅ CollabPod.java - Add Event Tracking Fields

**Location**: `server/src/main/java/com/studencollabfin/server/model/CollabPod.java`

**Changes Made:**

#### New Field Added (Line 31):
```java
// ✅ NEW: Buddy Beacon Fields - Link to Event & Track Origin
private String eventId;      // Link to the Hackathon/Event (null for general pods, set for event-based teams)
```

**Purpose**: 
- Links CollabPod to originating Event (null for general pods, set for event-based teams)
- Enables filtering pods by event for accurate event statistics
- Tracks pod origin for the "Pass the Torch" conversion process

#### Enhanced PodType Enum (Line 57):
```java
public enum PodType {
    DISCUSSION,
    ASK,
    HELP,
    PROJECT_TEAM,
    MENTORSHIP,
    COURSE_SPECIFIC,
    LOOKING_FOR,
    COLLAB,  // Global collaboration rooms created from COLLAB posts
    TEAM     // ✅ NEW: Event-based team pods (created from TeamFindingPost expiry)
}
```

**Purpose**: 
- `TEAM` type distinguishes event-based pods from general discussion pods
- Clear classification for quota/limit enforcement
- Enables targeted queries: `findByTypeAndEventId("TEAM", eventId)`

**Existing Fields Verified**:
- ✅ `type` (PodType enum) - Changed from 'podType' to 'type'
- ✅ `college` - Maintains campus isolation (IIT, Sinhgad, GLOBAL)
- ✅ `creatorId` - Links to creator
- ✅ `memberIds` - Tracks team members
- ✅ `status` (PodStatus) - Active, Full, Archived, Closed

---

### 2. ✅ Event.java - Verify Participation Counting System

**Location**: `server/src/main/java/com/studencollabfin/server/model/Event.java`

**Status**: ✅ **Already Implemented** - All required fields present

**Current Participation Counters** (Lines 34-35):
```java
private Long currentParticipants = 0L; // Actual count of participants registered
private Long currentTeams = 0L;        // Actual count of teams formed
```

**Capacity Limits** (Line 41):
```java
private Integer maxTeams;  // Maximum number of teams allowed (null = unlimited)
```

**Legacy Fields Retained** (Lines 37-39, for backward compatibility):
```java
private Set<String> registeredUserIds = new HashSet<>(); // Track unique users
private int participantsCount = 0;  // Display count (legacy)
private int teamsCount = 0;         // Teams formed (legacy)
```

**Data Types Rationale**:
- `Long` for counters: Supports millions of participants without overflow
- `Integer` (nullable) for `maxTeams`: null = unlimited, avoiding artificial defaults
- `Set<String>` for `registeredUserIds`: Duplicate prevention at entity level

**Dynamic Storage Logic** (For Accounting Phase):
```
If Event Type = SOLO:
  → Store: currentParticipants, maxParticipants
  → NOT stored: currentTeams, maxTeams

If Event Type = TEAM:
  → Store: currentParticipants, currentTeams, maxParticipants, maxTeams
  → Value = Sum of (Active TeamFindingPosts + Converted CollabPods)
```

---

### 3. ✅ TeamFindingPost.java - Ensure Strict Member Tracking

**Location**: `server/src/main/java/com/studencollabfin/server/model/TeamFindingPost.java`

**Status**: ✅ **Verified** - All required fields present with fast indexing

**Member Tracking Fields**:
```java
private List<String> currentTeamMembers;              // List of members (by userId)
private List<Map<String, Object>> applicants;        // ✅ Applications with profiles
```

**Structure of Applicants List**:
```java
// Example applicant object
{
    "userId": "user123",
    "status": "PENDING" | "ACCEPTED" | "REJECTED",
    "appliedAt": "2026-01-31T10:30:00",
    "profile": {
        "name": "John Doe",
        "skills": ["Java", "Spring Boot"],
        "college": "IIT"
    }
}
```

**Time-Based Indexing** (Line 8 in Post.java):
```java
@Indexed  // ✅ NEW: Index for fast querying by creation time
private LocalDateTime createdAt;
```

**Why This Matters**:
- Fast querying: Find all posts created > 24 hours ago
- Enables efficient scheduled task: `find posts where createdAt < now - 24 hours`
- Supports automatic expiry handling without table scans

**Verification Methods**:
```java
// Inherited from Post superclass
public java.time.LocalDateTime getCreatedAt() {
    return super.getCreatedAt();
}

// Existing method to compute state
public PostState computePostState() {
    LocalDateTime now = LocalDateTime.now();
    long hours = Duration.between(getCreatedAt(), now).toHours();
    if (hours < 20) return PostState.ACTIVE;
    if (hours < 24) return PostState.CLOSED;
    return PostState.EXPIRED;
}
```

---

## Data Flow Summary

### Recruiting Phase (T=0 to T=24h)
```
User Creates TeamFindingPost
├─ eventId: "event-123"
├─ authorId: "user-abc"
├─ maxTeamSize: 4
├─ currentTeamMembers: ["user-abc"]  // Author is first member
├─ applicants: []
├─ createdAt: 2026-01-31T10:00:00    // Indexed for fast queries
└─ postState: ACTIVE
```

### Expiry Phase (T=24h+)
```
Scheduled Task Triggers:
  1. Query: SELECT * FROM posts WHERE createdAt < now - 24h AND type = TEAM_FINDING
  2. For Each Post:
     a. If currentTeamMembers.size() >= 2:
        → Convert to CollabPod (Type: TEAM, eventId: "event-123")
        → Mark post as expired/linked
     b. Else (< 2 members):
        → Delete post (recruitment failed)
        → Update Event.currentTeams--
```

### Accounting Phase (Event Stats)
```
GET /api/events/{eventId}/stats

Calculate Stats:
  currentTeams = 
    COUNT(TeamFindingPost WHERE eventId AND postState = ACTIVE)
    + COUNT(CollabPod WHERE eventId AND type = TEAM)
  
  currentParticipants = 
    SUM(TeamFindingPost.currentTeamMembers.size() 
        WHERE eventId AND postState = ACTIVE)
    + SUM(CollabPod.memberIds.size() 
          WHERE eventId AND type = TEAM)
```

---

## Database Schema Examples

### Example 1: Solo Event
```json
{
  "title": "Web Dev Bootcamp",
  "type": "SOLO",
  "category": "WORKSHOP",
  "maxParticipants": 100,
  "currentParticipants": 45,
  "currentTeams": null,          // NOT stored
  "maxTeams": null,              // NOT stored
  "registeredUserIds": [...]     // Legacy
}
```

### Example 2: Team Event
```json
{
  "title": "Hackathon 2026",
  "type": "TEAM",
  "category": "HACKATHON",
  "maxParticipants": 200,
  "maxTeams": 20,                // Limit to 20 teams
  "currentParticipants": 85,     // 85 total across all teams
  "currentTeams": 12,            // 12 active teams/pods
  "registeredUserIds": [...]     // Legacy
}
```

### Example 3: CollabPod Created from TeamFindingPost
```json
{
  "_id": "pod-789",
  "name": "AI-ML Team for Hackathon",
  "type": "TEAM",                // ✅ NEW enum value
  "eventId": "event-123",        // ✅ NEW field - links back to event
  "college": "IIT",
  "creatorId": "user-abc",
  "memberIds": ["user-abc", "user-def", "user-ghi"],
  "status": "ACTIVE",
  "scope": "CAMPUS"
}
```

---

## Dependencies & File Changes

### Files Modified:
1. **CollabPod.java** ✅
   - Added: `private String eventId;`
   - Updated: `PodType enum` → added `TEAM` value
   - Affected: 2 lines changed

2. **Event.java** ✅
   - Status: **No changes needed** - already complete
   - Verified: All fields present (currentParticipants, currentTeams, maxTeams)

3. **TeamFindingPost.java** ✅
   - Status: **No changes needed** - already has applicants list
   - Verified: Extends Post (has createdAt field)

4. **Post.java** ✅
   - Added: `@Indexed` annotation on createdAt
   - Added: Import `org.springframework.data.mongodb.core.index.Indexed`
   - Affected: 1 annotation added

### Files NOT Modified (Already Complete):
- EventRepository.java - Already supports queries
- TeamFindingPostRepository.java - Can be extended for expiry queries
- CollabPodRepository.java - Can be extended for event-based queries

---

## Verification Checklist

- [x] **CollabPod.java**
  - [x] `eventId` field added (line 31)
  - [x] `PodType.TEAM` enum value added (line 57)
  - [x] `college` field verified
  - [x] `type` field verified (PodType)

- [x] **Event.java**
  - [x] `currentParticipants` (Long) - verified (line 34)
  - [x] `currentTeams` (Long) - verified (line 35)
  - [x] `maxTeams` (Integer nullable) - verified (line 41)
  - [x] Legacy fields retained for migration - verified

- [x] **TeamFindingPost.java**
  - [x] `applicants` (List<Map>) field - verified
  - [x] `currentTeamMembers` field - verified
  - [x] Extends Post (inherits createdAt)

- [x] **Post.java**
  - [x] `@Indexed` annotation on createdAt - added
  - [x] `Indexed` import statement - added
  - [x] Ready for efficient time-based queries

---

## Next Steps (Upcoming Stages)

### Stage 2: Repository & Query Methods
```java
// TeamFindingPostRepository
List<TeamFindingPost> findByEventIdAndPostStateAndCreatedAtBefore(...);

// CollabPodRepository
List<CollabPod> findByEventIdAndType(String eventId, PodType type);

// EventRepository
Event findWithStats(String eventId);  // Aggregate counts
```

### Stage 3: Scheduled Task Implementation
```java
@Scheduled(fixedDelay = 3600000)  // Every 1 hour
public void processExpiredTeamFindingPosts() {
    // 1. Query expired posts (createdAt < 24h ago)
    // 2. For each post:
    //    - If members >= 2: Convert to CollabPod (Type: TEAM)
    //    - Else: Delete post
    // 3. Refresh Event stats
}
```

### Stage 4: Event Statistics Service
```java
public EventStats getEventStats(String eventId) {
    long activePostTeams = countActivePostTeams(eventId);
    long podTeams = countEventPods(eventId);
    
    return new EventStats(
        currentTeams: activePostTeams + podTeams,
        currentParticipants: sumParticipantsFromBoth(eventId)
    );
}
```

---

## Backward Compatibility

✅ **Fully Backward Compatible**:
- Legacy fields (`registeredUserIds`, `participantsCount`, `teamsCount`) retained
- Existing pods without `eventId` continue to work (null = general pod)
- Existing posts work with new @Indexed annotation (non-breaking)
- New `PodType.TEAM` doesn't affect existing pod types

**Migration Strategy**:
1. Code deploys without data migration
2. Old events/pods continue to function
3. New events use new counting system
4. Gradual migration of statistics calculation

---

## Performance Considerations

### Indexing Strategy
```javascript
// MongoDB Indexes to Create
db.posts.createIndex({ "createdAt": 1 });           // Time-based queries
db.posts.createIndex({ "eventId": 1, "type": 1 }); // Event-specific queries
db.collabPods.createIndex({ "eventId": 1 });       // Pod lookup by event
db.collabPods.createIndex({ "eventId": 1, "type": 1 }); // Event team pods
```

### Query Performance
| Query | Without Index | With Index |
|-------|---------------|-----------|
| Find posts created > 24h ago | O(n) table scan | O(log n) index search |
| Find pods for event | O(n) table scan | O(log n) index search |
| Count teams by type+event | O(n) table scan | O(log n) + O(k) |

---

## Summary

**Stage 1 Status**: ✅ **COMPLETE**

All database schema updates implemented:
1. ✅ CollabPod.java - Added eventId field, TEAM enum type
2. ✅ Event.java - Verified all counter fields present
3. ✅ TeamFindingPost.java - Verified applicants tracking
4. ✅ Post.java - Added createdAt indexing

**Ready for**: Stage 2 (Repository Methods & Queries)

**Next**: Implement scheduled task for 24-hour expiry evaluation

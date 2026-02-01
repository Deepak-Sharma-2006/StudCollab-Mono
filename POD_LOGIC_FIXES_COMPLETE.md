# Pod Logic Fixes - Team Pods vs Collab Pods

## Overview
Fixed two major logic bugs regarding how **Team Pods** (from TeamFindingPosts/Buddy Beacon) and **Collab Pods** (from LOOKING_FOR posts) are handled in the database. This document outlines the fixes applied.

---

## Changes Applied

### 1. ✅ Fix: Stop Premature Team Pod Creation (Backend)

**File:** [server/src/main/java/com/studencollabfin/server/service/PostService.java](server/src/main/java/com/studencollabfin/server/service/PostService.java#L232-L245)

**What Changed:**
- **Removed**: Immediate CollabPod creation when a TeamFindingPost is created
- **Added**: Deferred pod creation logic - Team Pods are now ONLY created when posts expire or are manually finalized

**Previous Behavior (❌ WRONG):**
```
User creates TeamFindingPost → Immediately creates CollabPod (Pod ID assigned)
```

**New Behavior (✅ CORRECT):**
```
User creates TeamFindingPost → No pod created yet, just post is saved
                              ↓
                    (Post expires or is manually finalized)
                              ↓
                    generateTeamPod() called → CollabPod created with accepted members
```

**Code Changes:**
```java
// REMOVED this code from PostService.createPost() for TeamFindingPost:
CollabPod pod = new CollabPod();
pod.setType(CollabPod.PodType.PROJECT_TEAM);
CollabPod createdPod = collabPodService.createPod(authorId, pod);

// REPLACED with deferred logic message:
System.out.println("✅ TeamFindingPost created: " + teamPost.getId() + 
    " - Pod creation deferred until post expires or is manually finalized");
```

---

### 2. ✅ Fix: Segregate 'Post Counts' (Backend) - Schema Update

**File:** [server/src/main/java/com/studencollabfin/server/model/CollabPod.java](server/src/main/java/com/studencollabfin/server/model/CollabPod.java#L41-L51)

**What Changed:**
- **Added**: New `PodSource` enum to CollabPod model
- **Added**: New `podSource` field to track the origin of each pod

**New Enum:**
```java
public enum PodSource {
    TEAM_POD,      // Created when TeamFindingPost expires (team formation)
    COLLAB_POD,    // Created from LOOKING_FOR posts in Campus Hub
    COLLAB_ROOM    // Created from COLLAB posts in Inter Hub (global)
}
```

**New Field:**
```java
private PodSource podSource; // Origin of pod (TEAM_POD, COLLAB_POD, COLLAB_ROOM)
```

**Pod Source Mapping:**
| Pod Origin | Created From | podSource | PodType | Scope |
|-----------|-------------|-----------|---------|-------|
| LOOKING_FOR post | Campus Hub | `COLLAB_POD` | `LOOKING_FOR` | CAMPUS |
| COLLAB post | Inter Hub | `COLLAB_ROOM` | `COLLAB` | GLOBAL |
| TeamFindingPost (expired) | Buddy Beacon | `TEAM_POD` | `TEAM` | CAMPUS |

---

### 3. ✅ Fix: Updated LOOKING_FOR Post Count Query (Backend)

**File:** [server/src/main/java/com/studencollabfin/server/controller/PostController.java](server/src/main/java/com/studencollabfin/server/controller/PostController.java#L31-L62)

**What Changed:**
- **Added**: Dependency on `CollabPodRepository`
- **Updated**: `getCampusPostCounts()` method to exclude TEAM_PODs from LOOKING_FOR count

**Previous Behavior (❌ WRONG):**
```
LOOKING_FOR post count = all SocialPost with type=LOOKING_FOR (includes those linked to TEAM_PODs)
```

**New Behavior (✅ CORRECT):**
```
LOOKING_FOR post count = SocialPost with type=LOOKING_FOR AND 
                         linkedPodId points to CollabPod with podSource=COLLAB_POD
```

**Code Logic:**
```java
if (ptype == com.studencollabfin.server.model.PostType.LOOKING_FOR) {
    // Verify this LOOKING_FOR post is linked to a COLLAB_POD (not a TEAM_POD)
    String linkedPodId = social.getLinkedPodId();
    if (linkedPodId != null) {
        com.studencollabfin.server.model.CollabPod pod = 
            collabPodRepository.findById(linkedPodId).orElse(null);
        if (pod != null && 
            pod.getPodSource() == com.studencollabfin.server.model.CollabPod.PodSource.COLLAB_POD) {
            count++;
        }
    }
}
```

**Impact:**
- LOOKING_FOR posts are now correctly separated from Team Pods
- The Campus Hub shows accurate post counts
- Only COLLAB_POD type posts are counted in the "Looking For" section

---

### 4. ✅ Fix: Pod Source Markers for Existing Pods (Backend)

**Files Modified:**
1. [PostService.java - LOOKING_FOR pod creation](server/src/main/java/com/studencollabfin/server/service/PostService.java#L179)
2. [PostService.java - COLLAB pod creation](server/src/main/java/com/studencollabfin/server/service/PostService.java#L221)

**What Changed:**
- **Added**: `podSource` field is now set when pods are created
- LOOKING_FOR pods set: `podSource = COLLAB_POD`
- COLLAB pods set: `podSource = COLLAB_ROOM`

**Code:**
```java
// For LOOKING_FOR posts:
pod.setPodSource(CollabPod.PodSource.COLLAB_POD);

// For COLLAB posts:
pod.setPodSource(CollabPod.PodSource.COLLAB_ROOM);
```

---

### 5. ✅ NEW METHOD: generateTeamPod() - Team Generation Trigger

**File:** [server/src/main/java/com/studencollabfin/server/service/BuddyBeaconService.java](server/src/main/java/com/studencollabfin/server/service/BuddyBeaconService.java#L569-L677)

**Purpose:**
Generate a Team Pod when a TeamFindingPost expires or is manually finalized.

**Method Signature:**
```java
public CollabPod generateTeamPod(String postId)
```

**Logic Flow:**
1. **Fetch** the TeamFindingPost by ID
2. **Validate** that post is EXPIRED or CLOSED
3. **Check** if pod already exists (idempotent - prevents duplicate creation)
4. **Retrieve** all accepted applicants (currentTeamMembers)
5. **Create** CollabPod with:
   - `type = TEAM`
   - `podSource = TEAM_POD`
   - `status = ACTIVE`
   - `scope = CAMPUS`
   - `eventId = linked to original event`
6. **Add Members** to the pod:
   - Pod owner = original post author
   - Members = accepted applicants (excluding the owner)
7. **Populate** member names for display
8. **Save** the pod to database
9. **Update** TeamFindingPost with `linkedPodId`

**Example Usage:**
```java
// When scheduled task detects expired post:
CollabPod teamPod = buddyBeaconService.generateTeamPod(expiredPostId);

// Result:
// - CollabPod created with podSource=TEAM_POD
// - All accepted members added as pod members
// - Bi-directional link established: post ↔ pod
```

**Key Features:**
- ✅ **Idempotent**: Can be called multiple times safely
- ✅ **Member Names**: Fetches and stores member display names
- ✅ **College Isolation**: Preserves campus from original post
- ✅ **Event Linkage**: Maintains connection to hackathon/event
- ✅ **Logging**: Comprehensive debug output for monitoring

---

## Schema Summary

### CollabPod Model Changes
```java
public class CollabPod {
    // ... existing fields ...
    
    // ✅ NEW FIELD
    private PodSource podSource; // TEAM_POD | COLLAB_POD | COLLAB_ROOM
    
    // ✅ NEW ENUM
    public enum PodSource {
        TEAM_POD,      // From expired TeamFindingPost
        COLLAB_POD,    // From LOOKING_FOR SocialPost
        COLLAB_ROOM    // From COLLAB SocialPost
    }
}
```

---

## Integration Points

### Required Scheduler Integration
The `generateTeamPod()` method should be called by a scheduled task when posts expire:

```java
// Suggested implementation (to be added):
@Scheduled(fixedRate = 60000) // Every 60 seconds
public void processExpiredTeamFindingPosts() {
    List<TeamFindingPost> expiredPosts = postRepository.findAll().stream()
        .filter(p -> p instanceof TeamFindingPost)
        .map(p -> (TeamFindingPost) p)
        .filter(p -> p.computePostState() == PostState.EXPIRED)
        .filter(p -> p.getLinkedPodId() == null) // Not yet converted
        .collect(Collectors.toList());
    
    for (TeamFindingPost post : expiredPosts) {
        try {
            buddyBeaconService.generateTeamPod(post.getId());
        } catch (Exception ex) {
            logger.error("Failed to generate team pod for post: " + post.getId(), ex);
        }
    }
}
```

---

## Testing Checklist

### Test Case 1: LOOKING_FOR Post Count
- [ ] Create a LOOKING_FOR SocialPost
- [ ] Verify CollabPod created with `podSource = COLLAB_POD`
- [ ] Call `getCampusPostCounts()` endpoint
- [ ] Verify LOOKING_FOR count includes this post
- [ ] Verify TEAM_POD type pods are excluded from count

### Test Case 2: Team Pod Generation
- [ ] Create TeamFindingPost with eventId
- [ ] Verify NO pod created immediately (post should not have linkedPodId)
- [ ] Add some accepted applicants to currentTeamMembers
- [ ] Call `generateTeamPod(postId)` manually
- [ ] Verify CollabPod created with `podSource = TEAM_POD`
- [ ] Verify all team members added to pod
- [ ] Verify post now has linkedPodId
- [ ] Verify calling `generateTeamPod()` again is idempotent (no duplicate pod)

### Test Case 3: COLLAB Post Count
- [ ] Create COLLAB SocialPost
- [ ] Verify CollabPod created with `podSource = COLLAB_ROOM`
- [ ] Call `getInterPostCounts()` endpoint
- [ ] Verify COLLAB count includes this pod

### Test Case 4: Pod Type Segregation
- [ ] Query CollabPods with `podSource = COLLAB_POD` → should only return LOOKING_FOR pods
- [ ] Query CollabPods with `podSource = TEAM_POD` → should only return Team Pods
- [ ] Query CollabPods with `podSource = COLLAB_ROOM` → should only return COLLAB room pods

---

## Files Modified

1. ✅ [CollabPod.java](server/src/main/java/com/studencollabfin/server/model/CollabPod.java)
   - Added `PodSource` enum
   - Added `podSource` field

2. ✅ [PostService.java](server/src/main/java/com/studencollabfin/server/service/PostService.java)
   - Removed immediate TeamFindingPost pod creation
   - Added podSource markers for LOOKING_FOR and COLLAB pods

3. ✅ [PostController.java](server/src/main/java/com/studencollabfin/server/controller/PostController.java)
   - Added CollabPodRepository dependency
   - Updated getCampusPostCounts() to exclude TEAM_PODs

4. ✅ [BuddyBeaconService.java](server/src/main/java/com/studencollabfin/server/service/BuddyBeaconService.java)
   - Added generateTeamPod() method

---

## Next Steps

1. **Implement Scheduler**: Add scheduled task to call `generateTeamPod()` for expired posts
2. **Migration**: Add MongoDB migration to set `podSource` for existing pods
3. **Testing**: Run comprehensive integration tests
4. **Documentation**: Update API documentation with pod source enum values
5. **Monitoring**: Add logging to track pod generation and count accuracy

---

## Summary of Fixes

| Issue | Root Cause | Fix Applied | Status |
|-------|-----------|------------|--------|
| Premature Team Pod Creation | TeamFindingPost immediately created pods | Deferred creation to post expiry | ✅ FIXED |
| Mixed Pod Counts | No way to distinguish pod origins | Added PodSource enum and field | ✅ FIXED |
| Inaccurate LOOKING_FOR Count | Counted all LOOKING_FOR posts including TEAM_PODs | Filter by podSource=COLLAB_POD | ✅ FIXED |
| Missing Team Generation Logic | No method to create pods from expired posts | Added generateTeamPod() method | ✅ FIXED |


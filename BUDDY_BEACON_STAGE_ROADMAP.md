# Buddy Beacon Lifecycle - Stage 1 to Stage 4 Quick Reference

## 🎯 Overview
"Pass the Torch" System: TeamFindingPost → (24h) → CollabPod → Event Stats

---

## Stage 1: ✅ COMPLETE
**Entity & Schema Updates**

### Changes Made:
1. ✅ CollabPod.java: `eventId` field + `TEAM` enum type
2. ✅ Event.java: Verified `currentParticipants`, `currentTeams`, `maxTeams`
3. ✅ TeamFindingPost.java: Verified `applicants`, `currentTeamMembers`
4. ✅ Post.java: Added `@Indexed` on `createdAt`

### Files Changed:
- CollabPod.java (2 changes)
- Post.java (1 import + 1 annotation)
- EventController.java (1 import fix)
- EventService.java (1 import fix)
- EventsHub.jsx (1 key fix)

### Build Status:
- ✅ Backend: `mvn clean compile` SUCCESS
- ✅ Frontend: `npm run build` SUCCESS
- ✅ No errors, no breaking changes

---

## Stage 2: Repository Methods (Next)
**Query Methods for Expiry Detection**

### Files to Create/Update:

#### TeamFindingPostRepository.java
```java
// Existing method - extend
List<TeamFindingPost> findByEventId(String eventId);

// Add new methods:
List<TeamFindingPost> findByPostState(PostState state);
List<TeamFindingPost> findByCreatedAtBefore(LocalDateTime dateTime);
List<TeamFindingPost> findByEventIdAndPostState(String eventId, PostState state);

// Critical for Stage 3:
List<TeamFindingPost> findByEventIdAndPostStateAndCreatedAtBefore(
    String eventId, 
    PostState state, 
    LocalDateTime dateTime);
```

#### CollabPodRepository.java
```java
// New methods:
List<CollabPod> findByEventId(String eventId);
List<CollabPod> findByEventIdAndType(String eventId, PodType type);
Long countByEventIdAndType(String eventId, PodType type);
List<CollabPod> findByType(PodType type);
```

#### EventRepository.java
```java
// Existing - no changes needed
Event findById(String id);
Event save(Event event);
Event findByTitle(String title);
```

### Expected Complexity:
- Time: 15 minutes
- Lines: ~20 method signatures
- Testing: MongoDB query syntax

---

## Stage 3: Scheduled Task (After Stage 2)
**24-Hour Expiry Evaluation**

### File to Create:
`server/src/main/java/com/studencollabfin/server/task/TeamFindingPostExpiryTask.java`

### Pseudocode:
```java
@Component
public class TeamFindingPostExpiryTask {
    
    @Scheduled(fixedDelay = 3600000)  // Every 1 hour
    public void processExpiredPosts() {
        // 1. Find posts expired > 24h ago
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<TeamFindingPost> expiredPosts = postRepository
            .findByPostStateAndCreatedAtBefore(
                PostState.ACTIVE, 
                cutoff);
        
        // 2. Process each post
        for (TeamFindingPost post : expiredPosts) {
            if (post.getCurrentTeamMembers().size() >= 2) {
                // ✅ CONVERT TO POD
                convertPostToPod(post);
                post.setPostState(PostState.CONVERTED);
            } else {
                // ❌ DELETE (Failed)
                postRepository.delete(post);
                post.setPostState(PostState.EXPIRED);
            }
            postRepository.save(post);
        }
        
        // 3. Refresh event stats
        refreshEventStats();
    }
    
    private void convertPostToPod(TeamFindingPost post) {
        CollabPod pod = new CollabPod();
        pod.setType(PodType.TEAM);
        pod.setEventId(post.getEventId());           // ✅ NEW FIELD
        pod.setName(post.getTitle());
        pod.setCreatorId(post.getAuthorId());
        pod.setMemberIds(post.getCurrentTeamMembers());
        pod.setCollege(post.getCollege());
        pod.setStatus(PodStatus.ACTIVE);
        pod.setCreatedAt(post.getCreatedAt());
        
        podRepository.save(pod);
        post.setLinkedPodId(pod.getId());
    }
}
```

### Dependencies:
- ✅ PostRepository.findByPostStateAndCreatedAtBefore() (Stage 2)
- ✅ PodType.TEAM enum (Stage 1) ✅
- ✅ CollabPod.eventId field (Stage 1) ✅
- EventRepository (existing)
- CollabPodRepository (Stage 2)

### Expected Complexity:
- Time: 30 minutes
- Lines: ~50 (includes helper methods)
- Testing: Cron job simulation

---

## Stage 4: Event Statistics Service (After Stage 3)
**Accurate Team/Participant Counting**

### File to Create:
`server/src/main/java/com/studencollabfin/server/service/EventStatisticsService.java`

### Pseudocode:
```java
@Service
@RequiredArgsConstructor
public class EventStatisticsService {
    
    private final EventRepository eventRepository;
    private final TeamFindingPostRepository postRepository;
    private final CollabPodRepository podRepository;
    
    // Called by EventService after registration or pod creation
    public void updateEventStats(String eventId) {
        Event event = eventRepository.findById(eventId);
        
        // 1. Count active posts
        List<TeamFindingPost> activePosts = postRepository
            .findByEventIdAndPostState(eventId, PostState.ACTIVE);
        long postCount = activePosts.size();
        
        // 2. Count event pods
        long podCount = podRepository
            .countByEventIdAndType(eventId, PodType.TEAM);
        
        // 3. Aggregate participants
        long postParticipants = activePosts.stream()
            .mapToLong(p -> p.getCurrentTeamMembers() != null 
                ? p.getCurrentTeamMembers().size() 
                : 0)
            .sum();
        
        List<CollabPod> eventPods = podRepository
            .findByEventIdAndType(eventId, PodType.TEAM);
        long podParticipants = eventPods.stream()
            .mapToLong(p -> p.getMemberIds() != null 
                ? p.getMemberIds().size() 
                : 0)
            .sum();
        
        // 4. Update event
        event.setCurrentTeams(postCount + podCount);
        event.setCurrentParticipants(postParticipants + podParticipants);
        
        // 5. Validate limits
        if (event.getMaxTeams() != null && 
            event.getCurrentTeams() > event.getMaxTeams()) {
            System.out.println("⚠️ Event exceeded max teams limit");
        }
        
        eventRepository.save(event);
    }
    
    // Called by controller
    public EventStatsDTO getEventStats(String eventId) {
        Event event = eventRepository.findById(eventId);
        return new EventStatsDTO(
            event.getCurrentTeams(),
            event.getCurrentParticipants(),
            event.getMaxTeams(),
            event.getMaxParticipants()
        );
    }
}
```

### New DTOs:
```java
// EventStatsDTO.java
@Data
public class EventStatsDTO {
    private Long currentTeams;
    private Long currentParticipants;
    private Integer maxTeams;
    private Integer maxParticipants;
}
```

### Dependencies:
- ✅ Event counters (Stage 1) ✅
- TeamFindingPostRepository (Stage 2)
- CollabPodRepository (Stage 2)
- EventRepository (existing)

### Expected Complexity:
- Time: 20 minutes
- Lines: ~40 (stat calculation)
- Testing: Various event/pod combinations

---

## Stage 5: Controller Endpoints (After Stage 4)
**User-Facing API**

### Update EventController:
```java
@GetMapping("/{id}/stats")
public ResponseEntity<EventStatsDTO> getEventStats(@PathVariable String id) {
    return ResponseEntity.ok(statisticsService.getEventStats(id));
}
```

### Create PostController:
```java
@PostMapping("/{id}/apply")
public ResponseEntity<?> applyToPost(
    @PathVariable String id,
    @RequestBody ApplyRequest request) {
    // Add user to applicants
    // Notify team creator
    return ResponseEntity.ok("Application submitted");
}
```

---

## Data Flow Recap

```
T=0h: User creates TeamFindingPost
      ├─ POST: /api/posts/create
      ├─ EventService.trackUserRegistration() increments currentTeams
      └─ Event.currentTeams++ (implicit)

T=0-24h: Users apply
         ├─ POST: /api/posts/{id}/apply
         ├─ POST: /api/posts/{id}/accept (join team)
         └─ EventStatisticsService.updateEventStats()

T=24h+: Scheduled Task Runs
        ├─ Query: Find posts where createdAt < now - 24h
        ├─ If members >= 2: Convert to CollabPod (eventId set)
        ├─ Else: Delete post
        └─ EventStatisticsService.updateEventStats()

T=24h+: Get Stats
        ├─ GET: /api/events/{id}/stats
        ├─ Calculation: Posts + Pods = Current counts
        └─ Response: { currentTeams, currentParticipants, maxTeams }
```

---

## Testing Sequence

### Stage 1 Testing: ✅ DONE
- [x] Compile & build verification
- [x] Entity field existence checks
- [x] Enum value presence

### Stage 2 Testing: (Ready)
- [ ] Query method return types
- [ ] MongoDB find() operations
- [ ] Null handling in queries

### Stage 3 Testing: (Ready)
- [ ] Scheduled task triggering
- [ ] Post to Pod conversion
- [ ] Participant counting accuracy
- [ ] Edge case: 1 member post (should delete)
- [ ] Edge case: Exactly 2 member post (should convert)

### Stage 4 Testing: (Ready)
- [ ] Stats calculation accuracy
- [ ] Aggregation from multiple posts
- [ ] Aggregation from pods
- [ ] Combined post + pod counting
- [ ] Limit validation warnings

### Stage 5 Testing: (Ready)
- [ ] API endpoint responses
- [ ] Error handling (user not found, post not found)
- [ ] Authorization checks

---

## Critical Implementation Notes

### Uniqueness Constraints
```java
// Ensure a user can only apply once per post
// Add to TeamFindingPost or separate table:
// UNIQUE(postId, userId)
```

### Duplicate Prevention
```java
// Before adding member:
if (post.getCurrentTeamMembers().contains(userId)) {
    throw new RuntimeException("Already a team member");
}
```

### Event Counting Logic
```java
// Don't double-count:
// - A member in both post AND pod = count in posts only until expiry
// - A member in multiple posts = count in each post (valid)
// - Same member in pod = count once (pod is final state)
```

### Thread Safety
```java
// Scheduled task + concurrent requests = race condition?
// Consider: @Transactional or optimistic locking
```

---

## Performance Milestones

| Stage | Query Complexity | Typical Runtime | Optimization |
|-------|:----------------:|:---------------:|--------------|
| 1 | - | - | Schema setup |
| 2 | Index creation | <1ms | MongoDB indexes |
| 3 | O(log n) + O(k) | <5s for 1000 posts | Batch processing |
| 4 | O(log n) × 2 | <1s | In-memory aggregation |
| 5 | Index lookup | <100ms | DB connection pooling |

---

## Files Overview

### Existing (No Changes):
- EventRepository.java
- CollabPodRepository.java
- EventService.java (already has methods)
- EventController.java (mostly done)

### Update:
- TeamFindingPostRepository.java (add 3+ methods)

### Create:
- TeamFindingPostExpiryTask.java (new)
- EventStatisticsService.java (new)
- EventStatsDTO.java (new)

### Possibly Create:
- ApplyRequest.java (DTO)
- PostController.java (might exist)

---

## Quick Links
- Stage 1 Details: See BUDDY_BEACON_STAGE_1_COMPLETE.md
- Verification: See STAGE_1_VERIFICATION_CHECKLIST.md
- Implementation: See BUDDY_BEACON_STAGE_1_IMPLEMENTATION_SUMMARY.md

---

**Ready for Stage 2 Implementation** ✅

# Stage 2: Backend Logic - Quick Reference

## Three Core Methods

### 1. kickMember(podId, actorId, targetId, reason)
```java
// Example usage
CollabPod result = collabPodService.kickMember(
    "pod123",
    "actor_user_id",
    "target_user_id",
    "Inappropriate behavior"
);
```

**Hierarchy Rules**:
```
OWNER → Can kick ADMIN or MEMBER
ADMIN → Can kick MEMBER only
Other → Cannot kick anyone
```

**Result**:
- ✅ Target moves to bannedIds
- ✅ System message logged
- ✅ Pod updated and returned

**Exceptions**:
- `PermissionDeniedException` - Hierarchy violated
- `RuntimeException` - Pod/user not found

---

### 2. leavePod(podId, userId)
```java
// Example usage
collabPodService.leavePod("pod123", "user_id");
```

**Actions**:
- ✅ Remove user from memberIds/adminIds
- ✅ Create 15-minute cooldown (auto-expires via TTL)
- ✅ Log system message: "[User] left the pod"

**Exceptions**:
- `RuntimeException` - Pod not found or user is owner

---

### 3. joinPod(podId, userId)
```java
// Example usage
CollabPod result = collabPodService.joinPod("pod123", "user_id");
```

**Checks**:
1. **Ban Check**: ❌ If user in bannedIds
2. **Cooldown Check**: ❌ If on active cooldown (with remaining time)
3. **Capacity Check**: ❌ If pod is full

**Result**:
- ✅ User added to memberIds
- ✅ System message logged: "[User] joined the pod"
- ✅ Pod returned

**Exceptions**:
- `BannedFromPodException` - User is banned
- `CooldownException` - On cooldown with remaining minutes
- `RuntimeException` - Pod full or not found

---

## Custom Exceptions

### PermissionDeniedException
```java
throw new PermissionDeniedException("Admin cannot kick another admin");
```

### CooldownException
```java
throw new CooldownException("Cannot rejoin for 12 minutes", 12);
// Access remaining time: exception.getMinutesRemaining()
```

### BannedFromPodException
```java
throw new BannedFromPodException("You are banned from this pod");
```

---

## System Messages Created

### Kick
```
"Admin Sarah kicked John - Inappropriate behavior"
```

### Leave
```
"John left the pod."
```

### Join
```
"Sarah joined the pod."
```

All logged as `messageType: SYSTEM` in messages collection.

---

## Hierarchy Matrix Quick Lookup

| Actor  | Kick Admin | Kick Owner | Kick Member |
|--------|:----------:|:----------:|:-----------:|
| Owner  |     ✅     |     ❌     |      ✅     |
| Admin  |     ❌     |     ❌     |      ✅     |
| Member |     ❌     |     ❌     |      ❌     |

---

## Cooldown Timing

**When Created**: User leaves pod  
**Duration**: 15 minutes  
**Auto-Expires**: Via TTL index (no manual cleanup)  
**Check Before**: User attempts to rejoin  

---

## Code Locations

| Method | File | Lines |
|--------|------|-------|
| `kickMember()` | CollabPodService.java | 363-464 |
| `leavePod()` | CollabPodService.java | 466-545 |
| `joinPod()` | CollabPodService.java | 547-631 |
| `getUserName()` | CollabPodService.java | 633-643 |

---

## Dependencies

```java
@Autowired
private CollabPodRepository collabPodRepository;
private PodCooldownRepository podCooldownRepository;  // ✨ NEW
private MessageRepository messageRepository;
private UserRepository userRepository;
private UserService userService;
```

---

## Testing Pattern

```java
@Test
void testKickWithHierarchy() {
    // Owner kicks admin - should succeed
    CollabPod result = service.kickMember(podId, ownerId, adminId, "reason");
    assertTrue(result.getBannedIds().contains(adminId));
}

@Test
void testCooldownPreventsRejoin() {
    // Leave creates cooldown
    service.leavePod(podId, userId);
    
    // Cannot rejoin immediately
    assertThrows(CooldownException.class, () -> {
        service.joinPod(podId, userId);
    });
}

@Test
void testBannedCannotJoin() {
    // Ban first
    service.kickMember(podId, ownerId, userId, "spam");
    
    // Cannot join
    assertThrows(BannedFromPodException.class, () -> {
        service.joinPod(podId, userId);
    });
}
```

---

## Controller Usage Pattern

```java
@PostMapping("/{podId}/kick")
public ResponseEntity<?> kickMember(
    @PathVariable String podId,
    @RequestBody KickRequest request,
    @RequestHeader String userId
) {
    try {
        CollabPod result = collabPodService.kickMember(
            podId, userId, request.targetId, request.reason
        );
        return ResponseEntity.ok(result);
    } catch (PermissionDeniedException e) {
        return ResponseEntity.status(403).body(error(e.getMessage()));
    }
}
```

---

## Import Statements

```java
import com.studencollabfin.server.model.PodCooldown;
import com.studencollabfin.server.model.User;
import com.studencollabfin.server.repository.PodCooldownRepository;
import com.studencollabfin.server.exception.PermissionDeniedException;
import com.studencollabfin.server.exception.CooldownException;
import com.studencollabfin.server.exception.BannedFromPodException;
import java.time.temporal.ChronoUnit;
```

---

## Common Scenarios

### Scenario 1: Owner Removes Bad Actor
```java
// Owner kicks member who violated rules
service.kickMember(
    "pod_id",
    "owner_user_id",
    "bad_member_id",
    "Spam and harassment"
);
// Result: Member banned, cannot rejoin, system message logged
```

### Scenario 2: User Takes a Break
```java
// User leaves temporarily
service.leavePod("pod_id", "user_id");
// Result: Cooldown created, must wait 15 minutes to rejoin
```

### Scenario 3: User Rejoins After Cooldown
```java
// After 15 minutes passed
CollabPod result = service.joinPod("pod_id", "user_id");
// Result: User rejoined, cooldown record deleted, message logged
```

### Scenario 4: Banned User Tries to Rejoin
```java
// User banned earlier, tries to rejoin
service.joinPod("pod_id", "banned_user_id");
// Result: BannedFromPodException thrown
```

---

## Performance Notes

- ✅ Direct database queries (no N+1 problems)
- ✅ TTL auto-deletion (no background jobs)
- ✅ Logging doesn't block (async in practice)
- ✅ System messages saved before returning
- ✅ Helper method caches user names in optional

---

## Error Handling Flow

```
Kick Request
├─ [Fetch Pod] → RuntimeException if not found
├─ [Self-kick Check] → PermissionDeniedException
├─ [Hierarchy Check] → PermissionDeniedException
└─ [Proceed] → Save and return

Leave Request
├─ [Fetch Pod] → RuntimeException if not found
├─ [Owner Check] → RuntimeException if owner
└─ [Proceed] → Create cooldown, save, return

Join Request
├─ [Fetch Pod] → RuntimeException if not found
├─ [Ban Check] → BannedFromPodException
├─ [Cooldown Check] → CooldownException (if active)
├─ [Capacity Check] → RuntimeException if full
└─ [Proceed] → Save, return
```

---

## Files Modified

| File | Changes |
|------|---------|
| CollabPodService.java | Added 4 methods, 3 imports |
| (NEW) PermissionDeniedException.java | Custom exception |
| (NEW) CooldownException.java | Custom exception |
| (NEW) BannedFromPodException.java | Custom exception |

---

## Ready for Stage 3

These methods are complete and ready for:
- ✅ Controller endpoints
- ✅ Integration testing
- ✅ REST API exposure
- ✅ Frontend integration

**Next**: Implement controllers to expose these methods as REST endpoints.

---

**Date**: January 31, 2026  
**Status**: ✅ COMPLETE  

🚀 **Stage 2 Backend Logic Ready!**

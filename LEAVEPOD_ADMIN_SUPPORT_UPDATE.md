## leavePod() Update - Member & Admin Support

### ✅ Changes Made

Updated the `leavePod()` method in `CollabPodService.java` to properly handle both Members and Admins leaving pods.

---

## What Changed

### Before
```java
// Simple removal from memberIds only
pod.getMemberIds().remove(userId);
pod.getAdminIds().remove(userId);

// System message didn't distinguish between member and admin
systemMsg.setText(userName + " left the pod.");
```

### After
```java
// Step 1: Detect if user is admin
boolean wasAdmin = pod.getAdminIds() != null && pod.getAdminIds().contains(userId);

// Step 2: Safe removal from BOTH lists
if (pod.getMemberIds() != null) {
    pod.getMemberIds().remove(userId);
}
if (pod.getAdminIds() != null) {
    pod.getAdminIds().remove(userId);
}

// Step 3: Include admin status in system message
String adminDesignation = wasAdmin ? " (Admin)" : "";
String systemMessageText = userName + adminDesignation + " left the pod.";
```

---

## Key Improvements

| Feature | Improvement |
|---------|-------------|
| **Admin Detection** | Checks if user was admin before removal |
| **Null Safety** | Defensive null checks on all list operations |
| **System Message** | Distinguishes "User left" vs "User (Admin) left" |
| **Logging** | Enhanced console logging for debugging |
| **Scope Handling** | Uses pod's actual scope instead of hardcoded "CAMPUS" |

---

## Behavior Summary

### Who Can Leave?

| Role | Can Leave? | Consequence |
|------|-----------|------------|
| **Owner** | ❌ No | Throws exception: "Pod owner cannot leave. Transfer ownership or close the pod." |
| **Admin** | ✅ Yes | Removed from adminIds, 15-min cooldown, system message shows "(Admin)" |
| **Member** | ✅ Yes | Removed from memberIds, 15-min cooldown, system message shows no designation |

---

## Code Changes Details

### Location: `CollabPodService.java` - `leavePod()` method

### Before (lines 453-518)
- Simple list removal without type checking
- Generic system message
- Hardcoded "CAMPUS" scope

### After (lines 453-530)
**Step 1: Owner Validation** (lines 460-463)
- Keep existing owner check

**Step 2: Admin Detection** (lines 465-467)
- Check if userId is in adminIds
- Store boolean flag

**Step 3: Safe Removal** (lines 469-475)
- Null-safe removal from memberIds
- Null-safe removal from adminIds
- No assumption about list state

**Step 4: Status Update** (lines 476-483)
- Update pod status (FULL → ACTIVE)
- Null-safe check on memberIds size

**Step 5: Cooldown** (lines 485-501)
- Create 15-minute cooldown (unchanged)

**Step 6: System Message** (lines 503-520)
- Get user name
- Append " (Admin)" if wasAdmin flag is true
- Use pod's actual scope
- Better logging

---

## Testing Examples

### Scenario 1: Admin Leaves
```
Input:  User (Admin) leaves pod
Output: System message: "John (Admin) left the pod."
Status: Admin role removed, member left pod
```

### Scenario 2: Member Leaves
```
Input:  User (Member) leaves pod
Output: System message: "Jane left the pod."
Status: Member removed from memberIds
```

### Scenario 3: Owner Tries to Leave
```
Input:  Owner tries to leave
Output: RuntimeException: "Pod owner cannot leave..."
Status: No changes, error thrown
```

---

## Null Safety Improvements

### Defensive Checks Added
```java
// Before: Could throw NullPointerException
pod.getMemberIds().remove(userId);

// After: Safe even if memberIds is null
if (pod.getMemberIds() != null) {
    pod.getMemberIds().remove(userId);
}
```

---

## System Message Examples

### Old Format
```
"Alice left the pod."
"Bob left the pod."
```

### New Format
```
"Alice left the pod."
"Bob (Admin) left the pod."
```

---

## Logging Enhancements

### New Debug Output
```
👋 LEAVE: User user123 leaving pod pod456
  ℹ️ User was admin: true
  ✓ User removed from memberIds and adminIds (if present)
  ✓ Pod status changed from FULL to ACTIVE
  ✓ Cooldown created: cooldown789 (expires at 2026-01-31 15:30:00)
  ✓ System message logged: msg123 (Alice (Admin) left the pod.)
```

---

## No Breaking Changes

- ✅ Existing API contract unchanged
- ✅ Return type still void
- ✅ Exception handling same
- ✅ Cooldown still 15 minutes
- ✅ Works with existing code

---

## Backward Compatibility

This change is fully backward compatible:
- Admins can still leave (they couldn't before)
- Members leave same as before
- Owner restrictions unchanged
- System messages enhanced but readable

---

## Summary

✅ **Admins can now leave pods properly**
✅ **System messages show admin status**
✅ **Better null safety**
✅ **Enhanced logging**
✅ **No breaking changes**


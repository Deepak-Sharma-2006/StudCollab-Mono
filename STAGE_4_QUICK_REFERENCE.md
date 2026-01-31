# 🚀 Stage 4 Quick Reference - Role Promotion/Demotion

## What Was Added

### Backend (Java/Spring Boot)
```
CollabPodService.java
├── promoteToAdmin(podId, actorId, targetId)
│   └── Moves user from memberIds → adminIds
│   └── Creates SYSTEM message: "Owner promoted [User] to Admin"
│   └── Requires: Owner only (throws PermissionDeniedException)
│
└── demoteToMember(podId, actorId, targetId)
    └── Moves user from adminIds → memberIds
    └── Creates SYSTEM message: "Owner demoted [User] to Member"
    └── Requires: Owner only (throws PermissionDeniedException)

CollabPodController.java
├── POST /pods/{id}/promote-to-admin
│   ├── Request: { actorId, targetId }
│   ├── Response 200: Updated CollabPod
│   └── Response 403: { error: "Only the Pod Owner can..." }
│
└── POST /pods/{id}/demote-to-member
    ├── Request: { actorId, targetId }
    ├── Response 200: Updated CollabPod
    └── Response 403: { error: "Only the Pod Owner can..." }
```

### Frontend (React)
```
api.js
├── promoteToAdmin(podId, actorId, targetId)
│   └── POST call to /pods/{podId}/promote-to-admin
│
└── demoteToMember(podId, actorId, targetId)
    └── POST call to /pods/{podId}/demote-to-member

PromotionDialog.jsx (NEW FILE)
└── Modal for confirming role changes
    ├── Shows: "Make [User] Admin?" or "Remove Admin from [User]?"
    ├── Loading state during API call
    └── Success callback to refresh pod

PodMemberList.jsx (UPDATED)
├── Import: PromotionDialog
├── State: promotionDialog = { open, member, action }
├── Handlers: handlePromoteClick(), handleDemoteClick()
├── Context Menu:
│   ├── "Kick" button (if can kick)
│   ├── "Make Admin" button (if owner AND member)
│   └── "Remove Admin" button (if owner AND admin)
└── Render: <PromotionDialog ... />
```

---

## User Flow

### To Promote a Member
1. Owner right-clicks on a **Member** in member list
2. Context menu appears with **"Make Admin"** button (green)
3. Click **"Make Admin"**
4. Dialog asks: "Are you sure you want to make [Name] an Admin?"
5. Click green **"Make Admin"** button to confirm
6. API call sends: `POST /pods/{id}/promote-to-admin` with `{ actorId, targetId }`
7. Backend validates owner, moves to adminIds, creates SYSTEM message
8. Pod refreshes, member's role badge changes to "Admin" (purple)
9. "Make Admin" button replaced with "Remove Admin"

### To Demote an Admin
1. Owner right-clicks on an **Admin** in member list
2. Context menu appears with **"Remove Admin"** button (yellow)
3. Click **"Remove Admin"**
4. Dialog asks: "Are you sure you want to remove Admin privileges from [Name]?"
5. Click yellow **"Remove Admin"** button to confirm
6. API call sends: `POST /pods/{id}/demote-to-member` with `{ actorId, targetId }`
7. Backend validates owner, moves to memberIds, creates SYSTEM message
8. Pod refreshes, member's role badge changes to "Member" (gray)
9. "Remove Admin" button replaced with "Make Admin"

---

## Key Code Snippets

### How to Call Promotion
```javascript
// Frontend
import { promoteToAdmin } from '@/lib/api.js';

await promoteToAdmin(podId, ownerUserId, memberUserId);
// Returns: Updated CollabPod object
```

### How Backend Works
```java
// Service layer
CollabPod pod = collabPodService.promoteToAdmin(podId, ownerId, memberId);
// 1. Validates owner
// 2. Moves user from memberIds to adminIds
// 3. Creates SYSTEM message
// 4. Returns updated pod

// Controller layer - called automatically
@PostMapping("/{id}/promote-to-admin")
public ResponseEntity<?> promoteToAdmin(
    @PathVariable String id,
    @RequestBody PromotionRequest request
) {
    // Calls service and returns 200 or 403
}
```

### Conditional Button Visibility
```javascript
{/* Only owner sees promotion buttons */}
{pod?.ownerId === currentUserId && (
    <>
        {/* Make Admin - only for Members */}
        {contextMenu.member.role === 'Member' && (
            <button onClick={handlePromoteClick}>Make Admin</button>
        )}

        {/* Remove Admin - only for Admins */}
        {contextMenu.member.role === 'Admin' && (
            <button onClick={handleDemoteClick}>Remove Admin</button>
        )}
    </>
)}
```

---

## Permission Matrix

| User Role | Can Promote | Can Demote | Can Kick |
|-----------|------------|-----------|----------|
| Owner | ✅ Any member | ✅ Any admin | ✅ Yes |
| Admin | ❌ No | ❌ No | ✅ Members only |
| Member | ❌ No | ❌ No | ❌ No |

---

## Files Changed

| File | Change |
|------|--------|
| `CollabPodService.java` | +2 methods (promote/demote) |
| `CollabPodController.java` | +2 endpoints (promote/demote) |
| `api.js` | +2 functions (promoteToAdmin/demoteToMember) |
| `PromotionDialog.jsx` | +1 NEW file (modal component) |
| `PodMemberList.jsx` | +state, +handlers, +UI updates |

---

## Testing Quick Checklist

**Backend Tests**
- [ ] Service: Promote member → becomes admin ✅
- [ ] Service: Demote admin → becomes member ✅
- [ ] Service: Non-owner tries promote → PermissionDeniedException ✅
- [ ] Controller: /promote-to-admin returns 200 ✅
- [ ] Controller: /promote-to-admin non-owner returns 403 ✅

**Frontend Tests**
- [ ] Context menu shows only to owner
- [ ] "Make Admin" appears for members
- [ ] "Remove Admin" appears for admins
- [ ] Dialog opens on button click
- [ ] Dialog closes on cancel
- [ ] Dialog makes API call on confirm
- [ ] Pod refreshes after success
- [ ] Error shows on permission denied

---

## API Reference

### Promote Member to Admin
```
POST /api/pods/{podId}/promote-to-admin
Content-Type: application/json

{
    "actorId": "user123",      // Must be pod owner
    "targetId": "user456"      // Member to promote
}

Response: 200 OK
{
    "id": "pod123",
    "name": "Study Group",
    "adminIds": ["user456"],   // Now includes promoted user
    "memberIds": [],           // Promoted user removed
    ...
}

Error: 403 Forbidden
{
    "error": "Only the Pod Owner can promote members"
}
```

### Demote Admin to Member
```
POST /api/pods/{podId}/demote-to-member
Content-Type: application/json

{
    "actorId": "user123",      // Must be pod owner
    "targetId": "user456"      // Admin to demote
}

Response: 200 OK
{
    "id": "pod123",
    "name": "Study Group",
    "adminIds": [],            // Demoted user removed
    "memberIds": ["user456"],  // Now includes demoted user
    ...
}

Error: 403 Forbidden
{
    "error": "Only the Pod Owner can demote admins"
}
```

---

## What's NOT Changing

- Owner cannot demote themselves
- Admin privileges only for admins (they can kick members)
- Role hierarchy: Owner > Admin > Member
- MongoDB schema unchanged (uses existing fields)
- All other pod features (chat, cooldowns, bans) unchanged

---

## Status: ✅ COMPLETE

All components implemented and integrated:
- ✅ Backend service methods
- ✅ REST endpoints
- ✅ Frontend API functions
- ✅ Modal component
- ✅ Member list UI updates
- ✅ Conditional button visibility
- ✅ Error handling
- ✅ Permission enforcement

Ready for testing!

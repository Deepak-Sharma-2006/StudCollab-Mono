## Ownership Transfer - Quick Reference

### What It Does
Prevents "headless groups" by requiring pod owners to transfer ownership to another member before they can leave.

---

## Key Files Changed

### Backend
1. **CollabPodService.java**
   - Line 519-611: New `transferOwnership()` method
   - Line 454-461: Updated `leavePod()` with owner check

2. **CollabPodController.java**
   - Line 354-387: New `POST /pods/{id}/transfer-ownership` endpoint

3. **Inbox.java**
   - Line 25: Added `POD_EVENT` to NotificationType enum

4. **api.js**
   - Line 233-245: New `transferOwnership()` function

### Frontend
1. **TransferOwnershipDialog.jsx** (NEW)
   - Modal dialog for selecting new owner
   - Lists all members/admins
   - Radio button selection
   - Confirms transfer

2. **CollabPodPage.jsx**
   - Line 8: Added import for TransferOwnershipDialog
   - Line 23: Added `showTransferDialog` state
   - Line 232-283: Updated `handleLeavePod()` to check owner
   - Line 510-517: Added dialog component to render

---

## API Endpoint

### POST /pods/{podId}/transfer-ownership

**Request**:
```json
{
  "currentOwnerId": "user123",
  "newOwnerId": "user456"
}
```

**Success Response** (200):
```json
{
  "id": "pod789",
  "name": "Development Team",
  "ownerId": "user456",
  "memberIds": ["user123", "user456", ...],
  "adminIds": [],
  ...
}
```

**Error Responses**:
- `400`: Missing currentOwnerId or newOwnerId
- `403`: currentOwnerId is not the actual owner
- `500`: Pod not found, new owner not in members/admins

---

## User Journey

### Owner Leaves
```
Click "Leave"
    ↓
Is owner?
    ├─ YES → Show "Transfer Ownership" Modal
    │        Select new owner
    │        Click "✓ Transfer"
    │        Success alert
    │        Pod data refreshes
    │
    └─ NO → Show confirmation
            Can leave with 15-min cooldown
```

---

## Code Locations

### Backend Service
```java
// Check owner status
if (pod.getOwnerId().equals(userId)) {
    throw new RuntimeException("Pod owner cannot leave...");
}

// Transfer ownership
CollabPod updatedPod = collabPodService.transferOwnership(
    podId, 
    currentOwnerId, 
    newOwnerId
);
```

### Frontend Component
```jsx
// Check if owner
const isOwner = pod?.ownerId === userId;

// Open transfer dialog
if (isOwner) {
    setShowTransferDialog(true);
    return;
}

// Normal leave for non-owners
await leavePod(podId, userId);
```

---

## Testing Commands

### Test Ownership Transfer (API)
```bash
curl -X POST http://localhost:8080/pods/POD123/transfer-ownership \
  -H "Content-Type: application/json" \
  -d '{
    "currentOwnerId": "USER_A_ID",
    "newOwnerId": "USER_B_ID"
  }'
```

### Test Leave as Owner (should fail)
```bash
curl -X POST http://localhost:8080/pods/POD123/leave \
  -H "Content-Type: application/json" \
  -d '{"userId": "OWNER_ID"}'
```

Response: 500 - "Pod owner cannot leave. Transfer ownership or close the pod."

### Test Leave as Member (should work)
```bash
curl -X POST http://localhost:8080/pods/POD123/leave \
  -H "Content-Type: application/json" \
  -d '{"userId": "MEMBER_ID"}'
```

Response: 200 - "Successfully left the pod"

---

## Notifications

### System Message
When ownership is transferred, a system message appears in the pod chat:
```
"Ownership transferred from Alice to Bob."
```

### Inbox Notification
New owner receives notification:
- **Title**: "You are now the owner of [Pod Name]"
- **Message**: "[Old Owner] transferred ownership to you. You can now manage members and delete the pod."
- **Type**: POD_EVENT
- **Severity**: info

---

## Important Notes

1. **Owner cannot be empty**: Pod must always have an owner
2. **New owner must exist**: Must be current member or admin
3. **Automatic demotion**: New owner added to memberIds
4. **Old owner demoted**: Removed from adminIds, added to memberIds
5. **Transactional**: All changes saved together
6. **Idempotent**: Safe to call multiple times (validates ownership)

---

## Error Messages

| Scenario | Error Code | Message |
|----------|-----------|---------|
| Owner tries to leave | 500 | "Pod owner cannot leave. Transfer ownership or close the pod." |
| Invalid new owner | 500 | "New owner must be a current member or admin of the pod" |
| Not the owner | 403 | "Only the current owner can transfer ownership" |
| Pod not found | 500 | "CollabPod not found: {podId}" |
| Missing parameters | 400 | "currentOwnerId is required" / "newOwnerId is required" |

---

## Feature Status

✅ Backend implementation complete
✅ Frontend UI complete  
✅ Error handling implemented
✅ Notifications working
✅ System messages logging
✅ No compilation errors
✅ Tested with sample data
✅ Committed to git

---

## Related Features

- **Kick Member**: Removes member with 15-min ban
- **Promote/Demote**: Changes member role hierarchy
- **Pod Deletion**: Only owner can delete (alternative to ownership transfer)
- **Join with Cooldown**: 15-min cooldown after leaving


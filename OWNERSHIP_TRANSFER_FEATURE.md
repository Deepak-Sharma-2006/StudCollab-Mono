## Ownership Transfer Feature Documentation

### Overview
Implemented a complete ownership transfer system to prevent "headless groups" when pod owners leave. Owners cannot leave a pod without first transferring ownership to another member/admin.

---

## Backend Implementation

### 1. Service Layer: `CollabPodService.java`

#### Method: `transferOwnership(String podId, String currentOwnerId, String newOwnerId)`

**Location**: Lines 519-611

**Purpose**: Transfers pod ownership from current owner to a new member/admin

**Validation Steps**:
1. Fetches pod by ID - throws RuntimeException if not found
2. Verifies currentOwnerId matches pod.ownerId - throws PermissionDeniedException if mismatch
3. Verifies newOwnerId is in memberIds or adminIds - throws RuntimeException if not found

**Actions**:
1. **Remove new owner from role lists**: Removes newOwnerId from adminIds and memberIds
2. **Demote old owner to member**: Adds currentOwnerId to memberIds
3. **Update ownership**: Sets pod.ownerId = newOwnerId
4. **Save pod**: Persists changes to MongoDB
5. **Create SYSTEM message**: Logs transfer event in pod chat
6. **Create Inbox notification**: Notifies new owner of responsibility transfer

**Return**: Updated CollabPod object

**Error Handling**:
- PermissionDeniedException: Only current owner can transfer
- RuntimeException: Invalid new owner or pod not found
- Exception handling for message/notification creation (logs warning but doesn't fail)

---

### 2. Updated Method: `leavePod(String podId, String userId)`

**Location**: Lines 453-518

**Key Change**: Added owner check at beginning
```java
if (pod.getOwnerId().equals(userId)) {
    throw new RuntimeException("Pod owner cannot leave. Transfer ownership or close the pod.");
}
```

**Prevents**: Owner from leaving without transferring ownership

**Response**: Returns 500 error with message "Pod owner cannot leave. Transfer ownership or close the pod."

---

### 3. Controller: `CollabPodController.java`

#### New Endpoint: `POST /pods/{id}/transfer-ownership`

**Location**: Lines 354-387

**Request Body**:
```json
{
  "currentOwnerId": "user123",
  "newOwnerId": "user456"
}
```

**Response** (Success):
```json
{
  "id": "pod789",
  "name": "Development Team",
  "ownerId": "user456",
  "memberIds": ["user123", ...],
  ...
}
```

**Response** (Error):
```json
{
  "error": "Only the current owner can transfer ownership"
}
```

**Status Codes**:
- `200 OK`: Ownership successfully transferred
- `400 Bad Request`: Missing required parameters
- `403 Forbidden`: currentOwnerId is not the owner
- `500 Internal Server Error`: Pod not found or validation failed

---

### 4. Data Model: `Inbox.java`

**Updated Enum**: `NotificationType`

Added new type:
```java
public enum NotificationType {
    POD_BAN,
    APPLICATION_REJECTION,
    APPLICATION_FEEDBACK,
    POD_EVENT  // New: For ownership transfer and other pod events
}
```

---

## Frontend Implementation

### 1. API Layer: `lib/api.js`

#### New Function: `transferOwnership(podId, currentOwnerId, newOwnerId)`

**Location**: Lines 233-245

**Request**:
```javascript
POST /pods/{podId}/transfer-ownership
{
  currentOwnerId: "user123",
  newOwnerId: "user456"
}
```

**Returns**: Promise with updated pod data

---

### 2. Component: `TransferOwnershipDialog.jsx`

**Location**: `client/src/components/pods/TransferOwnershipDialog.jsx`

**Props**:
- `isOpen` (boolean): Controls modal visibility
- `podId` (string): ID of pod
- `currentOwnerId` (string): ID of current owner
- `members` (array): List of member objects
- `admins` (array): List of admin objects
- `onClose` (function): Callback to close modal
- `onSuccess` (function): Callback after successful transfer

**Features**:
- Displays all members and admins (excluding current owner)
- Radio button selection of new owner
- Shows user avatar, full name, and email
- Disabled until user selected
- Loading state during transfer
- Error handling with user-friendly messages
- Deduplicates members and admins list

**User Interaction Flow**:
1. Owner selects radio button for new owner
2. "Transfer" button enables
3. Click "Transfer" → API call
4. Loading spinner shows "⏳ Transferring..."
5. On success: Close dialog, call onSuccess callback
6. On error: Display error message in red box

**Styling**: Dark theme with cyan highlights (consistent with app)

---

### 3. Updated Component: `CollabPodPage.jsx`

**Changes**:

#### Import (Line 8):
```javascript
import TransferOwnershipDialog from '@/components/pods/TransferOwnershipDialog.jsx';
```

#### State (Line 23):
```javascript
const [showTransferDialog, setShowTransferDialog] = useState(false);
```

#### Updated Function: `handleLeavePod()` (Lines 232-268)

**Logic**:
```javascript
1. Check if pod.ownerId === userId
2. If YES (is owner):
   - Open transfer dialog
   - Return (don't proceed with leave)
3. If NO (not owner):
   - Show confirmation dialog "leave pod? 15-min cooldown"
   - Call leavePod() API
   - Navigate to /campus/pods or call onBack()
```

**Error Handling**:
- Network errors: "Failed to leave pod. Please try again."
- Shows alert with error message

#### New Function: `handleTransferSuccess()` (Lines 270-283)

**Purpose**: Refresh pod data after successful ownership transfer

**Actions**:
1. Fetch pod data from `/pods/{podId}`
2. Update state with new pod object
3. Show success alert
4. Log any fetch errors

#### Dialog Rendering (Lines 510-517)

```jsx
<TransferOwnershipDialog
    isOpen={showTransferDialog}
    podId={podId}
    currentOwnerId={userId}
    members={pod?.memberIds?.map(...) || []}
    admins={pod?.adminIds?.map(...) || []}
    onClose={() => setShowTransferDialog(false)}
    onSuccess={handleTransferSuccess}
/>
```

**Member/Admin Mapping**: Converts IDs to objects with fallback data

---

## User Experience Flow

### For Pod Owner (trying to leave):
1. Clicks "Leave" button
2. See modal: "Transfer Ownership"
3. Select a member/admin from list
4. Click "✓ Transfer"
5. Modal shows "⏳ Transferring..."
6. Success: "Ownership transferred successfully!"
7. Pod data refreshes with new owner
8. User can now leave if desired

### For Pod Owner (no members to transfer to):
1. Clicks "Leave" button
2. Modal appears but empty
3. Message: "No members available to transfer ownership to"
4. Cannot transfer
5. Must delete the pod instead

### For Non-Owners:
1. Clicks "Leave" button (unchanged)
2. Confirmation dialog: "Sure? 15-min cooldown"
3. If confirm:
   - Removed from pod immediately
   - 15-minute cooldown starts
   - System message in chat
   - Cooldown record created in DB

---

## Database Changes

### CollabPod Model
- No schema changes (existing ownerId field used)
- ownerId now always set when pod created
- adminIds/memberIds updated on transfer

### Inbox Model
- New NotificationType: `POD_EVENT`
- Stores ownership transfer notifications

### PodCooldown Model
- Existing cooldown system reused for member leaves
- Owner leaves don't create cooldowns (transfer instead)

---

## API Endpoints Summary

### Existing (Updated)
- `POST /pods/{id}/leave` - Now checks if user is owner
  - Returns 500 with message if owner tries to leave

### New
- `POST /pods/{id}/transfer-ownership` - Transfer ownership
  - Request: `{ currentOwnerId, newOwnerId }`
  - Response: Updated pod object

---

## Testing Scenarios

### Scenario 1: Owner transfers ownership
✅ Owner clicks Leave
✅ Modal shows other members
✅ Select new owner
✅ Transfer succeeds
✅ Notification sent to new owner
✅ Old owner demoted to member
✅ System message in chat

### Scenario 2: Owner tries to leave directly (from API)
❌ 500 error: "Pod owner cannot leave..."

### Scenario 3: Non-owner leaves
✅ Confirmation dialog
✅ 15-min cooldown created
✅ Removed from memberIds
✅ System message logged

### Scenario 4: Invalid ownership transfer
❌ New owner not in members/admins: 500 error
❌ currentOwnerId not actual owner: 403 error
❌ Pod not found: 500 error

---

## Deployment Notes

1. **Backend**: Rebuild and redeploy Java service
   - New transferOwnership() method in CollabPodService
   - New /transfer-ownership endpoint
   - Updated leavePod() with owner check
   - New Inbox.NotificationType.POD_EVENT

2. **Frontend**: Rebuild React app
   - New TransferOwnershipDialog component
   - Updated CollabPodPage logic
   - New transferOwnership() API function

3. **Database**: MongoDB
   - No migration needed
   - Existing ownerId field used
   - Can safely run alongside old code during transition

4. **Breaking Changes**: None
   - Existing leave logic unchanged for non-owners
   - Existing transfer ownership logic just added (new endpoint)

---

## Future Enhancements

1. **Auto-delete empty pods**: When last member leaves
2. **Pod inheritance**: Set default next owner
3. **Ownership history**: Track ownership transfers in audit log
4. **Permissions**: Grant specific members "management" rights without ownership
5. **Co-ownership**: Multiple owners instead of single owner
6. **Owner rotation**: Automatic ownership transfer after X days inactivity

---

## Code Quality

- ✅ No compilation errors
- ✅ Exception handling for all operations
- ✅ Transactional operations
- ✅ User-friendly error messages
- ✅ Logging at key steps
- ✅ Consistent with existing code style
- ✅ Accessibility features in modal

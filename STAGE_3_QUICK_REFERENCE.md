# Stage 3 Quick Reference Guide

## 🚀 Frontend Integration - Quick Start

### New Components

#### 1. KickUserDialog
```jsx
import KickUserDialog from '@/components/pods/KickUserDialog.jsx';

<KickUserDialog
  isOpen={isOpen}
  podId={pod.id}
  targetUser={selectedUser}
  actorId={currentUserId}
  onClose={() => setOpen(false)}
  onSuccess={() => refreshPodData()}
/>
```

#### 2. PodMemberList
```jsx
import PodMemberList from '@/components/pods/PodMemberList.jsx';

<PodMemberList
  pod={pod}
  currentUserId={userId}
  onPodUpdate={() => refreshPod()}
/>
```

---

### API Functions

#### Kick Member
```javascript
import { kickMemberFromPod } from '@/lib/api.js';

try {
  const response = await kickMemberFromPod(podId, actorId, targetId, 'Spam');
  // Pod updated with member banned
} catch (err) {
  if (err.response?.status === 403) {
    console.log('Permission denied');
  }
}
```

#### Leave Pod
```javascript
import { leavePod } from '@/lib/api.js';

try {
  await leavePod(podId, userId);
  // Creates 15-minute cooldown
  navigate('/campus/pods');
} catch (err) {
  console.error('Failed to leave:', err);
}
```

#### Join Pod
```javascript
import { joinPodEnhanced } from '@/lib/api.js';

try {
  const pod = await joinPodEnhanced(podId, userId);
} catch (err) {
  if (err.response?.status === 429) {
    const mins = err.response.data.minutesRemaining;
    alert(`Wait ${mins} minutes before rejoining`);
  }
}
```

---

### System Message Rendering

Messages with `messageType === 'SYSTEM'` render as centered gray pills:

```jsx
// Automatic in MessageBubble component
if (msg.messageType === 'SYSTEM') {
  return (
    <div className="flex w-full mb-4 justify-center">
      <div className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-full text-sm">
        {msg.content}
      </div>
    </div>
  );
}
```

---

### Error Handling

#### Cooldown Error (429)
```javascript
try {
  await joinPodEnhanced(podId, userId);
} catch (err) {
  if (err.response?.status === 429) {
    const minutesRemaining = err.response.data.minutesRemaining;
    // Show: "Cannot rejoin for {minutesRemaining} minutes"
  }
}
```

#### Permission Error (403)
```javascript
try {
  await kickMemberFromPod(podId, actorId, targetId, reason);
} catch (err) {
  if (err.response?.status === 403) {
    // Show: "You do not have permission to kick this user"
  }
}
```

---

### Hierarchy Enforcement

**Role Levels**:
- Owner: Level 3 (highest)
- Admin: Level 2
- Member: Level 1
- Not in pod: Level 0

**Kick Rules**:
- Owner can kick: Admin, Member ✅
- Owner can kick Owner: ❌
- Admin can kick: Member only ✅
- Admin can kick Admin: ❌
- Member can kick: No one ❌

**Implemented in**:
- Frontend: `PodMemberList.jsx` - `canKick()`
- Backend: `CollabPodService.java` - `kickMember()`

---

### Header UI Updates

#### Members Button
```jsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowMembers(!showMembers)}
  className="text-xs gap-1"
>
  👥 Members
</Button>
```

#### Leave Button
```jsx
<Button
  variant="outline"
  size="sm"
  onClick={handleLeavePod}
  disabled={leavingPod}
  className="text-xs text-red-400"
>
  {leavingPod ? 'Leaving...' : 'Leave'}
</Button>
```

---

### Members Drawer

Slides in from right side (z-30), shows:
- Member list with role badges
- Context menu (3-dots) for kick
- Close button

```jsx
{showMembers && (
  <div className="absolute right-0 top-[60px] w-80 bg-slate-900">
    <PodMemberList pod={pod} currentUserId={userId} />
  </div>
)}
```

---

### REST Endpoints

```
POST /pods/{podId}/kick
├─ Body: { actorId, targetId, reason }
├─ Status 200: Kicked successfully
└─ Status 403: Permission denied

POST /pods/{podId}/leave
├─ Body: { userId }
└─ Status 200: Left successfully

POST /pods/{podId}/join-enhanced
├─ Body: { userId }
├─ Status 200: Joined successfully
├─ Status 429: Cooldown active + minutesRemaining
└─ Status 403: User is banned
```

---

### File Locations

**New Components**:
- `client/src/components/pods/KickUserDialog.jsx` (138 lines)
- `client/src/components/pods/PodMemberList.jsx` (200 lines)

**Modified Files**:
- `client/src/lib/api.js` - Added 3 functions
- `client/src/components/campus/CollabPodPage.jsx` - Updated with new UI
- `server/src/main/java/.../CollabPodController.java` - Added 3 endpoints

---

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Kick button not showing | User doesn't have higher hierarchy |
| Dialog won't close | Check onClose prop is passed |
| System messages as regular bubbles | Verify messageType === 'SYSTEM' |
| Cooldown error not showing minutes | Check backend response includes minutesRemaining |
| Members drawer not appearing | Verify showMembers state management |

---

### Testing Commands

```bash
# Test kick endpoint
curl -X POST http://localhost:8080/pods/{id}/kick \
  -H "Content-Type: application/json" \
  -d '{"actorId":"user1","targetId":"user2","reason":"Spam"}'

# Test leave endpoint
curl -X POST http://localhost:8080/pods/{id}/leave \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1"}'

# Test join endpoint
curl -X POST http://localhost:8080/pods/{id}/join-enhanced \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1"}'
```

---

### Performance Notes

- ✅ Members drawer: Absolute positioning (no layout shift)
- ✅ Context menu: Fixed positioning (efficient)
- ✅ Kick dialog: Modal overlay (lightweight)
- ✅ System messages: Simple pill render (fast)
- ✅ No N+1 queries: Single pod fetch on mount

---

### Accessibility Features

- ✅ Button titles for hover tooltips
- ✅ Semantic HTML structure
- ✅ Disabled button states
- ✅ Loading state feedback
- ✅ Error messages visible

---

**Stage 3 Status**: ✅ COMPLETE  
**Ready for**: QA Testing & Production Deployment  

For full documentation, see: `STAGE_3_FRONTEND_INTEGRATION_COMPLETE.md`

# Stage 1: MongoDB Schema Design - Architecture Diagram

## 🏗️ Complete Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     COLLABPODS COLLECTION                       │
│                    (Updated Schema - Role-Based)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pod Document {                                                 │
│    _id: ObjectId,                                               │
│    name: String,                                                │
│    description: String,                                         │
│                                                                 │
│    ✅ NEW ROLE-BASED SYSTEM:                                    │
│    ├── ownerId: "user123"           (Immutable Creator)        │
│    ├── adminIds: ["user456", ...]   (Moderators)              │
│    ├── memberIds: [user1, user2...] (Regular Members)         │
│    └── bannedIds: ["user789", ...]  (Permanently Removed)     │
│                                                                 │
│    type: TEAM | COLLAB | DISCUSSION | etc.                    │
│    status: ACTIVE | FULL | ARCHIVED | CLOSED                  │
│    scope: CAMPUS | GLOBAL                                      │
│    createdAt: ISODate,                                         │
│    lastActive: ISODate                                         │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                           │                    │
         │                           │                    │
         ▼                           ▼                    ▼
    [INDEX]               [INDEX]              [INDEX]
    ownerId               adminIds             bannedIds
```

```
┌─────────────────────────────────────────────────────────────────┐
│                  PODCOOLDOWNS COLLECTION (NEW)                  │
│                  (Prevents Leave/Rejoin Spam)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cooldown Document {                                            │
│    _id: ObjectId,                                               │
│    userId: "user123",              (User on Cooldown)          │
│    podId: "pod456",                (Pod Identifier)            │
│    action: "LEAVE" | "REJOIN" | "KICK",                       │
│    createdAt: ISODate("2026-01-31T10:00:00Z"),                │
│    expiryDate: ISODate("2026-01-31T10:15:00Z")  ⭐ TTL INDEX  │
│  }                                                              │
│                                                                 │
│  ⏱️  AUTO-DELETION: Expires 15 minutes after expiryDate        │
│  🔄 NO MANUAL CLEANUP: TTL index handles automatically         │
│  ⚡ MONGODB CHECKS: Every 60 seconds for expired records       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                           │                    │
         │                           │                    │
         ▼                           ▼                    ▼
    [TTL INDEX]      [UNIQUE INDEX]       [INDEX]
  expiryDate        userId+podId          userId
  Auto-Deletes                            podId
```

```
┌─────────────────────────────────────────────────────────────────┐
│                   MESSAGES COLLECTION (UPDATED)                 │
│              (Supports System Message Logging)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Message Document {                                             │
│    _id: ObjectId,                                               │
│                                                                 │
│    ✅ NEW MESSAGE TYPE ENUM:                                    │
│    messageType: "CHAT" | "SYSTEM",                             │
│                                                                 │
│    CHAT Message:                  SYSTEM Message:              │
│    ├── senderId: "user123"        ├── text: "User kicked"     │
│    ├── senderName: "John"         ├── text: "User banned"     │
│    ├── text: "Hello!"             ├── text: "User joined"     │
│    └── ...                        └── ...                      │
│                                                                 │
│    podId: "pod123",                                             │
│    conversationId: "pod123",                                    │
│    sentAt: ISODate,                                             │
│    read: Boolean                                                │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                           │
         │                           │
         ▼                           ▼
    [INDEX]               [COMPOUND INDEX]
    messageType          podId + messageType + sentAt
```

---

## 🔄 Data Flow Examples

### Example 1: User Joins Pod
```
Frontend Request
    ↓
CollabPodController.joinPod()
    ↓
Check: Is user in bannedIds? → If YES, throw exception
    ↓
Check: Is user on cooldown? → Query PodCooldowns
    ├─ If YES: Throw cooldown exception
    └─ If NO: Continue
    ↓
Add user to memberIds
    ↓
Create SYSTEM message: "User X joined the pod"
    ├── messageType = "SYSTEM"
    ├── text = "User John joined the pod"
    └── podId = "pod123"
    ↓
Response to Frontend
```

### Example 2: User Kicked from Pod
```
Admin Action
    ↓
CollabPodController.kickUser()
    ↓
Verify: Requester is admin or owner
    ↓
Remove user from memberIds & adminIds
    ↓
Add user to bannedIds (optional)
    ↓
Create SYSTEM message: "User X was kicked"
    ├── messageType = "SYSTEM"
    ├── text = "User Jane was kicked from the pod"
    └── podId = "pod123"
    ↓
Create Cooldown record:
    ├── userId: "jane123"
    ├── podId: "pod123"
    ├── action: "KICK"
    ├── createdAt: Now
    └── expiryDate: Now + 15 minutes
    ↓
MongoDB TTL Index Auto-Deletes Cooldown at expiryDate
    ↓
User can rejoin after 15 minutes
```

### Example 3: Promoting Member to Admin
```
Owner Action
    ↓
Update Pod: $addToSet { adminIds: "user456" }
    ↓
Create SYSTEM message: "User X was promoted to admin"
    ├── messageType = "SYSTEM"
    └── text = "User Alex was promoted to admin"
    ↓
Message visible in chat history
```

---

## 📊 Schema Comparison: Before vs After

### Before (Old Schema)
```
CollabPod {
  _id: ObjectId,
  creatorId: "user123",
  memberIds: ["user1", "user2", ...],
  moderatorIds: ["user456"],
  ❌ NO: Owner/Admin/Member/Banned separation
  ❌ NO: Ban system
  ❌ NO: Cooldown mechanism
}

Message {
  _id: ObjectId,
  messageType: "CAMPUS_POD" (String - not enum),
  ❌ NO: System message support
}
```

### After (New Schema)
```
CollabPod {
  _id: ObjectId,
  ownerId: "user123",          ✅ Immutable creator
  adminIds: ["user456"],        ✅ Explicit admins
  memberIds: ["user1", ...],    ✅ Regular members
  bannedIds: ["user789"],       ✅ Banned users
  ✅ Complete role-based system
}

PodCooldown {
  _id: ObjectId,
  userId: "user123",
  podId: "pod456",
  expiryDate: ISODate,
  ✅ Auto-delete with TTL index
  ✅ Prevents spam
}

Message {
  _id: ObjectId,
  messageType: CHAT | SYSTEM,   ✅ Enum-based
  ✅ System message logging
  ✅ Audit trail for actions
}
```

---

## 🎯 Key Features Enabled

### 1️⃣ Role-Based Access Control
```
Pod has Owner + Admins + Members + Banned Users

Owner Rights:
├── Manage admins
├── Manage members
├── Ban users
└── Delete pod

Admin Rights:
├── Manage members
├── Kick users
├── Create meetings
└── Post announcements

Member Rights:
├── Post messages
├── Join meetings
└── View content

Banned Users:
└── Cannot access pod
```

### 2️⃣ Anti-Spam Mechanism
```
User leaves pod
    ↓
Create PodCooldown
├── expiryDate = Now + 15 minutes
└── action = "LEAVE"
    ↓
TTL Index monitors
    ↓
After 15 minutes:
├── MongoDB auto-deletes cooldown
└── User can rejoin

Prevents rapid leave/rejoin cycles
No manual cleanup needed
```

### 3️⃣ Audit Trail
```
Chat History = Mix of:
├── CHAT messages (regular user messages)
└── SYSTEM messages (actions)
    ├── "User X was kicked"
    ├── "User Y was banned"
    ├── "User Z was promoted to admin"
    └── "User W left the pod"

Visible to all members
Preserves history of pod changes
```

---

## 📈 Performance Indexes

### CollabPods Indexes
```
{ ownerId: 1 }              → Find pods owned by user
{ adminIds: 1 }             → Find pods where user is admin
{ bannedIds: 1 }            → Find pods where user is banned
{ podId, ownerId, ... }     → Compound queries
```

### PodCooldowns Indexes
```
{ expiryDate: 1 }           → TTL deletion (AUTO-DELETE)
{ userId: 1, podId: 1 }     → Check if user on cooldown
{ userId: 1 }               → Find all cooldowns for user
{ podId: 1 }                → Find all cooldowns in pod
```

### Messages Indexes
```
{ messageType: 1 }          → Filter CHAT vs SYSTEM
{ podId, messageType, ... } → Get specific message types per pod
```

---

## 🚀 Deployment Timeline

```
Stage 1: Database & Schema Design (January 31, 2026) ✅
├── MongoDB schema updates ✅
├── Java POJO classes ✅
└── TTL index creation ✅

Stage 2: Service Logic (February 2026)
├── Update CollabPodService with role-based logic
├── Implement cooldown checks
└── System message creation

Stage 3: Controller Implementation (February 2026)
├── Add role validation in endpoints
├── Enforce cooldown constraints
└── Verify permissions

Stage 4: Testing & Integration (February 2026)
├── Unit tests for role system
├── Integration tests for cooldowns
└── E2E tests for user flows
```

---

## ✅ Deliverables Summary

| Component | Status | Location |
|-----------|--------|----------|
| CollabPod.java | ✅ Updated | `server/model/` |
| Message.java | ✅ Updated | `server/model/` |
| PodCooldown.java | ✅ Created | `server/model/` |
| PodCooldownRepository.java | ✅ Created | `server/repository/` |
| MongoDB Script | ✅ Created | `server/mongodb-schema-upgrade.js` |
| Full Documentation | ✅ Created | `SCHEMA_UPGRADE_STAGE_1_COMPLETE.md` |
| Quick Reference | ✅ Created | `SCHEMA_UPGRADE_QUICK_REFERENCE.md` |
| Ready-to-Run Commands | ✅ Created | `MONGODB_COMMANDS_READY_TO_EXECUTE.js` |

---

## 🎉 Ready for Deployment

All components are complete and ready to deploy. Execute MongoDB commands first, then deploy Java changes.

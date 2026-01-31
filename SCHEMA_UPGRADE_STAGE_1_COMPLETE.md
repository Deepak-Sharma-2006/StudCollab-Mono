# MongoDB Schema Upgrade - Stage 1 Complete

## Overview
This document details the complete schema upgrade for the CollabPods collection to support:
- Role-based access control (Owner, Admin, Member, Banned)
- User ban management
- Leave/Rejoin cooldown tracking
- System message logging

---

## 1. Updated CollabPods Collection

### Schema Changes

#### New Role-Based Fields (Required)
```json
{
  "_id": ObjectId("..."),
  
  // ✅ NEW: Role-Based System
  "ownerId": "user123",           // Immutable - pod creator
  "adminIds": ["user456", "user789"],  // Administrators with moderation rights
  "memberIds": ["user123", "user456", "user789", "user999"],  // Regular members
  "bannedIds": ["user111", "user222"],  // Permanently banned users
  
  // Existing fields (unchanged)
  "name": "Team Pod",
  "description": "...",
  "type": "TEAM",
  "status": "ACTIVE",
  "maxCapacity": 10,
  "createdAt": ISODate("2026-01-31T10:00:00Z"),
  ...
}
```

#### Deprecated Fields (Kept for Backward Compatibility)
- `creatorId` → Use `ownerId` instead
- `moderatorIds` → Use `adminIds` instead

### Java POJO Class
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "collabPods")
public class CollabPod {
    @Id
    private String id;
    private String name;
    private String description;
    
    // ✅ NEW: Role-based system
    private String ownerId;            // Immutable creator
    private List<String> adminIds;     // Administrators
    private List<String> memberIds;    // Regular members
    private List<String> bannedIds;    // Banned users
    
    // ... rest of fields
}
```

### Key Characteristics
- **ownerId**: Immutable once set, identifies the pod creator
- **adminIds**: Can be modified by owner, members with moderation rights
- **memberIds**: Regular members without special privileges
- **bannedIds**: Users who have been permanently removed from the pod
- **Pod Types Supported**: TEAM, COLLAB, DISCUSSION, ASK, HELP, PROJECT_TEAM, MENTORSHIP, COURSE_SPECIFIC, LOOKING_FOR

### Indexes Created
```javascript
db.collabPods.createIndex({ ownerId: 1 });
db.collabPods.createIndex({ adminIds: 1 });
db.collabPods.createIndex({ bannedIds: 1 });
db.collabPods.createIndex({ podId: 1, ownerId: 1, adminIds: 1, memberIds: 1 });
```

---

## 2. New PodCooldowns Collection

### Purpose
Prevents 'leave/rejoin' spam by enforcing a cooldown period (15 minutes) before a user can rejoin a pod they just left.

### Schema
```json
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "podId": "pod456",
  "action": "LEAVE",                    // LEAVE, REJOIN, KICK
  "createdAt": ISODate("2026-01-31T10:00:00Z"),
  "expiryDate": ISODate("2026-01-31T10:15:00Z")
}
```

### Java POJO Class
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "podCooldowns")
public class PodCooldown {
    @Id
    private String id;
    
    private String userId;                    // User on cooldown
    private String podId;                     // Pod identifier
    
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiryDate;         // Auto-delete at this time
    
    private String action;                    // Type of action
    private LocalDateTime createdAt;          // Cooldown creation time
}
```

### TTL Index (Critical)
```javascript
db.podCooldowns.createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 0 }
);
```

#### How TTL Works
- MongoDB automatically deletes documents when current time ≥ expiryDate
- The TTL index checks every 60 seconds (configurable)
- Documents are deleted within 60 seconds of expiration
- No manual cleanup needed

### Additional Indexes
```javascript
// Unique constraint: one cooldown per user per pod
db.podCooldowns.createIndex({ userId: 1, podId: 1 }, { unique: true });

// For finding all cooldowns for a user
db.podCooldowns.createIndex({ userId: 1 });

// For finding all cooldowns in a pod
db.podCooldowns.createIndex({ podId: 1 });
```

### Repository
```java
@Repository
public interface PodCooldownRepository extends MongoRepository<PodCooldown, String> {
    Optional<PodCooldown> findByUserIdAndPodId(String userId, String podId);
    List<PodCooldown> findByUserId(String userId);
    List<PodCooldown> findByPodId(String podId);
    boolean existsByUserIdAndPodId(String userId, String podId);
    void deleteByUserIdAndPodId(String userId, String podId);
}
```

---

## 3. Updated Messages Collection

### Schema Changes
```json
{
  "_id": ObjectId("..."),
  
  // ✅ NEW: Enum-based message type
  "messageType": "CHAT",    // Can be: "CHAT" or "SYSTEM"
  
  // Existing fields
  "conversationId": "pod123",
  "podId": "pod123",
  "senderId": "user456",
  "senderName": "John Doe",
  "text": "Hello everyone!",
  "sentAt": ISODate("2026-01-31T10:00:00Z"),
  "read": false,
  ...
}
```

### Message Types
```java
public enum MessageType {
    CHAT,    // Regular user messages (existing messages)
    SYSTEM   // System-generated messages (user kicked, user joined, etc.)
}
```

### Java POJO Class
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "messages")
public class Message {
    @Id
    private String id;
    
    // ✅ NEW: Enum-based type
    private MessageType messageType;      // CHAT or SYSTEM
    
    // Existing fields
    private String conversationId;
    private String podId;
    private String senderId;
    private String senderName;
    private String text;
    private Date sentAt;
    private boolean read;
    ...
}
```

### System Message Examples
```json
// User kicked from pod
{
  "messageType": "SYSTEM",
  "podId": "pod123",
  "text": "User John Doe was kicked from the pod",
  "sentAt": ISODate("2026-01-31T10:05:00Z")
}

// User banned from pod
{
  "messageType": "SYSTEM",
  "podId": "pod123",
  "text": "User Jane Smith was banned from the pod",
  "sentAt": ISODate("2026-01-31T10:06:00Z")
}

// User joined pod
{
  "messageType": "SYSTEM",
  "podId": "pod123",
  "text": "User Alex joined the pod",
  "sentAt": ISODate("2026-01-31T10:07:00Z")
}
```

### Indexes Created
```javascript
db.messages.createIndex({ messageType: 1 });
db.messages.createIndex({ podId: 1, messageType: 1, sentAt: -1 });
```

---

## 4. MongoDB Commands - Complete

### Execute in MongoDB CLI, Compass, or Atlas

#### Create TTL Index (Most Important)
```javascript
// This enables auto-deletion of cooldown records after 15 minutes
db.podCooldowns.createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 0 }
);
```

#### Full Migration Script
Run the complete script: `mongodb-schema-upgrade.js`

```javascript
// Update existing CollabPods
db.collabPods.updateMany({}, [
    {
        $set: {
            ownerId: "$creatorId",
            adminIds: { $cond: [{ $eq: ["$moderatorIds", null] }, [], "$moderatorIds"] },
            bannedIds: []
        }
    }
]);

// Create all indexes
db.collabPods.createIndex({ ownerId: 1 });
db.collabPods.createIndex({ adminIds: 1 });
db.collabPods.createIndex({ bannedIds: 1 });

db.podCooldowns.createIndex({ expiryDate: 1 }, { expireAfterSeconds: 0 });
db.podCooldowns.createIndex({ userId: 1, podId: 1 }, { unique: true });
db.podCooldowns.createIndex({ userId: 1 });
db.podCooldowns.createIndex({ podId: 1 });

db.messages.updateMany({}, [
    { $set: { messageType: "CHAT" } }
]);
db.messages.createIndex({ messageType: 1 });
db.messages.createIndex({ podId: 1, messageType: 1, sentAt: -1 });
```

---

## 5. Common Queries

### CollabPods

#### Find pods owned by a user
```javascript
db.collabPods.find({ ownerId: "user123" });
```

#### Find pods where user is admin
```javascript
db.collabPods.find({ adminIds: "user123" });
```

#### Find pods where user is banned
```javascript
db.collabPods.find({ bannedIds: "user123" });
```

#### Remove user from pod and ban them
```javascript
db.collabPods.updateOne(
    { _id: ObjectId("pod123") },
    {
        $pull: { memberIds: "user123", adminIds: "user123" },
        $addToSet: { bannedIds: "user123" }
    }
);
```

#### Promote member to admin
```javascript
db.collabPods.updateOne(
    { _id: ObjectId("pod123") },
    { $addToSet: { adminIds: "user456" } }
);
```

### PodCooldowns

#### Check if user is on cooldown
```javascript
db.podCooldowns.findOne({ userId: "user123", podId: "pod456" });
```

#### Find all active cooldowns for a user
```javascript
db.podCooldowns.find({ userId: "user123" });
```

#### Manual cleanup (normally automatic via TTL)
```javascript
db.podCooldowns.deleteOne({ userId: "user123", podId: "pod456" });
```

### Messages

#### Find all chat messages in a pod
```javascript
db.messages.find({ podId: "pod123", messageType: "CHAT" });
```

#### Find all system messages (actions) in a pod
```javascript
db.messages.find({ podId: "pod123", messageType: "SYSTEM" });
```

#### Create a system message
```javascript
db.messages.insertOne({
    messageType: "SYSTEM",
    podId: "pod123",
    text: "User John Doe was kicked from the pod",
    sentAt: new Date(),
    read: false
});
```

---

## 6. Migration Checklist

- [ ] Back up MongoDB database
- [ ] Run migration script: `mongodb-schema-upgrade.js`
- [ ] Verify CollabPods documents have new fields
- [ ] Verify PodCooldowns collection exists with TTL index
- [ ] Verify Messages collection has messageType enum
- [ ] Deploy updated Java POJO classes:
  - [ ] CollabPod.java
  - [ ] PodCooldown.java
  - [ ] Message.java
- [ ] Deploy PodCooldownRepository
- [ ] Update services to use new role-based fields
- [ ] Test pod member management (add, remove, ban)
- [ ] Test cooldown functionality
- [ ] Test system message logging

---

## 7. Files Updated

### Java Source Files
- `src/main/java/com/studencollabfin/server/model/CollabPod.java` ✅ Updated
- `src/main/java/com/studencollabfin/server/model/Message.java` ✅ Updated
- `src/main/java/com/studencollabfin/server/model/PodCooldown.java` ✅ Created
- `src/main/java/com/studencollabfin/server/repository/PodCooldownRepository.java` ✅ Created

### MongoDB Scripts
- `mongodb-schema-upgrade.js` ✅ Created

---

## 8. Key Takeaways

1. **Role-Based System**: Replace creatorId/moderatorIds with ownerId/adminIds/memberIds/bannedIds
2. **TTL Index**: Auto-deletion works automatically - no manual cleanup needed
3. **System Messages**: Use MessageType.SYSTEM to log pod actions in chat history
4. **Backward Compatibility**: Old fields (creatorId, moderatorIds) still available
5. **Indexes**: All necessary indexes created for performance
6. **No Breaking Changes**: Existing functionality preserved while adding new features

---

## Next Steps

After Stage 1 is complete:
- Stage 2: Role-based access control in services
- Stage 3: Cooldown enforcement in controller endpoints
- Stage 4: System message generation for pod actions

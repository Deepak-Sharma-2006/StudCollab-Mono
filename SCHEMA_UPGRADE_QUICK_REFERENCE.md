# Schema Upgrade Stage 1 - Quick Reference

## 🎯 What Changed

### CollabPods Schema
```
OLD: creatorId, moderatorIds, memberIds
NEW: ownerId (immutable) + adminIds + memberIds + bannedIds
```

### New Collection: PodCooldowns
```
Prevents leave/rejoin spam with 15-minute auto-expiry (TTL index)
userId | podId | expiryDate | action
```

### Messages Collection
```
OLD: messageType = "CAMPUS_POD" or "GLOBAL_ROOM" (string)
NEW: messageType = CHAT | SYSTEM (enum)
```

---

## 🚀 Deployment Checklist

### 1. MongoDB Setup (Run First)
```javascript
// Execute in MongoDB console
// File: mongodb-schema-upgrade.js
```

### 2. Java Classes Deployed
- ✅ `CollabPod.java` - Updated with role-based fields
- ✅ `Message.java` - Updated with MessageType enum
- ✅ `PodCooldown.java` - New model
- ✅ `PodCooldownRepository.java` - New repository

### 3. Gradle Build
```bash
mvn clean compile
```

### 4. Testing
- [ ] CollabPods created with ownerId/adminIds/memberIds/bannedIds
- [ ] PodCooldowns records expire after 15 minutes
- [ ] System messages logged with messageType = SYSTEM

---

## 💾 TTL Index (Auto-Delete)

**Most Important Command:**
```javascript
db.podCooldowns.createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 0 }
);
```

MongoDB will automatically delete records 15 minutes after `expiryDate`.

---

## 📝 Common Code Patterns

### Check if user can rejoin pod
```java
// In PodCooldownRepository
Optional<PodCooldown> cooldown = podCooldownRepository.findByUserIdAndPodId(userId, podId);
if (cooldown.isPresent()) {
    throw new CooldownException("User is on cooldown until: " + cooldown.get().getExpiryDate());
}
```

### Log system message (user kicked)
```java
Message systemMessage = new Message();
systemMessage.setMessageType(Message.MessageType.SYSTEM);
systemMessage.setPodId(podId);
systemMessage.setText("User " + userName + " was kicked from the pod");
systemMessage.setSentAt(new Date());
messageRepository.save(systemMessage);
```

### Ban user from pod
```java
db.collabPods.updateOne(
    { _id: ObjectId("podId") },
    {
        $pull: { memberIds: "userId", adminIds: "userId" },
        $addToSet: { bannedIds: "userId" }
    }
);
```

### Promote member to admin
```java
db.collabPods.updateOne(
    { _id: ObjectId("podId") },
    { $addToSet: { adminIds: "userId" } }
);
```

---

## 🔄 Backward Compatibility

Old fields still present for safety:
- `creatorId` → Use `ownerId` instead
- `moderatorIds` → Use `adminIds` instead
- `messageTypeString` → Use `messageType` enum instead

---

## 📊 Index Summary

### CollabPods
```javascript
{ ownerId: 1 }
{ adminIds: 1 }
{ bannedIds: 1 }
{ podId: 1, ownerId: 1, adminIds: 1, memberIds: 1 }
```

### PodCooldowns
```javascript
{ expiryDate: 1 } // TTL Index - AUTO DELETES
{ userId: 1, podId: 1 } // UNIQUE
{ userId: 1 }
{ podId: 1 }
```

### Messages
```javascript
{ messageType: 1 }
{ podId: 1, messageType: 1, sentAt: -1 }
```

---

## ⚠️ Important Notes

1. **TTL Index**: Checks every 60 seconds - deletion may be delayed by up to 60 seconds
2. **ownerId**: Immutable once set - should not be changed
3. **Backward Compatibility**: Old code will still work - migration is gradual
4. **Unique Constraint**: Only one active cooldown per user per pod

---

## 📚 Related Documents

- [Full Schema Upgrade Guide](SCHEMA_UPGRADE_STAGE_1_COMPLETE.md)
- [MongoDB Commands](mongodb-schema-upgrade.js)
- Stage 1 Complete ✅

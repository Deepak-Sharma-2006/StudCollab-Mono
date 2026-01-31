# XP System Complete Debugging Guide

## Overview

The XP system has been enhanced with comprehensive logging across both backend and frontend. This guide will help you diagnose and fix any issues.

---

## Step 1: Start the Backend with Logging

```bash
cd server
mvn clean compile
mvn spring-boot:run
```

### What to Look For in Backend Logs:

**When the server starts, you should see:**

```
🎯 [GamificationService] Attempting to award XP - userId: ...
📊 [GamificationService] User found: ...
💰 [GamificationService] Points to award: ...
✅ [GamificationService] User saved - New Level: ...
📡 [GamificationService] Broadcasting to /user/...
✔️  [GamificationService] Broadcast sent!
```

---

## Step 2: Start the Frontend

```bash
cd client
npm run dev
```

### What to Look For in Browser Console:

**When ProfilePage loads, you should see:**

```
🔌 [useXpWs] Connecting to WebSocket for userId: <YOUR_USER_ID>
🚀 [useXpWs] Activating STOMP client...
✅ [useXpWs] WebSocket connected! Subscribing to topics...
✅ [useXpWs] Subscribed to /user/<YOUR_USER_ID>/topic/xp-updates
✅ [useXpWs] Subscribed to /topic/level-ups
```

**When XPProgressBar updates:**

```
🎨 [XPProgressBar] Component rendered/updated with user:
   - Level: X
   - XP: Y
   - Total XP: Z
   - Multiplier: 1.0
```

---

## Step 3: Trigger an XP Event

### Create a Post (15 XP)

1. Navigate to the Social Feed or Team Finding section
2. Create a new post
3. **Check Backend Logs** for:

   ```
   🎯 [GamificationService] Attempting to award XP - userId: ...
   📊 [GamificationService] User found: Taksh bansod, Old Level: 0, Old XP: 0
   💰 [GamificationService] Points to award: 15 (base: 15 * multiplier: 1.0)
   ✅ [GamificationService] User saved - New Level: 0, New XP: 15, Total XP: 15
   📡 [GamificationService] Broadcasting to /user/.../topic/xp-updates
   ✔️  [GamificationService] Broadcast sent!
   ```

4. **Check Browser Console** for:

   ```
   📨 [useXpWs] Received XP update message: {"level":0,"xp":15,"totalXp":15,...}
   📊 [useXpWs] Parsed user data: {...}
   ✔️  [useXpWs] onXpUpdate callback executed
   🎨 [XPProgressBar] Component rendered/updated with user: {...}
   ```

5. **Check UI** for:
   - Progress bar should animate from 0% to 15%
   - XP Counter should show "15/100"
   - Total XP should show "15"

---

## Step 4: Troubleshooting Matrix

### Issue: Backend Logs Don't Show "🎯 [GamificationService]"

**Possible Causes:**

1. PostController isn't calling `gamificationService.awardXp()`
2. GamificationService bean isn't injected properly
3. userId is null when POST request is made

**Fix:**

```java
// In PostController.createSocialPost()
System.out.println("[DEBUG] Before awardXp - userId: " + userId);
gamificationService.awardXp(userId, XPAction.CREATE_POST);
System.out.println("[DEBUG] After awardXp - successfully called");
```

---

### Issue: Backend Logs Show "⚠️ [GamificationService] User not found"

**Possible Causes:**

1. userId is incorrect or doesn't exist in MongoDB
2. User was deleted or ID mismatch

**Fix:**

```bash
# Check if user exists in MongoDB
mongo
use studencollabfin
db.users.find({ _id: "<YOUR_USER_ID>" })
```

---

### Issue: Frontend Console Shows "❌ [useXpWs] STOMP error"

**Possible Causes:**

1. Backend WebSocket endpoint not running
2. CORS issue with WebSocket
3. Wrong WebSocket URL (should be `http://localhost:8080/ws-studcollab`)

**Fix:**

```bash
# Verify backend is running on port 8080
lsof -i :8080

# Check WebSocket endpoint
curl http://localhost:8080/ws-studcollab
```

---

### Issue: Browser Console Shows "📨 Received message" but XPProgressBar doesn't update

**Possible Causes:**

1. `onXpUpdate` callback not being called
2. State not being set in ProfilePage
3. User object fields mismatched

**Fix:**

1. Add logging to `onXpUpdate` callback in ProfilePage:

```jsx
onXpUpdate: (updatedUser) => {
  console.log("🎯 [ProfilePage] onXpUpdate called with:", updatedUser);
  console.log("🎯 [ProfilePage] Setting profileOwner state...");
  setProfileOwner((prev) => ({
    ...prev,
    level: updatedUser.level,
    xp: updatedUser.xp,
    totalXp: updatedUser.totalXp,
    xpMultiplier: updatedUser.xpMultiplier,
  }));
  console.log("🎯 [ProfilePage] State updated!");
};
```

2. Verify MongoDB field names match:

```bash
mongo
use studencollabfin
db.users.findOne({ _id: "<YOUR_USER_ID>" })
# Look for: { level: Number, xp: Number, totalXp: Number, xpMultiplier: Number }
```

---

## Step 5: Complete Test Flow

### 1. Backend Ready Check

```bash
# Terminal 1
cd server
mvn spring-boot:run

# Look for:
# "Tomcat started on port 8080"
# "WebSocket support enabled"
```

### 2. Frontend Ready Check

```bash
# Terminal 2
cd client
npm run dev

# Look for:
# "Local: http://localhost:5173"
```

### 3. Login to Application

```
Go to http://localhost:5173
Login with your test account
Wait for ProfilePage to load
```

### 4. Monitor Logs

```bash
# Terminal 3 - Watch Backend Logs
cd server
tail -f *.log | grep -E "\[GamificationService\]|\[GameService\]|awardXp"

# Terminal 4 - Watch Browser Console
# Open DevTools (F12) → Console tab
# Filter for: [useXpWs], [XPProgressBar], [ProfilePage]
```

### 5. Trigger XP Event

```
1. Create a post
2. Watch backend logs for "🎯 [GamificationService]"
3. Watch browser console for "📨 [useXpWs] Received XP update"
4. Watch XPProgressBar animate and update
```

---

## Step 6: Network Tab Debugging

### Monitor WebSocket Messages

1. Open DevTools → Network tab
2. Filter by "ws" (WebSocket)
3. Look for `/ws-studcollab` connection
4. Click on the connection → Messages tab
5. When you perform an action, you should see a message:

**Incoming (from Server):**

```json
{
  "level": 0,
  "xp": 15,
  "totalXp": 15,
  "xpMultiplier": 1.0,
  "fullName": "Taksh bansod",
  ...
}
```

---

## Step 7: MongoDB Verification

```bash
# Connect to MongoDB
mongo

# Select database
use studencollabfin

# Find your user and check XP fields
db.users.findOne({ email: "your.email@example.com" })

# You should see:
{
  _id: ObjectId("..."),
  fullName: "Taksh bansod",
  level: 0,
  xp: 15,
  totalXp: 15,
  xpMultiplier: 1.0,
  ...
}

# Check if XP is accumulating
# Create another post, then run the query again
# xp and totalXp should increase
```

---

## Common Scenarios

### Scenario 1: User Creates Post

```
Frontend: POST /api/posts/social
  ↓
PostController.createSocialPost()
  ↓
gamificationService.awardXp(userId, CREATE_POST)  // 15 XP
  ↓
GamificationService.awardXp()
  - Find user in MongoDB
  - Add 15 XP to user.xp
  - Add 15 to user.totalXp
  - Save user
  - Convert user to JSON
  - Send via: messagingTemplate.convertAndSendToUser(userId, "/topic/xp-updates", user)
  ↓
WebSocket: /user/{userId}/topic/xp-updates message sent
  ↓
Frontend: useXpWs hook receives message
  - Parse JSON
  - Call onXpUpdate(updatedUser)
  ↓
ProfilePage: onXpUpdate callback
  - Update profileOwner state with new level/xp/totalXp
  ↓
XPProgressBar: Re-renders with new user data
  - Progress = xp / 100 * 100 = 15%
  - Display "15/100"
  - Total "15"
```

---

## Action Point Values

| Action              | XP  | Trigger                         |
| ------------------- | --- | ------------------------------- |
| CREATE_POST         | 15  | Post creation                   |
| JOIN_POD            | 30  | Joining a ColabPod              |
| RECEIVE_ENDORSEMENT | 20  | Being endorsed by another user  |
| CREATE_EVENT        | 150 | Creating an event               |
| MENTOR_BONUS        | 50  | (Future) Mentoring another user |
| PROJECT_COMPLETE    | 100 | (Future) Completing a project   |

---

## Quick Command Reference

```bash
# Start backend with clean compile
cd server && mvn clean compile && mvn spring-boot:run

# Start frontend
cd client && npm run dev

# Check if port 8080 is in use
lsof -i :8080

# Kill process on port 8080 (if needed)
kill -9 $(lsof -ti:8080)

# Monitor MongoDB changes
mongo
watch: db.users.findOne({ _id: "your-id" })

# View recent application logs
tail -f server/target/spring.log
```

---

## Success Criteria

✅ Backend starts without errors  
✅ Frontend connects to WebSocket  
✅ "🎯 [GamificationService]" appears in logs when action triggered  
✅ "📨 [useXpWs] Received XP update" appears in console  
✅ XP Counter shows non-zero value  
✅ Progress bar animates  
✅ Level increases when XP reaches 100  
✅ MongoDB user document shows updated xp/totalXp

---

## Emergency Debug Mode

If everything fails, add extreme logging:

**GamificationService.java:**

```java
@Override
public void awardXp(String userId, XPAction action) {
    System.out.println("\n========== EXTREME DEBUG START ==========");
    System.out.println("userId type: " + (userId != null ? userId.getClass().getName() : "NULL"));
    System.out.println("userId value: '" + userId + "'");
    System.out.println("userId length: " + (userId != null ? userId.length() : "NULL"));
    System.out.println("action: " + action);
    System.out.println("action.getPoints(): " + action.getPoints());

    boolean userExists = userRepository.existsById(userId);
    System.out.println("User exists in DB: " + userExists);

    if (userExists) {
        User user = userRepository.findById(userId).orElse(null);
        System.out.println("User object: " + (user != null ? user.getFullName() : "NULL"));
    }
    System.out.println("========== EXTREME DEBUG END ==========\n");

    // ... rest of method
}
```

---

## Need More Help?

Check these files for integration points:

- [PostController.java](server/src/main/java/com/studencollabfin/server/controller/PostController.java#L167)
- [GamificationService.java](server/src/main/java/com/studencollabfin/server/service/GamificationService.java#L23)
- [useXpWs.js](client/src/hooks/useXpWs.js)
- [XPProgressBar.jsx](client/src/components/ui/XPProgressBar.jsx)
- [ProfilePage.jsx](client/src/components/ProfilePage.jsx#L73)

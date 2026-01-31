# XP Gamification System - Quick Start Guide

## 🚀 Start Here

### 1. Backend Setup (5 minutes)

```bash
# Terminal 1: Start the backend
cd server
mvn spring-boot:run

# You should see in logs:
# - GamificationService initialized
# - WebSocket endpoints registered
# - MongoDB connection successful
```

### 2. Frontend Setup (2 minutes)

```bash
# Terminal 2: Start the frontend
cd client
npm run dev

# You should see:
# - Vite dev server running on http://localhost:5173
# - No console errors
```

### 3. Test XP System (3 minutes)

1. **Open Profile**
   - Navigate to your profile page
   - Look for XPProgressBar at top with Level 0

2. **Create a Post**
   - Click "Create Post" button
   - Fill in title and content
   - Submit
   - ✅ XP bar should animate to +15 XP

3. **Join a Pod**
   - Find a pod in campus
   - Click "Join"
   - ✅ XP bar should show +30 XP total

4. **Get Endorsed**
   - Have another user endorse your skill
   - ✅ XP bar should show +20 XP

5. **Watch for Level Up**
   - Continue earning XP
   - At 100 XP → Level 1
   - Check backend logs for "Level-up" notification

---

## 📁 File Guide

### Backend Files to Review

**Core XP Logic**

```
server/src/main/java/com/studencollabfin/server/
├── model/
│   ├── XPAction.java          ← ALL XP POINT VALUES (30, 15, 10, 20, 150, 50, 200)
│   └── User.java              ← level, xp, totalXp, xpMultiplier fields
├── service/
│   └── GamificationService.java ← Core XP awarding logic
└── config/
    └── WebSocketConfig.java    ← Real-time message broker
```

**Controllers Awarding XP** (add GamificationService to any new controller)

```
UserController.java      → endorseUser() [RECEIVE_ENDORSEMENT]
PostController.java      → createSocialPost() [CREATE_POST]
                        → createTeamFindingPost() [CREATE_POST]
CollabPodController.java → joinPod() [JOIN_POD]
EventController.java     → createEvent() [CREATE_EVENT]
```

### Frontend Files to Review

**XP Components**

```
client/src/
├── components/
│   ├── ui/
│   │   └── XPProgressBar.jsx    ← Beautiful progress bar with animations
│   └── ProfilePage.jsx          ← Integrated XP listener
└── hooks/
    └── useXpWs.js              ← WebSocket connection hook
```

---

## 🔧 Common Tasks

### Add XP Award to New Action

1. **Add to XPAction enum** (if action doesn't exist)

```java
// server/src/main/java/com/studencollabfin/server/model/XPAction.java
public enum XPAction {
    // ... existing
    YOUR_NEW_ACTION(50),  // 50 points for your action
    // ...
}
```

2. **Award in Controller**

```java
// In your controller method
import com.studencollabfin.server.model.XPAction;

@Autowired
private GamificationService gamificationService;

public void someMethod(String userId) {
    // ... do something

    // Award XP
    gamificationService.awardXp(userId, XPAction.YOUR_NEW_ACTION);

    // ... continue
}
```

### Change XP Point Values

**Only one place to edit:**

```java
// server/src/main/java/com/studencollabfin/server/model/XPAction.java
public enum XPAction {
    JOIN_POD(30),              // Change 30 to whatever
    CREATE_POST(15),           // Change 15 to whatever
    // ... etc
}
```

### Change Level Progression

**Current**: 100 XP = 1 Level

**To change to 50 XP per level:**

```java
// server/src/main/java/com/studencollabfin/server/service/GamificationService.java

// Find this line:
while (user.getXp() >= 100) {

// Change to:
while (user.getXp() >= 50) {  // Now 50 XP per level
```

### Add Level-Up Notification

**Currently broadcasts to `/topic/level-ups`**

To show a toast in UI:

```javascript
// client/src/hooks/useXpWs.js - already subscribes to level-ups
// Add callback to ProfilePage:

client.subscribe(`/topic/level-ups`, (msg) => {
  const notification = msg.body;
  // Show toast with: notification
});
```

---

## 🧪 Testing Checklist

### ✅ Pre-Deployment Verification

- [ ] Backend starts without errors
- [ ] Frontend loads without console errors
- [ ] Can see Level 0 on profile
- [ ] Create post → XP increases by 15
- [ ] Join pod → XP increases by 30
- [ ] Get endorsed → XP increases by 20
- [ ] XP bar animates smoothly
- [ ] At 100 XP → Level becomes 1, XP resets to 0
- [ ] Page refresh doesn't lose XP state
- [ ] Open DevTools WebSocket tab → See `/topic/xp-updates` messages

### 🔍 Debugging

**Backend Debug Logs**

```bash
# Add to GamificationService.java for logging:
System.out.println("🎯 Awarding " + points + " XP to " + userId);
System.out.println("📊 Level: " + user.getLevel() + ", XP: " + user.getXp());
```

**Frontend Debug Logs**

```javascript
// Already in useXpWs.js:
console.log("📊 XP Update received:", updatedUser);
```

**Monitor WebSocket**

1. Open Chrome DevTools → Network
2. Filter by "ws"
3. Click `/ws-studcollab`
4. Switch to Messages tab
5. Perform action
6. Should see incoming messages with XP data

**Check Database**

```bash
# In MongoDB Compass or MongoDB Atlas:
db.users.findOne({ _id: ObjectId("your_user_id") });

# Should see:
# "level": 0,
# "xp": 0,
# "totalXp": 0,
# "xpMultiplier": 1.0
```

---

## 🎯 Key Endpoints Reference

### Create XP-Earning Actions

**Create Post** (Social)

```
POST /api/posts/social
Body: { title, content, ... }
Award: 15 XP
```

**Create Post** (Team Finding)

```
POST /api/posts/team-finding
Body: { title, requiredSkills, ... }
Award: 15 XP
```

**Join Pod**

```
POST /pods/{id}/join
Body: { userId }
Award: 30 XP
```

**Endorse User**

```
POST /api/users/{userId}/endorse
Award: 20 XP to endorsed user
```

**Create Event**

```
POST /api/events
Body: { title, date, time, ... }
Award: 150 XP
```

---

## 📊 XP Point System Overview

| Action              | XP  | Rarity  | Time to Level   |
| ------------------- | --- | ------- | --------------- |
| JOIN_POD            | 30  | Common  | 3.3 joins       |
| CREATE_POST         | 15  | Common  | 6.7 posts       |
| GIVE_ENDORSEMENT    | 10  | Common  | 10 endorsements |
| RECEIVE_ENDORSEMENT | 20  | Common  | 5 endorsements  |
| CREATE_EVENT        | 150 | Rare    | 0.67 events     |
| MENTOR_BONUS        | 50  | Special | 2 mentorships   |
| PROJECT_COMPLETE    | 200 | Epic    | 0.5 completions |

**Level Progression**: 100 XP per level = ~6 posts OR ~3 pod joins OR 1 event

---

## 🚨 Troubleshooting

| Problem                  | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| WebSocket won't connect  | Restart backend on port 8080                          |
| XP not updating          | Check userId passed to hook matches backend           |
| Level not progressing    | Ensure awardXp was called in controller               |
| Multiplier always 1.0    | Check setXpMultiplier() method in GamificationService |
| No level-up notification | Check /topic/level-ups subscription in useXpWs        |

---

## 🎓 Learning Resources

**To understand the flow:**

1. Read `XP_GAMIFICATION_FINAL_SUMMARY.md` (architecture diagram)
2. Open `GamificationService.java` (core logic)
3. Open `useXpWs.js` (frontend connection)
4. Trace through a POST endpoint (e.g., UserController.endorseUser())

**To customize:**

1. Change point values in `XPAction.java`
2. Change level threshold in `GamificationService.java` (100 XP)
3. Change UI in `XPProgressBar.jsx` (colors, animations)
4. Change WebSocket topics in `useXpWs.js`

---

## ✨ You're All Set!

The XP system is ready to use. Start with creating a post and watch the magic happen.

**Need help?** Check the other documentation files:

- `XP_GAMIFICATION_INTEGRATION_COMPLETE.md` - Detailed integration guide
- `XP_GAMIFICATION_VERIFICATION_CHECKLIST.md` - Full testing checklist
- `XP_GAMIFICATION_FINAL_SUMMARY.md` - Architecture & features

**Happy Gamifying!** 🎮⭐

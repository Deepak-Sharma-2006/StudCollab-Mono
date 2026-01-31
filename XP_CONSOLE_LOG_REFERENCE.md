# XP System Testing - Console Log Reference

## What You Should See (In Order)

### 1️⃣ Backend Startup

When you start the backend with `mvn spring-boot:run`, look for:

```
[main] ... Tomcat started on port 8080 (http)
[main] ... Started Application in X.XXX seconds (JVM running for Y.YYY)
```

---

### 2️⃣ Frontend Loads Profile Page

When ProfilePage loads, check **Browser DevTools Console**:

```
🔌 [useXpWs] Connecting to WebSocket for userId: <YOUR_USER_ID>
🚀 [useXpWs] Activating STOMP client...
✅ [useXpWs] WebSocket connected! Subscribing to topics...
✅ [useXpWs] Subscribed to /user/<YOUR_USER_ID>/topic/xp-updates
✅ [useXpWs] Subscribed to /topic/level-ups

🎨 [XPProgressBar] Component rendered/updated with user:
   - Level: 0
   - XP: 0
   - Total XP: 0
   - Multiplier: 1.0
```

✅ **If you see this, WebSocket is working!**

---

### 3️⃣ Create a Post (Trigger XP Award)

#### Expected Backend Logs:

In Terminal running `mvn spring-boot:run`, look for:

```
Incoming SocialPost: <YOUR_POST_TITLE>
Type: ASK_HELP
Content: <YOUR_CONTENT>
Author ID: <USER_ID>
Post created successfully with ID: <POST_ID>

🎯 [GamificationService] Attempting to award XP - userId: <USER_ID>, action: CREATE_POST (15 points)
📊 [GamificationService] User found: Taksh bansod, Old Level: 0, Old XP: 0
💰 [GamificationService] Points to award: 15 (base: 15 * multiplier: 1.0)
✅ [GamificationService] User saved - New Level: 0, New XP: 15, Total XP: 15
📡 [GamificationService] Broadcasting to /user/<USER_ID>/topic/xp-updates
✔️  [GamificationService] Broadcast sent!
```

✅ **If you see this, XP award is working!**

#### Expected Frontend Logs:

In Browser DevTools Console:

```
📨 [useXpWs] Received XP update message:
{"level":0,"xp":15,"totalXp":15,"xpMultiplier":1.0,"fullName":"Taksh bansod",...}

📊 [useXpWs] Parsed user data: {level: 0, xp: 15, totalXp: 15, xpMultiplier: 1.0, ...}
✔️  [useXpWs] onXpUpdate callback executed

🎯 [ProfilePage] onXpUpdate called with: {level: 0, xp: 15, totalXp: 15, ...}
🎯 [ProfilePage] Setting profileOwner state...
🎯 [ProfilePage] State updated!

🎨 [XPProgressBar] Component rendered/updated with user:
   - Level: 0
   - XP: 15
   - Total XP: 15
   - Multiplier: 1.0
```

✅ **If you see this, entire system is working!**

#### Expected UI Changes:

- Progress bar animates from 0% to 15%
- XP Counter changes from "0/100" to "15/100"
- Total XP changes from "0" to "15"

---

### 4️⃣ More Actions

#### Join a Pod (30 XP):

```
🎯 [GamificationService] Attempting to award XP - userId: ..., action: JOIN_POD (30 points)
💰 [GamificationService] Points to award: 30 (base: 30 * multiplier: 1.0)
✅ [GamificationService] User saved - New Level: 0, New XP: 45, Total XP: 45
```

#### Get Endorsed (20 XP):

```
🎯 [GamificationService] Attempting to award XP - userId: ..., action: RECEIVE_ENDORSEMENT (20 points)
💰 [GamificationService] Points to award: 20 (base: 20 * multiplier: 1.0)
✅ [GamificationService] User saved - New Level: 0, New XP: 65, Total XP: 65
```

#### Create Event (150 XP):

```
🎯 [GamificationService] Attempting to award XP - userId: ..., action: CREATE_EVENT (150 points)
💰 [GamificationService] Points to award: 150 (base: 150 * multiplier: 1.0)
✅ [GamificationService] User saved - New Level: 1, New XP: 15, Total XP: 215
⬆️  [GamificationService] LEVEL UP! New level: 1
🎉 [GamificationService] Broadcasting level-up: Taksh bansod reached Level 1!
```

---

## Troubleshooting Matrix

### Problem: No Backend Logs Appear

**Logs to check:**

```
🎯 [GamificationService] Attempting to award XP
```

**Possible cause:** Action isn't triggering `gamificationService.awardXp()` call

**Fix:** Check controller method was called:

```
Author ID: <USER_ID>
Post created successfully
```

---

### Problem: Backend Logs Show But Frontend Logs Don't

**Backend shows:**

```
✔️  [GamificationService] Broadcast sent!
```

**Frontend shows nothing new**

**Possible cause:** WebSocket message not reaching client

**Fix:** Check Network tab:

1. DevTools → Network tab
2. Filter by "ws"
3. Look for `/ws-studcollab` connection
4. Click → Messages tab
5. Create post, look for message from server

---

### Problem: Frontend Logs Show But UI Doesn't Update

**Console shows:**

```
📨 [useXpWs] Received XP update message
✔️  [useXpWs] onXpUpdate callback executed
```

**But XPProgressBar still shows 0/100**

**Possible cause:** State not being set in ProfilePage

**Fix:** Check ProfilePage logs:

```
🎯 [ProfilePage] onXpUpdate called with
🎯 [ProfilePage] Setting profileOwner state...
🎯 [ProfilePage] State updated!
```

If missing, check ProfilePage.jsx onXpUpdate callback

---

### Problem: User Not Found Error

**Backend shows:**

```
⚠️  [GamificationService] User not found! userId: 123abc
```

**Possible cause:** userId is incorrect or doesn't exist in MongoDB

**Fix:**

1. Check MongoDB has the user:

```bash
mongo
use studencollabfin
db.users.find({ _id: "123abc" })
```

2. Verify userId being passed is correct:

```
Author ID: 123abc
```

---

## Quick Copy-Paste Commands

### Start Everything

```bash
# Terminal 1: Backend
cd server
mvn clean compile
mvn spring-boot:run

# Terminal 2: Frontend
cd client
npm run dev

# Terminal 3: Monitor Backend Logs
cd server
tail -f *.log | grep -E "\[Gamification\]"
```

### Monitor WebSocket

```bash
# Open DevTools (F12) while on http://localhost:5173
# Go to: Network tab → Filter "ws" → Click /ws-studcollab → Messages tab
```

### Check MongoDB

```bash
mongo
use studencollabfin
db.users.findOne({ email: "your.email@example.com" })
# Look for: { level: X, xp: Y, totalXp: Z, xpMultiplier: 1.0 }
```

---

## Success Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects with "✅ [useXpWs] WebSocket connected!"
- [ ] XPProgressBar renders with "L0 0/100"
- [ ] Create post triggers "🎯 [GamificationService]" backend log
- [ ] Frontend receives "📨 [useXpWs] Received XP update message"
- [ ] Progress bar animates to 15%
- [ ] XP Counter shows "15/100"
- [ ] Total XP shows "15"
- [ ] Refresh page - values persist (checks MongoDB)
- [ ] Create another post - XP increases to 30/100
- [ ] Create event (150 XP) - Level increases to 1

✅ All checks pass = System is working!

# XP System - Visual Overview

## The Complete System at a Glance

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      STUDCOLLAB XP GAMIFICATION SYSTEM                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│      USER INTERFACE (React)         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  SYNERGY STATUS            │   │
│  │  ═══════════════           │   │
│  │  [L0]   0/100     1.0x XP  │   │
│  │  ╔════════════════════════╗│   │
│  │  ║███░░░░░░░░░░░░░░░░░░░░║│ ← Progress bar
│  │  ╚════════════════════════╝│   │
│  │  The Initiate    85 XP to Level  │
│  └─────────────────────────────┘   │
│                                     │
│  XPProgressBar Component            │
│  └─ Listens via useXpWs hook        │
└──────────┬──────────────────────────┘
           │
           │ WebSocket STOMP
           │ /user/{userId}/topic/xp-updates
           │
           ↓
┌──────────────────────────────────────┐
│     SPRING BOOT BACKEND (8080)      │
│                                      │
│  1. PostController                   │
│     ├─ @PostMapping("/social")      │
│     └─ gamificationService.awardXp()│
│                                      │
│  2. GamificationService              │
│     ├─ Find user in MongoDB          │
│     ├─ Award XP (base × multiplier)  │
│     ├─ Check for level-up            │
│     ├─ Save to MongoDB               │
│     └─ Broadcast via WebSocket       │
│                                      │
│  3. CollabPodController              │
│     ├─ @PostMapping("/{id}/join")   │
│     └─ gamificationService.awardXp()│
│                                      │
│  4. UserController                   │
│     ├─ @PostMapping("/{id}/endorse")│
│     └─ gamificationService.awardXp()│
│                                      │
│  5. EventController                  │
│     ├─ @PostMapping                  │
│     └─ gamificationService.awardXp()│
│                                      │
└──────────┬──────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│       MONGODB (studencollabfin)     │
│                                      │
│  User Document:                      │
│  {                                   │
│    _id: ObjectId(...),               │
│    fullName: "Taksh bansod",         │
│    level: 0,      ← Current Level   │
│    xp: 15,        ← Progress (0-99) │
│    totalXp: 15,   ← Lifetime Total  │
│    xpMultiplier: 1.0, ← Boost      │
│    ...other fields...                │
│  }                                   │
└──────────────────────────────────────┘
```

---

## Event Flow Diagram

```
USER PERFORMS ACTION
    │
    ├─ Creates Post
    ├─ Joins Pod
    ├─ Gets Endorsed
    └─ Creates Event
    │
    ↓
HTTP REQUEST TO BACKEND
    POST /api/posts/social
    POST /pods/{id}/join
    POST /api/users/{id}/endorse
    POST /api/events
    │
    ↓
CONTROLLER PROCESSES REQUEST
    │
    ├─ Validate input
    ├─ Save to database
    ├─ Determine userId
    │
    ↓
GAMIFICATION SERVICE AWARDS XP
    │
    ├─ 🎯 Log: Attempting award
    ├─ 📊 Log: User found
    ├─ 💰 Calculate points (base × multiplier)
    ├─ ✅ Update user.xp and user.totalXp
    ├─ ⬆️ Check for level-up (≥100 XP)
    ├─ 📡 Log: Broadcasting
    ├─ Send via WebSocket
    └─ ✔️ Log: Broadcast sent
    │
    ↓
MONGODB UPDATES
    user.xp ← added X points
    user.totalXp ← added X points
    user.level ← increased if ≥100 XP
    │
    ↓
WEBSOCKET MESSAGE SENT
    Destination: /user/{userId}/topic/xp-updates
    Payload: User object (with updated level/xp/totalXp)
    │
    ↓
FRONTEND RECEIVES MESSAGE (useXpWs hook)
    │
    ├─ 📨 Log: Message received
    ├─ 📊 Log: Parse JSON
    ├─ ✔️ Call onXpUpdate callback
    └─ Pass updatedUser to callback
    │
    ↓
PROFILEPAGE STATE UPDATES
    │
    ├─ 🎯 Log: onXpUpdate called
    ├─ setProfileOwner({...prev, xp: 15, ...})
    └─ ✅ Log: State updated
    │
    ↓
COMPONENT RE-RENDERS
    │
    ├─ XPProgressBar receives new user prop
    ├─ 🎨 Log: Component rendered
    ├─ Recalculate progress = xp / 100
    ├─ Animate bar from old% to new%
    ├─ Update counter "15/100"
    └─ Update total "15"
    │
    ↓
USER SEES UPDATE ✅
    Progress bar animates
    XP counter updates
    Total XP updates
    (Level badge updates if level-up)
```

---

## Data Model

```
User Document (MongoDB)
┌─────────────────────────────────────────┐
│ _id: ObjectId                           │
│ email: String                           │
│ fullName: String                        │
│                                         │
│ 🎮 GAMIFICATION FIELDS                  │
│ ├─ level: Int (default: 0)              │ ← User's current level
│ ├─ xp: Int (default: 0)                 │ ← XP toward next level (0-99)
│ ├─ totalXp: Int (default: 0)            │ ← Lifetime XP earned
│ └─ xpMultiplier: Double (default: 1.0)  │ ← Bonus multiplier
│                                         │
│ ... other fields ...                    │
└─────────────────────────────────────────┘

Example After 2 Posts:
┌─────────────────────────────────────────┐
│ fullName: "Taksh bansod"                │
│ level: 0                                │
│ xp: 30                    (15 + 15)     │
│ totalXp: 30               (15 + 15)     │
│ xpMultiplier: 1.0                       │
└─────────────────────────────────────────┘

Example After Event (150 XP):
┌─────────────────────────────────────────┐
│ fullName: "Taksh bansod"                │
│ level: 1                  (LEVEL UP!)   │
│ xp: 15                    (165 - 100)   │
│ totalXp: 180              (30 + 150)    │
│ xpMultiplier: 1.0                       │
└─────────────────────────────────────────┘
```

---

## XP Action Values

```
┌──────────────────────┬────┬─────────────────────┐
│ Action               │ XP │ Trigger             │
├──────────────────────┼────┼─────────────────────┤
│ CREATE_POST          │ 15 │ Creating a post     │
│ JOIN_POD             │ 30 │ Joining a ColabPod  │
│ RECEIVE_ENDORSEMENT  │ 20 │ Getting endorsed    │
│ CREATE_EVENT         │150 │ Creating an event   │
│ MENTOR_BONUS         │ 50 │ (Future) Mentoring  │
│ PROJECT_COMPLETE     │100 │ (Future) Completing │
└──────────────────────┴────┴─────────────────────┘

Level Progression:
└─ Fixed 100 XP per level
└─ Level 0: 0-99 XP
└─ Level 1: 100-199 total XP
└─ Level 2: 200-299 total XP
└─ etc...

Multiplier:
└─ Default: 1.0x (no multiplier)
└─ Can be increased during events (e.g., 1.5x)
└─ Applied: points = action_value × multiplier
```

---

## Components & Hooks

```
FRONTEND ARCHITECTURE
│
├─ src/
│  ├─ hooks/
│  │  └─ useXpWs.js
│  │     ├─ Connects to WebSocket (/ws-studcollab)
│  │     ├─ Subscribes to /user/{userId}/topic/xp-updates
│  │     ├─ Calls onXpUpdate callback when message arrives
│  │     └─ 7 logging statements for debugging
│  │
│  └─ components/
│     ├─ ProfilePage.jsx
│     │  ├─ Imports useXpWs hook
│     │  ├─ Passes userId and onXpUpdate callback
│     │  ├─ Updates state when XP changes
│     │  └─ Passes user data to XPProgressBar
│     │
│     └─ ui/
│        └─ XPProgressBar.jsx
│           ├─ Receives user prop
│           ├─ Calculates progress (xp / 100 * 100)
│           ├─ Animates progress bar
│           ├─ Displays level badge (L0, L1, etc.)
│           ├─ Shows XP counter (15/100)
│           └─ Shows total XP and multiplier
```

---

## WebSocket Destinations

```
STOMP BROKER CONFIGURATION
│
├─ Endpoint: http://localhost:8080/ws-studcollab
│  └─ SockJS with WebSocket fallback
│
├─ User-Specific Topic
│  └─ /user/{userId}/topic/xp-updates
│     ├─ Destination: /user/507f...9011/topic/xp-updates
│     ├─ Message: User object (with updated XP)
│     ├─ Receiver: Only specified user
│     └─ Use: Update UI with new XP/level
│
└─ Global Topic
   └─ /topic/level-ups
      ├─ Message: "User reached Level X!"
      ├─ Receiver: All connected users
      └─ Use: Celebrate achievements (future)
```

---

## Critical Issues Fixed

```
ISSUE 1: PostController ❌→✅
├─ Problem: private final PostService declared 3 times
├─ Impact: Spring couldn't inject GamificationService
├─ Result: Application wouldn't start
└─ Fix: Consolidated to single declaration

ISSUE 2: UserController ❌→✅
├─ Problem: Called getTotalXP() (method doesn't exist)
├─ Impact: Endorsement XP wouldn't work
├─ Result: Compilation error
└─ Fix: Changed to getXp() with correct logic

ISSUE 3: UserService ❌→✅
├─ Problem: Used getTotalXP() and setTotalXP() (don't exist)
├─ Impact: User initialization would fail
├─ Result: Compilation error
└─ Fix: Updated to use totalXp field with correct logic
```

---

## Testing Progression

```
STAGE 1: CREATE POST (15 XP)
├─ XP: 0 → 15
├─ Level: 0 → 0
├─ Progress: 0% → 15%
└─ Verify: Console logs, progress bar animation

STAGE 2: CREATE ANOTHER POST (15 XP)
├─ XP: 15 → 30
├─ Level: 0 → 0
├─ Progress: 15% → 30%
└─ Verify: Counter updates

STAGE 3: JOIN POD (30 XP)
├─ XP: 30 → 60
├─ Level: 0 → 0
├─ Progress: 30% → 60%
└─ Verify: Different action type works

STAGE 4: GET ENDORSED (20 XP)
├─ XP: 60 → 80
├─ Level: 0 → 0
├─ Progress: 60% → 80%
└─ Verify: User can be endorsed

STAGE 5: CREATE EVENT (150 XP) - LEVEL UP!
├─ XP: 80 → 30 (of next level, since 80+150=230, 230-200=30)
│  Wait, let me recalculate...
│  Current: XP=80, Total=215
│  Add: 150 (event)
│  New Total: 365
│  Level: 365 / 100 = 3 levels
│  Remaining: 365 % 100 = 65 XP
├─ Level: 0 → 3 ✅ LEVEL UP!
├─ Progress: 80% → 65%
└─ Verify: Level badge updates, celebrates level-up
```

---

## Success = All Checks Passed

```
✅ Backend compiles
✅ Backend starts on port 8080
✅ Frontend starts on port 5173
✅ WebSocket connects (shows "✅ [useXpWs] WebSocket connected!")
✅ Create post → shows backend "🎯 [GamificationService]" logs
✅ Create post → shows frontend "📨 [useXpWs] Received" logs
✅ Create post → progress bar animates
✅ Create post → counter changes from 0/100 to 15/100
✅ Create post → total changes from 0 to 15
✅ Join pod → XP increases by 30
✅ Get endorsed → XP increases by 20
✅ Create event → Level increases (≥100 XP reached)
✅ Refresh page → XP values persist
✅ MongoDB shows updated xp/totalXp
✅ No console errors
✅ No network errors

ALL CHECKS PASSED = SYSTEM WORKING! 🎉
```

---

## Logging Reference

```
BACKEND LOGS (watch in `mvn spring-boot:run` terminal)
┌─────────────────────────────────────────────────────────┐
│ 🎯 [GamificationService] Attempting to award XP         │
│ 📊 [GamificationService] User found: Taksh bansod       │
│ 💰 [GamificationService] Points to award: 15            │
│ ✅ [GamificationService] User saved - New XP: 15        │
│ 📡 [GamificationService] Broadcasting to /user/...      │
│ ✔️  [GamificationService] Broadcast sent!               │
│ ⬆️  [GamificationService] LEVEL UP! New level: 1        │
│ 🎉 [GamificationService] Broadcasting level-up          │
│ ⚠️  [GamificationService] User not found!               │
└─────────────────────────────────────────────────────────┘

FRONTEND LOGS (watch in DevTools Console)
┌─────────────────────────────────────────────────────────┐
│ 🔌 [useXpWs] Connecting to WebSocket                    │
│ ✅ [useXpWs] WebSocket connected!                       │
│ 📨 [useXpWs] Received XP update message                 │
│ 📊 [useXpWs] Parsed user data                           │
│ ✔️  [useXpWs] onXpUpdate callback executed              │
│ ❌ [useXpWs] STOMP error / User not found               │
│ 🎨 [XPProgressBar] Component rendered/updated           │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Need            | Resource                         |
| --------------- | -------------------------------- |
| Quick test      | XP_QUICK_START.md                |
| Understand logs | XP_CONSOLE_LOG_REFERENCE.md      |
| Deep debugging  | XP_SYSTEM_DEBUGGING_GUIDE.md     |
| Full flow       | XP_SYSTEM_COMPLETE_FLOW.md       |
| What was fixed  | XP_SYSTEM_ANALYSIS_AND_FIXES.md  |
| Code changes    | XP_SYSTEM_CODE_CHANGES.md        |
| Documentation   | XP_SYSTEM_DOCUMENTATION_INDEX.md |
| Status          | XP_SYSTEM_STATUS_REPORT.md       |

---

**Status: ✅ READY FOR TESTING**

Start with: `mvn clean compile && mvn spring-boot:run`

Then: `npm run dev` in frontend

Then: Go to http://localhost:5173 and create a post!

🚀

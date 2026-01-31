# XP System Complete Flow Explanation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Frontend                           │
│  (React + @stomp/stompjs + useXpWs Hook)                       │
│                                                                 │
│  1. User creates post/joins pod/gets endorsed                  │
│  2. API call sent to backend                                   │
│  3. WebSocket listens for updates on                           │
│     /user/{userId}/topic/xp-updates                            │
│  4. When message arrives, ProfilePage state updates            │
│  5. XPProgressBar re-renders with new XP                       │
└────────────┬──────────────────────────────────────────────────┘
             │ HTTP Request (Create Post)
             │ POST /api/posts/social
             │
             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend                          │
│  (PostController → GamificationService → MongoDB)              │
│                                                                 │
│  1. PostController.createSocialPost() receives POST request    │
│  2. Calls postService.createPost(post, userId)                 │
│  3. Post saved to MongoDB                                      │
│  4. Calls gamificationService.awardXp(userId, CREATE_POST)    │
│  5. GamificationService finds user in MongoDB                 │
│  6. Adds 15 XP (or other points) to user.xp                   │
│  7. Adds 15 to user.totalXp                                    │
│  8. Saves updated user to MongoDB                              │
│  9. Broadcasts user object via WebSocket to                   │
│     /user/{userId}/topic/xp-updates                            │
│  10. SimpMessagingTemplate delivers message to user            │
└────────────┬──────────────────────────────────────────────────┘
             │ WebSocket Message (User Object)
             │ Destination: /user/{userId}/topic/xp-updates
             │ Payload: {"level":0,"xp":15,"totalXp":15,...}
             │
             ↓ (via STOMP over WebSocket)
         Back to Frontend
         useXpWs hook receives message
         Calls onXpUpdate(updatedUser)
         ProfilePage state updates
         XPProgressBar re-renders
```

---

## Code Execution Flow - Step by Step

### 1. User Creates a Post

**Frontend (React):**

```jsx
// In PostCreationForm or similar component
const handleCreatePost = async () => {
  const response = await api.post("/api/posts/social", {
    title: "Ask for Help",
    content: "How do I solve this problem?",
    type: "ASK_HELP",
  });
  // Response contains the created post
};
```

**Backend - PostController:**

```java
@PostMapping("/social")
public ResponseEntity<?> createSocialPost(
    @RequestBody SocialPost socialPost,
    Authentication authentication,
    HttpServletRequest request) {

    // ✅ Step 1: Extract userId
    String userId = getCurrentUserId(authentication, request);
    // userId = "507f1f77bcf86cd799439011" (MongoDB ObjectId)

    System.out.println("Author ID: " + userId);

    // ✅ Step 2: Create post in database
    Post createdPost = postService.createPost(socialPost, userId);
    // Post saved to MongoDB collection "posts"

    System.out.println("Post created successfully with ID: " + createdPost.getId());

    // ✅ Step 3: Award XP for creating post
    System.out.println("[DEBUG] Before awardXp - userId: " + userId);
    gamificationService.awardXp(userId, XPAction.CREATE_POST);
    System.out.println("[DEBUG] After awardXp - successfully called");

    // ✅ Step 4: Return response (front-end doesn't wait for XP)
    return ResponseEntity.status(HttpStatus.CREATED).body(createdPost);
}
```

---

### 2. GamificationService Processes XP

**Backend - GamificationService:**

```java
public void awardXp(String userId, XPAction action) {
    // ✅ Step 1: Log the attempt
    System.out.println("🎯 [GamificationService] Attempting to award XP");
    System.out.println("   userId: " + userId);
    System.out.println("   action: " + action.name() + " (" + action.getPoints() + " points)");

    // ✅ Step 2: Find user in MongoDB
    userRepository.findById(userId).ifPresent(user -> {

        // ✅ Step 3: Calculate XP (base × multiplier)
        int basePoints = action.getPoints();  // 15 for CREATE_POST
        double multiplier = user.getXpMultiplier();  // Usually 1.0
        int points = (int) (basePoints * multiplier);  // 15 × 1.0 = 15

        int oldLevel = user.getLevel();  // 0
        int oldXp = user.getXp();  // 0

        System.out.println("📊 [GamificationService] User found: " + user.getFullName());
        System.out.println("   Old Level: " + oldLevel);
        System.out.println("   Old XP: " + oldXp);
        System.out.println("💰 [GamificationService] Points to award: " + points);

        // ✅ Step 4: Update XP fields
        user.setXp(user.getXp() + points);  // 0 + 15 = 15
        user.setTotalXp(user.getTotalXp() + points);  // 0 + 15 = 15

        // ✅ Step 5: Check for level-up (100 XP = 1 level)
        while (user.getXp() >= 100) {
            user.setXp(user.getXp() - 100);
            user.setLevel(user.getLevel() + 1);
            System.out.println("⬆️  [GamificationService] LEVEL UP! New level: " + user.getLevel());
        }

        // ✅ Step 6: Save to MongoDB
        userRepository.save(user);  // Updates the user document

        System.out.println("✅ [GamificationService] User saved");
        System.out.println("   New Level: " + user.getLevel());  // 0
        System.out.println("   New XP: " + user.getXp());  // 15
        System.out.println("   Total XP: " + user.getTotalXp());  // 15

        // ✅ Step 7: Broadcast via WebSocket
        System.out.println("📡 [GamificationService] Broadcasting to /user/" + userId + "/topic/xp-updates");

        messagingTemplate.convertAndSendToUser(
            userId,                    // Destination user
            "/topic/xp-updates",       // Topic suffix
            user                       // Message payload (entire user object)
        );
        // Full destination: /user/{userId}/topic/xp-updates

        System.out.println("✔️  [GamificationService] Broadcast sent!");

        // ✅ Step 8: Broadcast level-up globally if needed
        if (user.getLevel() > oldLevel) {
            String levelUpMsg = user.getFullName() + " reached Level " + user.getLevel() + "!";
            System.out.println("🎉 [GamificationService] Broadcasting level-up: " + levelUpMsg);
            messagingTemplate.convertAndSend(
                "/topic/level-ups",  // Global topic
                levelUpMsg
            );
        }
    });

    // ✅ Step 9: Handle user not found
    if (!userRepository.existsById(userId)) {
        System.out.println("⚠️  [GamificationService] User not found! userId: " + userId);
    }
}
```

---

### 3. WebSocket Sends Message to Client

**Backend - WebSocketConfig (Spring Configuration):**

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for /topic and /queue
        config.enableSimpleBroker("/topic", "/queue");

        // Set user destination prefix - allows /user/{userId}/* patterns
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register WebSocket endpoint at /ws-studcollab
        registry.addEndpoint("/ws-studcollab")
                .setAllowedOriginPatterns("http://localhost:*")
                .withSockJS();  // Allow fallback for browsers without WebSocket
    }
}
```

**What happens when `convertAndSendToUser()` is called:**

1. Message broker looks up user "507f1f77bcf86cd799439011" (the userId)
2. Finds their STOMP session from the WebSocket connection
3. Sends user object as JSON to `/user/507f1f77bcf86cd799439011/topic/xp-updates`
4. Client browser receives the message

---

### 4. Frontend Receives WebSocket Message

**Frontend - useXpWs Hook (Custom Hook):**

```jsx
export default function useXpWs({ userId, onXpUpdate }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      console.log("⚠️  [useXpWs] No userId provided, skipping");
      return;
    }

    console.log("🔌 [useXpWs] Connecting to WebSocket for userId:", userId);

    // ✅ Step 1: Create STOMP client
    const client = new Client({
      webSocketFactory: () =>
        new SockJS("http://localhost:8080/ws-studcollab", null, {
          transports: ["websocket"],
        }),
      reconnectDelay: 5000,

      // ✅ Step 2: When connection established
      onConnect: () => {
        console.log("✅ [useXpWs] WebSocket connected!");

        // ✅ Step 3: Subscribe to personal XP updates
        console.log("Subscribing to /user/" + userId + "/topic/xp-updates");

        client.subscribe(`/user/${userId}/topic/xp-updates`, (msg) => {
          console.log("📨 [useXpWs] Received message");

          try {
            // ✅ Step 4: Parse the JSON message
            const updatedUser = JSON.parse(msg.body);
            console.log("📊 [useXpWs] Parsed user:", updatedUser);

            // updatedUser = {
            //   id: "507f1f77bcf86cd799439011",
            //   level: 0,
            //   xp: 15,
            //   totalXp: 15,
            //   xpMultiplier: 1.0,
            //   fullName: "Taksh bansod",
            //   ...
            // }

            // ✅ Step 5: Call the callback with updated user
            onXpUpdate && onXpUpdate(updatedUser);
            console.log("✔️  [useXpWs] onXpUpdate callback executed");
          } catch (e) {
            console.error("❌ [useXpWs] Error parsing message:", e);
          }
        });

        console.log("✅ [useXpWs] Subscribed successfully");
      },

      // ✅ Step 6: Error handling
      onStompError: (frame) => {
        console.error("❌ [useXpWs] STOMP error:", frame);
      },
    });

    clientRef.current = client;

    // ✅ Step 7: Activate the client
    console.log("🚀 [useXpWs] Activating STOMP client");
    client.activate();

    // ✅ Step 8: Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [userId, onXpUpdate]);
}
```

---

### 5. Frontend Updates State

**Frontend - ProfilePage Component:**

```jsx
export default function ProfilePage() {
  const [profileOwner, setProfileOwner] = useState({
    level: 0,
    xp: 0,
    totalXp: 0,
    xpMultiplier: 1.0,
  });

  // ✅ Step 1: Initialize WebSocket hook
  useXpWs({
    userId: profileOwner?.id,
    onXpUpdate: (updatedUser) => {
      console.log("🎯 [ProfilePage] onXpUpdate callback fired");
      console.log("   Received user:", updatedUser);

      // ✅ Step 2: Update state with new XP data
      console.log("🎯 [ProfilePage] Updating profileOwner state");

      setProfileOwner((prev) => ({
        ...prev, // Keep all other fields
        level: updatedUser.level, // 0
        xp: updatedUser.xp, // 15
        totalXp: updatedUser.totalXp, // 15
        xpMultiplier: updatedUser.xpMultiplier, // 1.0
      }));

      console.log("✅ [ProfilePage] State updated!");
      // React triggers re-render
    },
  });

  return (
    <>
      {/* ✅ Step 3: Pass updated user to XPProgressBar */}
      <XPProgressBar user={profileOwner} />
    </>
  );
}
```

---

### 6. Frontend Renders Updated UI

**Frontend - XPProgressBar Component:**

```jsx
export default function XPProgressBar({ user }) {
    // ✅ Step 1: Log when component updates
    useEffect(() => {
        console.log('🎨 [XPProgressBar] Rendering with user:', user);
        console.log('   - Level:', user?.level);  // 0
        console.log('   - XP:', user?.xp);  // 15
        console.log('   - Total XP:', user?.totalXp);  // 15
        console.log('   - Multiplier:', user?.xpMultiplier);  // 1.0
    }, [user]);

    // ✅ Step 2: Calculate progress percentage
    const progress = user?.xp ? (user.xp / 100) * 100 : 0;
    // progress = (15 / 100) * 100 = 15%

    const nextLevelXp = 100 - (user?.xp || 0);
    // nextLevelXp = 100 - 15 = 85

    // ✅ Step 3: Render HTML with updated values
    return (
        <div>
            {/* ✅ Step 4: Level badge */}
            <span>L{user?.level || 0}</span>  {/* Shows "L0" */}

            {/* ✅ Step 5: Progress bar animated */}
            <div
                style={{ width: `${progress}%` }}  {/* width: 15% */}
                className="bg-gradient-to-r from-blue-700 via-cyan-500 to-indigo-500"
            />

            {/* ✅ Step 6: XP counter */}
            <div>
                {user?.xp || 0}  {/* Shows "15" */}
                <span>/100</span>
            </div>

            {/* ✅ Step 7: Total XP */}
            <span>TOTAL: {user?.totalXp || 0}</span>  {/* Shows "TOTAL: 15" */}

            {/* ✅ Step 8: Multiplier */}
            <p>BONUS: {(user?.xpMultiplier || 1).toFixed(1)}x XP</p>  {/* Shows "1.0x" */}
        </div>
    );
}
```

---

## MongoDB Documents

### Before Creating Post

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "user@example.com",
  "fullName": "Taksh bansod",
  "level": 0,
  "xp": 0,
  "totalXp": 0,
  "xpMultiplier": 1.0,
  ...
}
```

### After Creating Post

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "user@example.com",
  "fullName": "Taksh bansod",
  "level": 0,        // ✅ Updated
  "xp": 15,          // ✅ Was 0, now 15
  "totalXp": 15,     // ✅ Was 0, now 15
  "xpMultiplier": 1.0,
  ...
}
```

### After Creating Event (150 XP)

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "user@example.com",
  "fullName": "Taksh bansod",
  "level": 1,        // ✅ LEVEL UP! (150 XP ≥ 100)
  "xp": 65,          // ✅ 15 + 150 = 165, minus 100 = 65
  "totalXp": 165,    // ✅ 15 + 150 = 165
  "xpMultiplier": 1.0,
  ...
}
```

---

## WebSocket STOMP Message Format

### Message Sent by Backend

```
SEND
destination:/user/507f1f77bcf86cd799439011/topic/xp-updates
content-length:152

{
  "id": "507f1f77bcf86cd799439011",
  "level": 0,
  "xp": 15,
  "totalXp": 15,
  "xpMultiplier": 1.0,
  "fullName": "Taksh bansod",
  "email": "user@example.com",
  ... (all user fields)
}
```

### Client Subscription

```javascript
client.subscribe(
  `/user/507f1f77bcf86cd799439011/topic/xp-updates`,
  (message) => {
    // message.body = JSON string above
    const user = JSON.parse(message.body);
    // Now can access user.level, user.xp, etc.
  },
);
```

---

## Summary

The complete flow:

1. **User Action** → Creates post via React form
2. **HTTP Request** → POST to /api/posts/social
3. **Backend Processing** → PostController receives request
4. **Service Layer** → Calls gamificationService.awardXp()
5. **Database Update** → MongoDB user document updated
6. **WebSocket Broadcast** → Sends user object to client
7. **Frontend Reception** → useXpWs hook receives message
8. **State Update** → ProfilePage updates its state
9. **UI Render** → XPProgressBar re-renders with new values
10. **Visual Change** → Progress bar animates, XP counter updates

All logs along the way help identify where any issue might be!

# Real-Time Messaging Debug Guide

## Problem Statement
Messages save to the database but users must refresh to see new messages in real-time.

## Enhanced Debugging Implementation

### Frontend Console Logging

The frontend now logs the complete message flow:

#### 1. **WebSocket Connection**
```
✅ WebSocket connected for pod {podId}
📡 Subscribed to /topic/pod.{podId}.chat
```

#### 2. **Message Sending**
```
📮 Creating message payload: {
  tempId: "temp-1701234567890-0.5",
  content: "Hello",
  senderId: "userId123",
  senderName: "John Doe"
}
➕ Adding optimistic message to state. Total messages before: 5
🚀 Sending via WebSocket...
✅ WebSocket send() called
📤 Sending message to /app/pod.{podId}.chat: {...}
```

#### 3. **Message Receiving**
```
📨 handleIncoming called with payload: {...}
✨ Normalized message: {
  id: "real-mongo-id",
  content: "Hello",
  senderId: "userId123",
  senderName: "John Doe"
}
🔄 Message already exists (deduplication), updating: real-mongo-id
```

### Backend Console Logging

The backend now logs the complete save and broadcast flow:

```
📨 [WS] Message received for pod: {podId}
   Content: Hello
   Sender: John Doe (userId123)
💾 [DB] Saving message to database...
✅ [DB] Message saved with ID: {mongoId}
📤 [WS] Broadcasting to: /topic/pod.{podId}.chat
✅ [WS] Broadcast complete
```

## Debugging Steps

### Step 1: Check WebSocket Connection

**Open Browser Console** (F12) and look for:

```
✅ WebSocket connected for pod {podId}
📡 Subscribed to /topic/pod.{podId}.chat
```

**If you see connection errors:**
- Check server is running on port 8080
- Check WebSocket endpoint `/ws-studcollab` is accessible
- Look for CORS errors

### Step 2: Send a Test Message

Type a message and send it. In the console, you should see:

```
📮 Creating message payload: {...}
➕ Adding optimistic message to state. Total messages before: X
🚀 Sending via WebSocket...
✅ WebSocket send() called
```

**The message should appear immediately in the UI** (optimistic update).

### Step 3: Check Backend Logs

**Open terminal where server is running** and look for:

```
📨 [WS] Message received for pod: {podId}
   Content: Hello
   Sender: John Doe (userId123)
💾 [DB] Saving message to database...
✅ [DB] Message saved with ID: {mongoId}
📤 [WS] Broadcasting to: /topic/pod.{podId}.chat
✅ [WS] Broadcast complete
```

### Step 4: Check Real-Time Reception

In browser console, look for:

```
📨 handleIncoming called with payload: {...}
✨ Normalized message: {...}
🔄 Message already exists (deduplication), updating: {mongoId}
```

**If you see this but the message doesn't appear:**
- The WebSocket subscription might not be active
- Check the message ID normalization is working

## Common Issues and Solutions

### Issue 1: Message appears immediately (optimistic update works) but disappears on refresh

**Likely Cause:** Backend is not broadcasting or frontend subscription is not active

**Check:**
1. Backend logs show `✅ [WS] Broadcast complete`? YES → Issue is frontend subscription
2. Frontend receives `📨 handleIncoming called`? NO → Subscription issue

**Solution:**
- Verify `/topic/pod.{podId}.chat` is the correct path
- Check `@EnableWebSocketMessageBroker` is on WebSocketConfig
- Verify `config.enableSimpleBroker("/topic", "/queue")` in WebSocketConfig

### Issue 2: Message doesn't appear at all (even optimistically)

**Likely Cause:** `podWs.send()` is not being called or WebSocket is not connected

**Check:**
1. Frontend logs show `🚀 Sending via WebSocket...`? YES → Issue is backend reception
2. Frontend logs show `✅ WebSocket connected`? NO → Connection issue

**Solution:**
- Ensure WebSocket endpoint is `/ws-studcollab`
- Check SockJS is being used as transport
- Verify origin patterns in WebSocketConfig allow your client

### Issue 3: Backend receives message but doesn't broadcast

**Likely Cause:** `messagingTemplate.convertAndSend()` is failing

**Check:**
1. Backend logs show `📨 [WS] Message received`? YES
2. Backend logs show `📤 [WS] Broadcasting to`? NO → convertAndSend failing

**Solution:**
- Verify `SimpMessagingTemplate` is injected
- Check no exceptions in backend error logs
- Verify STOMP broker is configured with `/topic` prefix

### Issue 4: Multiple of same message appearing

**Likely Cause:** Deduplication logic isn't working

**Check:**
1. Frontend shows `🔄 Message already exists (deduplication)`? NO → IDs don't match
2. Optimistic message ID and broadcast message ID are same? NO

**Solution:**
- Check backend returns same ID from `collabPodService.saveMessage()`
- Verify ID normalization in `handleIncoming`:
  ```javascript
  id: saved.id || saved._id
  ```

### Issue 5: WebSocket disconnects and reconnects frequently

**Likely Cause:** Network issues or server timeout

**Check:**
1. Backend logs show disconnects?
2. Browser console shows reconnect attempts?

**Solution:**
- Check `reconnectDelay: 5000` in usePodWs.js
- Verify backend STOMP configuration
- Check network latency and packet loss

## Testing Checklist

- [ ] Open pod in browser (WebSocket should connect)
- [ ] Check console for `✅ WebSocket connected`
- [ ] Send a message (should appear immediately)
- [ ] Check backend logs for `✅ [WS] Broadcast complete`
- [ ] Check frontend console for `📨 handleIncoming called`
- [ ] Refresh page - message should still be there
- [ ] Open pod in second browser tab
- [ ] Send message in first tab
- [ ] Check message appears in second tab in real-time
- [ ] Check backend logs show broadcast to `/topic/pod.{podId}.chat`
- [ ] Send message with attachment
- [ ] Check attachment URL is broadcast correctly

## Message Flow Diagram

```
Frontend                          Backend                    Database
  │                                  │                           │
  ├─ User types message             │                           │
  │                                  │                           │
  ├─ 📮 Create message payload       │                           │
  │                                  │                           │
  ├─ ➕ Optimistic update to state   │                           │
  │                                  │                           │
  ├─ 🚀 Send via WebSocket           │                           │
  │         to /app/pod.X.chat ────────────┐                     │
  │                                  ├─ 📨 Receive message       │
  │                                  │                           │
  │                                  ├─ 💾 Save to DB ───────────────┐
  │                                  │                           │
  │                                  │                      ✅ Saved
  │                                  │
  │                                  ├─ 📤 Broadcast to /topic/pod.X.chat
  │                                  │         (all subscribers)
  │  📨 handleIncoming called ←──────┤
  │                                  │
  ├─ ✨ Normalize message           │
  │                                  │
  ├─ 🔄 Check deduplication          │
  │                                  │
  ├─ ➕ Add to state                 │
  │                                  │
  └─ ✅ Display in UI                │
```

## Key Files Modified

### Frontend
- **usePodWs.js** - Enhanced logging for WebSocket connection, subscription, and send
- **CollabPodPage.jsx** - Enhanced logging for message creation and incoming messages

### Backend
- **PodChatWSController.java** - Enhanced logging for message reception and broadcast
- **CollabPodService.saveMessage()** - Already had logging for DB save

## Environment Variables

Ensure these are correct:

**Frontend:**
- WebSocket endpoint: `http://localhost:8080/ws-studcollab`

**Backend:**
- Server running on: `localhost:8080`
- STOMP broker: `/topic`, `/queue`
- Application destination prefix: `/app`

## Performance Considerations

- Deduplication logic prevents duplicate renders
- Optimistic updates give instant feedback
- Messages are saved before broadcasting (durability)
- Subscriptions are cleaned up on unmount (memory leak prevention)

## Next Steps If Still Not Working

1. **Check network tab:** Verify WebSocket upgrade happens
2. **Check browser extensions:** Some block WebSocket connections
3. **Check firewall:** Port 8080 must be accessible
4. **Check MongoDB:** Verify messages are actually being saved
5. **Restart everything:** Sometimes old connections get stuck
6. **Check for errors:** Search for ❌ or ✗ in any console

---

## Debug Commands

### Test WebSocket Connection (Frontend Console)
```javascript
// Check if WebSocket client is connected
console.log(clientRef.current?.connected);

// Send test message manually
clientRef.current?.publish({
  destination: '/app/pod/test123/chat',
  body: JSON.stringify({ content: 'Test', senderId: 'user123' })
});
```

### Test Database (Backend Terminal)
```bash
# Connect to MongoDB
mongosh

# Check messages collection
db.messages.find({ podId: "YOUR_POD_ID" }).sort({ sentAt: -1 }).limit(5)
```

### Check Message in Real-Time (All Browsers)
1. Open 2 browser windows with same pod
2. Send message in window 1
3. Both windows should show message immediately
4. Refresh window 2 - message should still be there

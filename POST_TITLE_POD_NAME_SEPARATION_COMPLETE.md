# Post Title vs Pod Name Separation - Complete Implementation

## Overview
Separated the "Post Title" from the "Pod Name" for LOOKING_FOR posts. The post title is displayed in the Campus Feed, while the pod name is displayed in the collaboration room header.

---

## Problem
Previously, when creating a LOOKING_FOR post, the system used the post title as the pod name in the CollabPod collection. This didn't allow creators to differentiate between:
- **Post Title**: Brief title shown in the feed (e.g., "Need React help urgently!")
- **Pod Name**: Name of the collaboration room (e.g., "React Study Group")

---

## Solution

### 1. Backend Changes

#### A. Schema Update - SocialPost Model
**File:** [SocialPost.java](server/src/main/java/com/studencollabfin/server/model/SocialPost.java)

**Added Field:**
```java
// ✅ NEW: Separate pod name for LOOKING_FOR posts (distinct from post title)
private String podName; // Only used for LOOKING_FOR posts - the name of the linked CollabPod
```

**Purpose:** Stores the custom pod name separately from the post title

---

#### B. Service Logic Update - PostService
**File:** [PostService.java](server/src/main/java/com/studencollabfin/server/service/PostService.java#L176-L188)

**Updated Pod Creation Logic:**
```java
if (social.getType() == com.studencollabfin.server.model.PostType.LOOKING_FOR) {
    try {
        System.out.println("Creating CollabPod for LOOKING_FOR post: " + social.getId());
        CollabPod pod = new CollabPod();
        
        // ✅ NEW: Use podName if provided, otherwise fall back to title
        String podName = social.getPodName() != null && !social.getPodName().trim().isEmpty() 
            ? social.getPodName() 
            : (social.getTitle() != null ? social.getTitle() : "Looking for collaborators");
        
        pod.setName(podName);
        System.out.println("📌 Pod name set to: " + podName);
        pod.setDescription(social.getContent());
        // ... rest of pod creation
    }
}
```

**Logic Flow:**
1. Check if `social.podName` exists and is not empty
2. If yes → Use it as pod name
3. If no → Fall back to `social.title`
4. If title is empty → Use default "Looking for collaborators"

---

### 2. Frontend Changes

#### A. State Management - CampusFeed.jsx
**File:** [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx#L251)

**Updated State:**
```jsx
// ✅ NEW: Add podName field for LOOKING_FOR posts
const [newPost, setNewPost] = useState({ title: '', content: '', podName: '' });
```

**Before:**
```jsx
const [newPost, setNewPost] = useState({ title: '', content: '' });
```

---

#### B. Form Input Field - Pod Name Input
**File:** [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx#L569-L575)

**New JSX Component:**
```jsx
{/* ✅ NEW: Pod Name field for LOOKING_FOR posts */}
{selectedPostType === 'LOOKING_FOR' && (
  <div>
    <label className="block font-semibold mb-2 text-slate-300">
      Pod Name * 
      <span className="text-xs text-slate-400">(appears in the collaboration room)</span>
    </label>
    <Input 
      placeholder="e.g., React Study Group, AI Project Team..." 
      value={newPost.podName} 
      onChange={(e) => setNewPost(p => ({ ...p, podName: e.target.value }))} 
      className="bg-slate-800/50 border-slate-700 focus:ring-blue-500" 
    />
  </div>
)}
```

**Features:**
- ✅ Only appears when `selectedPostType === 'LOOKING_FOR'`
- ✅ Placeholder shows example pod names
- ✅ Helper text explains purpose
- ✅ Styled consistently with other inputs

---

#### C. Form Validation - Pod Name Validation
**File:** [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx#L287-L294)

**New Validation:**
```jsx
if (!selectedPostType || !newPost.title.trim()) {
  alert('Please select a post type and fill in the title.');
  return;
}

// ✅ NEW: Validate podName for LOOKING_FOR posts
if (selectedPostType === 'LOOKING_FOR' && !newPost.podName.trim()) {
  alert('Please enter a Pod Name for the collaboration room.');
  return;
}
```

**Validation Rules:**
- ✅ podName is **mandatory** for LOOKING_FOR posts
- ✅ Must not be empty or whitespace
- ✅ Shows user-friendly error message if missing

---

#### D. Payload Construction - Include podName
**File:** [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx#L310-L330)

**Updated Payload:**
```jsx
// 2. CONSTRUCT CLEAN PAYLOAD
const cleanPayload = {
  title: newPost.title,
  content: newPost.content,
  type: typeMapping[selectedPostType] || selectedPostType.toUpperCase().replace(/ /g, '_'),
  category: 'CAMPUS',
  likes: [],
  comments: [],
  createdAt: new Date().toISOString()
};

// ✅ NEW: Add podName for LOOKING_FOR posts
if (selectedPostType === 'LOOKING_FOR') {
  cleanPayload.podName = newPost.podName || newPost.title; // Default to title if not provided
}
```

**Payload Examples:**

**LOOKING_FOR Post:**
```json
{
  "title": "Need React help urgently!",
  "content": "Looking for someone experienced with React hooks",
  "type": "LOOKING_FOR",
  "category": "CAMPUS",
  "podName": "React Study Group",
  "likes": [],
  "comments": []
}
```

**ASK_HELP Post (no podName):**
```json
{
  "title": "How do I use useEffect?",
  "content": "Can someone explain...",
  "type": "ASK_HELP",
  "category": "CAMPUS",
  "likes": [],
  "comments": []
}
```

---

#### E. Form Reset - Clear podName
**File:** [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx#L364)

**Updated Reset:**
```jsx
// ✅ Reset form including podName
setNewPost({ title: '', content: '', podName: '' });
```

---

### 3. UI/UX Flow

#### Create Post Modal - LOOKING_FOR
```
┌─────────────────────────────────────┐
│    Create New Post                  │
├─────────────────────────────────────┤
│                                     │
│ Post Type *                         │
│ [❓] [🆘] [📊] [👀]  ← Selected     │
│                                     │
│ Title *                             │
│ [Need React help urgently!]         │
│                                     │
│ Pod Name * (appears in the...)  ✨  │
│ [React Study Group.............]    │
│                                     │
│ Content / Description               │
│ [Looking for someone experienced...]│
│                                     │
│                 [Cancel] [Create]   │
└─────────────────────────────────────┘
```

#### Create Post Modal - ASK_HELP (no Pod Name field)
```
┌─────────────────────────────────────┐
│    Create New Post                  │
├─────────────────────────────────────┤
│                                     │
│ Post Type *                         │
│ [❓] ← Selected [🆘] [📊] [👀]     │
│                                     │
│ Title *                             │
│ [How do I use useEffect?]           │
│                                     │
│ Content / Description               │
│ [Can someone explain...]            │
│                                     │
│                 [Cancel] [Create]   │
└─────────────────────────────────────┘
```

---

## Data Flow Diagram

```
CREATE POST (LOOKING_FOR)
        ↓
    Frontend Form
    ├─ title: "Need React help"
    ├─ podName: "React Study Group" ← NEW
    └─ content: "Details..."
        ↓
    Validate: podName is required ✅
        ↓
    POST /api/posts/social
    {
      "title": "Need React help",
      "podName": "React Study Group",  ← NEW
      "content": "Details...",
      "type": "LOOKING_FOR"
    }
        ↓
    Backend: PostService.createPost()
        ↓
    Save SocialPost
    ├─ title: "Need React help"
    ├─ podName: "React Study Group"   ← Stored
    └─ type: LOOKING_FOR
        ↓
    Create LinkedCollabPod
    └─ name: "React Study Group" ← Used from podName ✅
        ↓
    Response: {
      "id": "post123",
      "title": "Need React help",
      "podName": "React Study Group",
      "linkedPodId": "pod456"
    }
        ↓
    Frontend: Display in feed
    ├─ Post Title: "Need React help"
    └─ Pod Link: Click to "React Study Group"
```

---

## Database Schema

### SocialPost Collection
```javascript
{
  _id: ObjectId,
  title: "Need React help urgently!",      // Post title (for feed)
  podName: "React Study Group",            // ✅ NEW: Pod name (for room)
  content: "Looking for someone experienced...",
  type: "LOOKING_FOR",
  category: "CAMPUS",
  linkedPodId: ObjectId("pod123..."),
  authorId: "user456...",
  createdAt: ISODate,
  likes: [],
  commentIds: []
}
```

### CollabPod Collection
```javascript
{
  _id: ObjectId("pod123..."),
  name: "React Study Group",               // ✅ Set from podName
  description: "Looking for someone experienced...",
  type: "LOOKING_FOR",
  podSource: "COLLAB_POD",
  linkedPostId: ObjectId("post456..."),
  ownerId: "user456...",
  memberIds: [],
  createdAt: ISODate
}
```

---

## Testing Checklist

### Backend Tests

- [ ] **Test 1: Create LOOKING_FOR post with custom podName**
  - Create post with `podName: "Custom Pod Name"`
  - Verify: SocialPost saved with correct podName
  - Verify: LinkedCollabPod created with pod.name = "Custom Pod Name"
  - Check logs: "📌 Pod name set to: Custom Pod Name"

- [ ] **Test 2: Create LOOKING_FOR post without podName (fallback to title)**
  - Create post with `title: "My Title"` but no podName
  - Verify: SocialPost saved with podName = "" (empty)
  - Verify: LinkedCollabPod created with pod.name = "My Title"
  - Check logs: "📌 Pod name set to: My Title"

- [ ] **Test 3: Create LOOKING_FOR post with empty podName (fallback to title)**
  - Create post with `podName: ""` and `title: "Fallback Title"`
  - Verify: LinkedCollabPod created with pod.name = "Fallback Title"

- [ ] **Test 4: Other post types unaffected**
  - Create ASK_HELP post with podName field
  - Verify: Field ignored (no pod created for ASK_HELP)
  - Verify: No errors or warnings

- [ ] **Test 5: Special characters in podName**
  - Create with `podName: "React & Vue Study @ IIT"`
  - Verify: Pod name preserved exactly
  - Check database for correct encoding

### Frontend Tests

- [ ] **Test 1: LOOKING_FOR form shows Pod Name field**
  - Open Create Post modal
  - Select LOOKING_FOR type
  - Verify: Pod Name input field appears
  - Verify: Placeholder text shown

- [ ] **Test 2: Other types hide Pod Name field**
  - Open Create Post modal
  - Select ASK_HELP type
  - Verify: Pod Name input field NOT visible
  - Switch to LOOKING_FOR
  - Verify: Pod Name input field appears again

- [ ] **Test 3: Pod Name is mandatory for LOOKING_FOR**
  - Select LOOKING_FOR
  - Leave Pod Name empty
  - Click Create
  - Verify: Alert shows "Please enter a Pod Name..."
  - Verify: Form not submitted

- [ ] **Test 4: Pod Name can be submitted**
  - Fill form with Pod Name: "Study Group"
  - Click Create
  - Verify: Success message
  - Verify: Post appears in feed

- [ ] **Test 5: Pod Name defaults to title if empty**
  - Fill: Title="My Post", Pod Name=""
  - Submit
  - Verify: Pod created with name from title

- [ ] **Test 6: Form reset clears Pod Name**
  - Enter Pod Name: "Group 1"
  - Create post successfully
  - Verify: Pod Name field cleared to ""

---

## Before & After

### Before (❌ ISSUE)
```
Frontend Form:
├─ Title: "Need React help"
└─ (No separate pod name field)
    ↓
Backend:
├─ SocialPost.title: "Need React help"
└─ CollabPod.name: "Need React help" (same as title)
    ↓
Result:
├─ Feed shows: "Need React help"
├─ Room shows: "Need React help" (same)
└─ Can't differentiate feed title from room name
```

### After (✅ WORKING)
```
Frontend Form:
├─ Title: "Need React help"
└─ Pod Name: "React Study Group"
    ↓
Backend:
├─ SocialPost.title: "Need React help"
├─ SocialPost.podName: "React Study Group"
└─ CollabPod.name: "React Study Group"
    ↓
Result:
├─ Feed shows: "Need React help" (post title)
├─ Room shows: "React Study Group" (pod name)
└─ Clear separation of concerns ✅
```

---

## API Documentation

### Create LOOKING_FOR Post Request

**Endpoint:** `POST /api/posts/social`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

**Request Body:**
```json
{
  "title": "Need React help urgently!",
  "podName": "React Study Group",           // ✅ NEW: Custom pod name
  "content": "Looking for someone experienced with React hooks",
  "type": "LOOKING_FOR",
  "category": "CAMPUS",
  "likes": [],
  "comments": [],
  "createdAt": "2026-02-01T10:30:00Z"
}
```

**Response:**
```json
{
  "id": "post_abc123",
  "title": "Need React help urgently!",
  "podName": "React Study Group",           // ✅ Echoed back
  "content": "Looking for someone experienced...",
  "type": "LOOKING_FOR",
  "linkedPodId": "pod_xyz789",              // Pod created
  "authorId": "user_456",
  "createdAt": "2026-02-01T10:30:00Z"
}
```

---

## Files Modified

1. **Backend:**
   - [SocialPost.java](server/src/main/java/com/studencollabfin/server/model/SocialPost.java)
     - Added `podName` field
   - [PostService.java](server/src/main/java/com/studencollabfin/server/service/PostService.java)
     - Updated pod creation logic to use podName

2. **Frontend:**
   - [CampusFeed.jsx](client/src/components/campus/CampusFeed.jsx)
     - Added `podName` to state
     - Added Pod Name input field (conditional)
     - Added validation for podName
     - Added podName to payload
     - Updated form reset

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- Existing LOOKING_FOR posts without podName will fall back to using their title as pod name
- Existing ASK_HELP/OFFER_HELP/POLL posts are unaffected
- No data migration needed
- API accepts requests without podName (defaults to title)

---

## Future Enhancements

1. **Pod Name Character Limit:** Add max length validation (e.g., 50 chars)
2. **Pod Name Validation:** Prevent special characters if needed
3. **Duplicate Pod Names:** Warn if pod name already exists
4. **Pod Name Editing:** Allow users to rename pod after creation
5. **Analytics:** Track pod name usage patterns


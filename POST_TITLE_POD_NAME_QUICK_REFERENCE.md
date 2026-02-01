# Post Title vs Pod Name - Quick Reference

## What Changed?

### Before
- Post Title = Pod Room Name (same thing)
- Feed: "Need React help!" 
- Room: "Need React help!" (identical)

### After  
- Post Title ≠ Pod Room Name (separate)
- Feed: "Need React help!" (post.title)
- Room: "React Study Group" (pod.name from post.podName)

---

## Implementation Summary

### Backend (Java)

**1. Added Field to SocialPost.java:**
```java
private String podName; // Separate from title
```

**2. Updated PostService.java:**
```java
String podName = social.getPodName() != null && !social.getPodName().trim().isEmpty() 
    ? social.getPodName() 
    : social.getTitle();
pod.setName(podName); // Use podName for pod, not title
```

**Logic:** Use podName if provided → else use title → else use default

---

### Frontend (React)

**1. Add podName to State:**
```jsx
const [newPost, setNewPost] = useState({ 
  title: '', 
  content: '', 
  podName: '' // ✅ NEW
});
```

**2. Add Conditional Input Field (LOOKING_FOR only):**
```jsx
{selectedPostType === 'LOOKING_FOR' && (
  <div>
    <label>Pod Name * (appears in collaboration room)</label>
    <Input 
      placeholder="e.g., React Study Group, AI Project Team..."
      value={newPost.podName}
      onChange={(e) => setNewPost(p => ({ ...p, podName: e.target.value }))}
    />
  </div>
)}
```

**3. Add Validation:**
```jsx
if (selectedPostType === 'LOOKING_FOR' && !newPost.podName.trim()) {
  alert('Please enter a Pod Name for the collaboration room.');
  return;
}
```

**4. Include in Payload:**
```jsx
if (selectedPostType === 'LOOKING_FOR') {
  cleanPayload.podName = newPost.podName || newPost.title;
}
```

---

## Form Usage

### For LOOKING_FOR Posts (New Field Appears)
```
┌──────────────────────────────┐
│ Post Type: Looking For       │
│ Title: Need React help       │
│ Pod Name: React Study Group  │ ← NEW
│ Content: Details...          │
└──────────────────────────────┘
```

### For Other Post Types (No Pod Name Field)
```
┌──────────────────────────────┐
│ Post Type: Ask for Help      │
│ Title: How to use useEffect? │
│ Content: Can someone explain │
│          (no pod name field) │
└──────────────────────────────┘
```

---

## Data Storage

### In Database
```
SocialPost {
  title: "Need React help",        // What users see in feed
  podName: "React Study Group",    // What users see in room
  type: "LOOKING_FOR"
}

CollabPod {
  name: "React Study Group",       // Set from podName
  type: "LOOKING_FOR"
}
```

---

## Validation Rules

| Scenario | Rule |
|----------|------|
| LOOKING_FOR + podName filled | ✅ Submit (podName used) |
| LOOKING_FOR + podName empty | ❌ Reject (mandatory) |
| LOOKING_FOR + podName empty but title filled | ❌ Still rejected (must be explicit) |
| ASK_HELP (no podName field) | ✅ Submit (no pod created) |
| Other types | ✅ Submit (podName ignored) |

---

## Fallback Logic (Backend)

```
IF post.podName exists AND not empty
  → Use post.podName as pod.name
ELSE IF post.title exists AND not empty
  → Use post.title as pod.name
ELSE
  → Use "Looking for collaborators"
```

---

## Testing Quick Checks

### ✅ Backend
- [ ] Create LOOKING_FOR with podName → Pod created with that name
- [ ] Create LOOKING_FOR without podName → Pod uses title
- [ ] Other types ignore podName field

### ✅ Frontend
- [ ] Pod Name field visible only for LOOKING_FOR
- [ ] podName mandatory for LOOKING_FOR (alert if empty)
- [ ] Form resets podName after creation
- [ ] Payload includes podName for LOOKING_FOR

### ✅ UI
- [ ] Feed shows post.title
- [ ] Room header shows pod.name (from podName)
- [ ] Pod members see correct room name

---

## Example Workflow

```
User Creates Post:
  Title: "Need experienced React developers"
  Pod Name: "Advanced React Team"
  
  ↓
  
Backend Processing:
  social.title = "Need experienced React developers"
  social.podName = "Advanced React Team"
  ↓
  pod.name = "Advanced React Team" (from podName)
  
  ↓
  
Frontend Display:
  Campus Feed:   "Need experienced React developers" ← post.title
  Pod Header:    "Advanced React Team"              ← pod.name
```

---

## API Examples

### Request Payload
```json
{
  "title": "Need experienced React developers",
  "podName": "Advanced React Team",
  "content": "Looking for senior developers...",
  "type": "LOOKING_FOR",
  "category": "CAMPUS"
}
```

### Response (Post Created)
```json
{
  "id": "post_123",
  "title": "Need experienced React developers",
  "podName": "Advanced React Team",
  "linkedPodId": "pod_456"
}
```

### Response (Pod Created)
```json
{
  "id": "pod_456",
  "name": "Advanced React Team",
  "type": "LOOKING_FOR",
  "linkedPostId": "post_123"
}
```

---

## Key Points

✅ **pod.name** comes from **post.podName** (not post.title)  
✅ **podName is mandatory** for LOOKING_FOR posts  
✅ **Other post types** are not affected  
✅ **Fully backward compatible** (existing posts still work)  
✅ **Clear separation** between feed display and room name  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pod Name field not showing | Check selectedPostType === 'LOOKING_FOR' |
| podName not saved in database | Verify payload includes it in request |
| Pod created with wrong name | Check backend fallback logic |
| Form won't submit | Ensure podName is not empty |
| Other post types affected | Verify condition: if (selectedPostType === 'LOOKING_FOR') |


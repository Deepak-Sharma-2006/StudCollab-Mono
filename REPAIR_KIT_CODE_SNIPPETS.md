# 🔧 REPAIR KIT: Code Snippets to Fix Logic Gaps

## FIX #1: The 'Unknown User' Problem
**File:** `server/src/main/java/com/studencollabfin/server/controller/PostController.java`
**Location:** Lines 59-75 (in the `addAuthorDetailsToPost()` helper method)
**Issue:** Your posts show `creatorName: null` because author details aren't being mapped

**PASTE THIS CODE:**
```java
private void addAuthorDetailsToPost(java.util.Map<String, Object> richPost, String authorId) {
    try {
        com.studencollabfin.server.model.User user = userService.getUserById(authorId);
        if (user != null) {
            richPost.put("authorName", user.getFullName() != null ? user.getFullName() : "Unknown User");
            richPost.put("authorCollege", user.getCollegeName() != null ? user.getCollegeName() : "");
            richPost.put("authorYear", user.getYearOfStudy() != null ? user.getYearOfStudy() : "");
        } else {
            richPost.put("authorName", "Unknown User");
            richPost.put("authorCollege", "");
            richPost.put("authorYear", "");
        }
    } catch (Exception e) {
        // If user fetch fails, use defaults
        richPost.put("authorName", "Unknown User");
        richPost.put("authorCollege", "");
        richPost.put("authorYear", "");
    }
}
```

**Why it works:**
- Fetches the User object by authorId
- Extracts `fullName`, `collegeName`, and `yearOfStudy`
- Has fallbacks for null values and exceptions
- Ensures Global Hub always shows college name (crucial for inter-college feature)

---

## FIX #2: The 'Pod Creation' Chain
**File:** `server/src/main/java/com/studencollabfin/server/service/PostService.java`
**Location:** Lines 174-235 (in the `createPost()` method)
**Issue:** Your code saves the post but FAILS to create the pod - the service chain breaks

### Part A: LOOKING_FOR Posts
**PASTE THIS CODE after postRepository.save(post) call:**
```java
// Now handle pod creation with the saved post's ID
if (savedPost instanceof SocialPost) {
    SocialPost social = (SocialPost) savedPost;

    if (social.getType() == com.studencollabfin.server.model.PostType.LOOKING_FOR) {
        try {
            System.out.println("Creating CollabPod for LOOKING_FOR post: " + social.getId());
            CollabPod pod = new CollabPod();
            // ✅ Use podName if provided, otherwise fall back to title, then default message
            String podDisplayName = social.getPodName() != null && !social.getPodName().isEmpty()
                    ? social.getPodName()
                    : (social.getTitle() != null ? social.getTitle() : "Looking for collaborators");
            pod.setName(podDisplayName);
            pod.setDescription(social.getContent());
            pod.setMaxCapacity(6);
            pod.setTopics(social.getRequiredSkills() != null ? social.getRequiredSkills()
                    : new java.util.ArrayList<>());
            pod.setType(CollabPod.PodType.LOOKING_FOR);
            pod.setStatus(CollabPod.PodStatus.ACTIVE);
            pod.setScope(com.studencollabfin.server.model.PodScope.CAMPUS);
            pod.setLinkedPostId(social.getId()); // Set bi-directional link
            pod.setPodSource(CollabPod.PodSource.COLLAB_POD); // ✅ Mark as COLLAB_POD (not TEAM_POD)
            System.out.println("📌 Pod linkedPostId set to: " + social.getId());

            CollabPod createdPod = collabPodService.createPod(authorId, pod);
            System.out.println("CollabPod successfully created with ID: " + createdPod.getId());

            social.setLinkedPodId(createdPod.getId());
            savedPost = postRepository.save(social); // Save the updated post and return it
            System.out.println("Post saved with linkedPodId: " + createdPod.getId());
        } catch (Exception ex) {
            System.err.println("Failed to create CollabPod during post creation: " + ex.getMessage());
            ex.printStackTrace();
        }
    }
```

### Part B: COLLAB Posts
**In the SAME method, add this for COLLAB type:**
```java
    else if (social.getType() == com.studencollabfin.server.model.PostType.COLLAB) {
        try {
            System.out.println("Creating CollabPod for COLLAB post: " + social.getId());
            CollabPod pod = new CollabPod();
            // ✅ Use podName if provided, otherwise fall back to title, then default message
            String podDisplayName = social.getPodName() != null && !social.getPodName().isEmpty()
                    ? social.getPodName()
                    : (social.getTitle() != null ? social.getTitle() : "Collab Room");
            pod.setName(podDisplayName);
            pod.setDescription(social.getContent());
            pod.setMaxCapacity(10); // Global rooms can accommodate more
            pod.setTopics(social.getRequiredSkills() != null ? social.getRequiredSkills()
                    : new java.util.ArrayList<>());
            pod.setType(CollabPod.PodType.COLLAB);
            pod.setStatus(CollabPod.PodStatus.ACTIVE);
            pod.setScope(com.studencollabfin.server.model.PodScope.GLOBAL);
            pod.setLinkedPostId(social.getId()); // Set bi-directional link
            pod.setPodSource(CollabPod.PodSource.COLLAB_ROOM); // ✅ Mark as COLLAB_ROOM (global collaboration)
            System.out.println("Pod created with scope=GLOBAL, type=COLLAB, podSource=COLLAB_ROOM");

            CollabPod createdPod = collabPodService.createPod(authorId, pod);
            System.out.println("CollabPod successfully created with ID: " + createdPod.getId());
            social.setLinkedPodId(createdPod.getId());
            savedPost = postRepository.save(social); // Save the updated post and return it
            System.out.println("Post saved with linkedPodId: " + createdPod.getId());
        } catch (Exception ex) {
            System.err.println("Failed to create CollabPod during post creation: " + ex.getMessage());
            ex.printStackTrace();
        }
    }
}
```

**Why it works:**
- Creates pod AFTER post is saved (so we have a postId to link)
- Uses `podName` from frontend (if provided) with intelligent fallbacks
- Sets correct `scope` (CAMPUS vs GLOBAL) and `podSource` (COLLAB_POD vs COLLAB_ROOM)
- Saves the `linkedPodId` back to the post for bi-directional linking
- Each post type gets its own pod configuration

---

## FIX #3: The 'Missing Room Name' Input
**File:** `client/src/components/inter/InterFeed.jsx`
**Location:** Lines 372-378 (inside the Create Post Modal, after Title input)
**Issue:** Your COLLAB form is missing the Room Name input field

**PASTE THIS CODE after the Title input block:**
```jsx
{selectedPostType === 'COLLAB' && (
  <div>
    <label className="block font-semibold mb-2 text-slate-300">Pod Name * <span className="text-xs text-slate-400">(Name for the collaboration room)</span></label>
    <Input placeholder="e.g., 'AI Research Collab'" value={newPost.podName} onChange={(e) => setNewPost(p => ({ ...p, podName: e.target.value }))} className="bg-slate-800/50 border-slate-700 focus:ring-blue-500" />
  </div>
)}
```

**Also paste this in:** `client/src/components/campus/CampusFeed.jsx`
**Location:** Lines 506-511 (same place, after Title input for LOOKING_FOR posts)
```jsx
{selectedPostType === 'LOOKING_FOR' && (
  <div>
    <label className="block font-semibold mb-2 text-slate-300">Pod Name * <span className="text-xs text-slate-400">(The name for the collaboration pod)</span></label>
    <Input placeholder="e.g., 'UI/UX Design Team'" value={newPost.podName} onChange={(e) => setNewPost(p => ({ ...p, podName: e.target.value }))} className="bg-slate-800/50 border-slate-700 focus:ring-blue-500" />
  </div>
)}
```

**Why it works:**
- Only shows when user selects COLLAB or LOOKING_FOR post type
- Input value is stored in `newPost.podName` state
- Gets included in the API payload when the form is submitted
- Backend receives the podName and uses it (or falls back to title)

---

## Summary: The Fix Chain
1. **Unknown User Fix** → User details are now fetched and added to every post
2. **Pod Creation Fix** → After post is saved, the pod is created and linked
3. **Room Name Input Fix** → Frontend now sends `podName` to backend

**Testing the fix:**
1. Create a COLLAB post with Room Name: "Test Room"
2. Check backend: Pod should be created with name "Test Room"
3. Check frontend: Author details should now show name, college, year
4. Check linking: `post.linkedPodId` should match the created `pod.id`

---

## Quick Reference: Backend Validation
After pasting, ensure your PostService has this validation:
```java
// ✅ Validate podName is provided for COLLAB posts
if (selectedPostType === 'COLLAB' && !newPost.podName.trim()) {
  alert('Please enter a Pod Name for Collab posts.');
  return;
}
```

All three fixes work together to create the complete post → pod creation pipeline! 🚀

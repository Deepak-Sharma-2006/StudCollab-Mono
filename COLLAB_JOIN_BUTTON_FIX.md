# Collab Post Join Button Fix - Complete

## Issue
Collab posts in InterFeed were not displaying a join button, while Looking For posts were working correctly.

## Root Cause
The `PostController.java` was serializing SocialPost objects to JSON for API responses but was **missing the `linkedPodId` field**. The frontend condition to render the join button was:
```javascript
if (isCollabPost && post.linkedPodId)
```

Without `linkedPodId` in the API response, this condition would always be false for Collab posts, causing them to render as regular DISCUSSION/POLL posts without join buttons.

## Solution
Added `linkedPodId` field serialization to the JSON response in **two locations** in [PostController.java](server/src/main/java/com/studencollabfin/server/controller/PostController.java):

### Location 1: `getAllPosts` method (line 113)
Added the following line after `requiredSkills` serialization:
```java
richPost.put("linkedPodId", social.getLinkedPodId() != null ? social.getLinkedPodId() : "");
```

### Location 2: `convertToRichPosts` helper method (line 471)
Added the same line to ensure `getCampusPosts` and `getInterPosts` endpoints also include the field (both call this helper method):
```java
richPost.put("linkedPodId", social.getLinkedPodId() != null ? social.getLinkedPodId() : "");
```

## Data Flow Verification
✅ **Backend Creation**: PostService.java correctly sets `linkedPodId` when creating Collab posts (lines 160-175)
✅ **Database Storage**: MongoDB stores the `linkedPodId` with the SocialPost document
✅ **API Serialization**: PostController now includes `linkedPodId` in JSON responses
✅ **Frontend Display**: InterFeed.jsx renders the join button when `linkedPodId` is present

## Testing
Verified that API endpoint `/api/posts/inter` now returns:
```json
{
    "type": "COLLAB",
    "linkedPodId": "697b33e1fb00936b71481e0f",
    "title": "bikes",
    ...
}
```

## Files Modified
- [PostController.java](server/src/main/java/com/studencollabfin/server/controller/PostController.java) - Added linkedPodId serialization in 2 locations

## Browser Testing
The application now displays the join button for Collab posts in InterFeed, allowing users to:
1. See the "✓ Join Room" button for Collab posts
2. Click to join the collaboration room
3. Navigate to the room after joining

## Impact
- **No breaking changes**: The field is optional and defaults to empty string for non-Collab posts
- **Backward compatible**: Existing frontend code already had the UI logic in place
- **Consistent behavior**: Collab posts now behave the same as Looking For posts in the UI

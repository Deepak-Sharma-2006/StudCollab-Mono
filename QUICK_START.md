# 🚀 Quick Start Guide - Synergy Dynamic Profiles

## 5-Minute Setup

### Step 1: Ensure Backend is Running

```bash
cd server
mvn spring-boot:run
```

✅ Backend running on `http://localhost:8080`

### Step 2: Ensure Frontend is Running

```bash
cd client
npm run dev
```

✅ Frontend running on `http://localhost:5173`

### Step 3: Login to Application

- Open http://localhost:5173
- Login with your credentials
- You'll get a JWT token stored in localStorage

---

## Testing the Profile System

### Test 1: View Your Profile

1. Click on your profile/avatar
2. Should see your real data from MongoDB:
   - Name, College, Department, Year
   - Skills list
   - Goals/Bio
   - Badges earned
   - XP and Level
   - Endorsement count

### Test 2: Edit Your Profile

1. On your profile, click "✏️ Edit Profile"
2. Update any field:
   - Full Name
   - College
   - Department
   - Year of Study
   - Goals
   - Skills
3. Click "✓ Save Profile"
4. Page should update with live data
5. **Verify**: Check MongoDB Compass to confirm changes are saved

### Test 3: Endorse Another User

1. Find another user's profile
2. Click "🌟 Endorse Skills"
3. Endorsement count should increase by 1
4. **At 3 endorsements**: "Skill Sage" 🧠 badge should appear
5. **Verify**: Check their profile - count should show the endorsement

### Test 4: Badge Unlocking

1. Complete your full profile (all fields)
   - After save → "Profile Pioneer" 👤 badge unlocked
2. Get 3 endorsements
   - After 3rd endorsement → "Skill Sage" 🧠 badge unlocked
3. Check your achievements:
   - Navigate to achievements page (if available)
   - Should see these badges listed

---

## API Testing

### Test Profile Update

```bash
# Get a user ID first, then test update:

curl -X PUT http://localhost:8080/api/users/USER_ID/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "collegeName": "Test College",
    "yearOfStudy": "4th Year",
    "department": "CS",
    "goals": "Test goals",
    "skills": ["React", "Java"],
    "excitingTags": ["AI"],
    "rolesOpenTo": ["Developer"]
  }'
```

### Test Endorsement

```bash
curl -X POST http://localhost:8080/api/users/USER_ID/endorse \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (3rd endorsement)**:

```json
{
  "message": "Endorsement added successfully",
  "endorsementsCount": 3,
  "user": {
    "badges": ["Skill Sage"],
    ...
  }
}
```

---

## Common Issues & Solutions

### Issue: Profile Shows Old Data

**Solution**:

1. Clear browser cache: Ctrl+Shift+Delete
2. Clear localStorage: `localStorage.clear()` in console
3. Hard refresh: Ctrl+F5
4. Restart frontend: `npm run dev`

### Issue: Updates Not Saving

**Solution**:

1. Check browser console for errors (F12)
2. Verify JWT token is valid: `localStorage.getItem('jwt_token')`
3. Check backend logs for database errors
4. Verify MongoDB connection is active

### Issue: Badge Doesn't Unlock

**Solution**:

1. Verify endorsement count actually increased
2. Check that you have 3+ endorsements (not 2)
3. Refresh page to see badge appear
4. Check backend logs for achievement service errors

### Issue: Endpoints Return 404

**Solution**:

1. Verify backend is running on port 8080
2. Check user ID is correct
3. Ensure Authorization header is included
4. Verify JWT token hasn't expired

---

## Monitoring Changes

### Watch MongoDB Updates

1. Open MongoDB Compass
2. Connect to your local MongoDB
3. Navigate to: `studencollabfin > users`
4. Find your user document
5. Watch `endorsementsCount` and `badges` fields update in real-time

### Watch Frontend Updates

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform an action (edit, endorse)
4. See the PUT/POST requests
5. Check response has updated data

### Watch Backend Logs

```bash
# Terminal running backend shows:
# - Request received
# - Database query executed
# - Achievement checked
# - Response sent
```

---

## Feature Walkthrough

### Profile Header Section

```jsx
Displays from MongoDB:
- Profile picture (gradient avatar)
- Full name (editable if own profile)
- College & Department
- Level badge
- XP display
- Endorsement count
```

### Left Column: Academic Status

```jsx
Shows:
- Year of Study (editable if own profile)
```

### Right Column: Bio & Skills

```jsx
Mission & Goals:
- Read-only display of goals
- Edit mode when owner
- Can be any text (dreams, aspirations)

Verified Skills:
- Shows skill array from MongoDB
- Can add/remove if owner
- Shows count of skills

Synergy Badges:
- Displays all earned badges with emoji icons
- Shows count of total badges
- Updates in real-time when earning new badges

Interests & Passions:
- Shows excitingTags array
- Displayed as purple badges
```

### Action Buttons

```jsx
If viewing own profile:
- "✏️ Edit Profile" → Opens edit mode
- After edit → "✓ Save Profile" / "Cancel"

If viewing other profile:
- "🌟 Endorse Skills" → Increments endorsements
- Shows success message with new count
```

---

## Real-Time Data Binding Examples

### Example 1: Name Updates

```jsx
Frontend: {profileOwner.fullName}
MongoDB:  user.fullName = "John Doe"
Update:   PUT /api/users/{id}/profile with new name
Result:   Component re-renders with updated name ✨
```

### Example 2: Skills Array Updates

```jsx
Frontend: {profileOwner.skills?.map(skill => ...)}
MongoDB:  user.skills = ["React", "Node.js", "MongoDB"]
Update:   PUT /api/users/{id}/profile with new skills
Result:   Skills list updates in real-time
```

### Example 3: Endorsement Increment

```jsx
Frontend: {profileOwner.endorsementsCount}
MongoDB:  user.endorsementsCount = 2
Action:   User clicks "Endorse"
API:      POST /api/users/{id}/endorse
MongoDB:  user.endorsementsCount = 3
Trigger:  "Skill Sage" badge added
Result:   Badge appears, count updates ⭐
```

---

## Debugging Tips

### Enable Debug Logging

```jsx
// In ProfilePage.jsx, add console logs:
console.log("Profile Owner:", profileOwner);
console.log("Form Data:", formData);
console.log("Loading:", loading);
console.log("Error:", error);
```

### Check API Response

```jsx
const handleSave = async () => {
  try {
    const res = await api.put(...)
    console.log('Response:', res.data)  // Add this
    // ... rest of code
  } catch (err) {
    console.error('Full Error:', err)   // Add this
  }
}
```

### Monitor Database Changes

```bash
# In MongoDB Compass:
1. Select the user document
2. Watch the endorsementsCount field
3. Make it increase by endorsing
4. See real-time updates
```

---

## Performance Notes

- Profile updates are atomic (all-or-nothing)
- Endorsements increment by 1 per call
- No double-click prevention yet (will endorse multiple times)
- Badge unlocking happens immediately
- Notifications are silent (no WebSocket yet)

---

## Next Features to Build

1. **Activity Feed** - Show recent endorsements received
2. **Notifications** - Real-time badge unlock alerts
3. **Leaderboard** - Rank users by endorsements
4. **Recommendations** - Suggest connections
5. **History** - Track profile changes
6. **Export** - PDF/shareable profile link

---

## Support

**For detailed documentation**, see:

- 📖 [SYNERGY_PROFILE_IMPLEMENTATION.md](SYNERGY_PROFILE_IMPLEMENTATION.md) - Technical details
- 🔗 [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) - API endpoints
- ✅ [IMPLEMENTATION_VERIFICATION_REPORT.md](IMPLEMENTATION_VERIFICATION_REPORT.md) - Verification details

---

## Summary

You now have a **fully functional dynamic profile system** that:

- ✅ Loads real data from MongoDB
- ✅ Allows profile editing
- ✅ Tracks skill endorsements
- ✅ Unlocks badges at milestones
- ✅ Updates in real-time
- ✅ Persists all changes

**Start here**: Visit a profile, click edit, make a change, and see it save to MongoDB! 🎉

---

**Happy Building! 🚀**

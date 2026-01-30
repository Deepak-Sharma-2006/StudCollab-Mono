# Badge System - Quick Testing Guide

## Quick Start - Test Badge Unlocking

### 1. Test Skill Sage Badge (Easiest - 3 endorsements)

**Steps:**

1. Open the app in browser (http://localhost:5173)
2. Create/use two user accounts (User A and User B)
3. Log in as User A
4. Navigate to Campus Hub
5. Click on a user profile (User B)
6. Click "🌟 Endorse" button
7. Repeat steps 5-6 two more times (total 3 endorsements)

**Expected Result:**

- After 1st endorse: BadgeCenter shows Skill Sage with 1/3 progress
- After 2nd endorse: Shows 2/3 progress
- After 3rd endorse: Badge unlocks, shows 3/3, displays "Skill Sage" in earned badges
- ✓ User B should see Skill Sage in their BadgeCenter

---

### 2. Test Pod Pioneer Badge (Join a Pod)

**Steps:**

1. Log in as User A
2. Navigate to Campus Hub
3. Create a new collaboration pod OR find existing pod
4. Click "Join Pod" button
5. Check BadgeCenter

**Expected Result:**

- Pod Pioneer badge shows as unlocked (1/1)
- Badge appears in "Earned Badges" tab
- ✓ Badge immediately visible in BadgeCenter

---

### 3. Test Bridge Builder Badge (Inter-College Collaboration)

**Steps:**

1. Have 2+ users from different colleges
2. User A (from College X) creates a pod
3. User B (from College Y) joins the pod
4. Check User B's BadgeCenter

**Expected Result:**

- User B gets Bridge Builder badge (1/1)
- Badge appears in BadgeCenter as unlocked
- ✓ Both Pod Pioneer and Bridge Builder should be unlocked

---

### 4. Test Founding Dev Badge (Secret Activation)

**Steps:**

1. Log in as any user
2. Go to ProfilePage
3. Look for XP display with ⭐ icon
4. Click the XP counter 5 times rapidly
5. Check badge status

**Expected Result:**

- After 5 clicks: Alert appears "Welcome, Architect!"
- Founding Dev badge unlocks
- Developer mode activated (may enable additional features)
- ✓ Badge visible in BadgeCenter as Legendary tier

---

### 5. Test Campus Catalyst Badge (Admin Grant)

**Steps:**

1. Log in as a Developer (isDev = true)
2. Use API or admin interface to call:
   ```
   POST /api/users/{targetUserId}/grant-catalyst
   Headers:
     X-User-Id: {devUserId}
   ```
3. Check target user's profile

**Expected Result:**

- Campus Catalyst badge awarded
- User role changed to COLLEGE_HEAD
- Badge visible in their BadgeCenter
- ✓ "Create Event" button appears in EventsHub

---

### 6. Test Featured Badges on Public Profile

**Steps:**

1. Earn 3+ badges (follow tests 1-4 above)
2. Go to your profile (full edit mode)
3. Click "Choose Featured" button
4. Select up to 3 badges by clicking them
5. Click "Save Featured Badges"
6. Click "👁️ Public Profile" button
7. Review the public profile view

**Expected Result:**

- Selected badges appear on public profile
- Only featured badges shown (not all earned badges)
- Max 3 badges enforced (alert if try to select 4th)
- ✓ Public profile shows clean "Featured Achievements" section

---

## Database Verification

### Check User Document

```javascript
db.users.findOne({ name: "Test User" })
// Should see:
{
  ...
  badges: ["Pod Pioneer", "Bridge Builder", "Skill Sage"],
  displayedBadges: ["Pod Pioneer", "Skill Sage"],
  endorsementsCount: 3,
  isDev: true,
  ...
}
```

### Check Achievement Documents

```javascript
db.achievements.find({ userId: "..." })
// Should see documents like:
{
  userId: "...",
  title: "Skill Sage",
  type: "SKILL_SAGE",
  unlocked: true,
  unlockedAt: ISODate(...),
  xpValue: 200,
  ...
}
```

### Check CollabPod Document

```javascript
db.collabPods.findOne({ _id: ObjectId("...") })
// Should see:
{
  ...
  memberIds: ["userId1", "userId2"],
  ...
}
```

---

## API Testing with cURL

### Test Endorse Endpoint

```bash
curl -X POST http://localhost:8080/api/users/{userId}/endorse \
  -H "Content-Type: application/json" \
  -H "X-User-Id: {endorserId}"
```

**Expected**: Returns updated User object with endorsementsCount incremented

### Test Display Badges Endpoint

```bash
curl -X POST http://localhost:8080/api/users/{userId}/displayed-badges \
  -H "Content-Type: application/json" \
  -d '{
    "badges": ["Skill Sage", "Pod Pioneer", "Bridge Builder"]
  }'
```

**Expected**: Returns updated User object with displayedBadges set

### Test Pod Join Endpoint

```bash
curl -X POST http://localhost:8080/pods/{podId}/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{userId}"
  }'
```

**Expected**: Returns User object with Pod Pioneer badge unlocked

### Test Get User with Badges

```bash
curl -X GET http://localhost:8080/api/users/{userId} \
  -H "Content-Type: application/json"
```

**Expected**: Returns complete User object including badges and displayedBadges arrays

---

## Frontend Console Debugging

### Check User Object

```javascript
// In browser console
console.log(JSON.stringify(user, null, 2));
// Should show badges, displayedBadges, endorsementsCount
```

### Check Badge Unlock Status

```javascript
// Check if badge is unlocked
const hasBadge = user.badges.includes("Pod Pioneer");
console.log(hasBadge); // true/false
```

### Check Featured Badges

```javascript
// See featured badges
console.log(user.displayedBadges);
// Expected: ["Badge1", "Badge2", "Badge3"] or []
```

### Trigger Debug Mode

```javascript
// Enable detailed logging
localStorage.setItem("debug_badges", "true");
```

---

## Troubleshooting

### Badge Not Unlocking After Endorsement

- [ ] Check browser console for errors
- [ ] Verify API endpoint returns 200
- [ ] Check database - is endorsementsCount incremented?
- [ ] Refresh page - might need cache clear
- [ ] Check if user.badges array exists in database

### Featured Badges Not Saving

- [ ] Verify POST endpoint is called (check Network tab)
- [ ] Check request body has correct format: `{ "badges": [...] }`
- [ ] Verify response shows displayedBadges array updated
- [ ] Check database displayedBadges field populated
- [ ] Clear localStorage and refresh

### Pod Pioneer Not Unlocking

- [ ] Verify pod exists in database
- [ ] Confirm user has correct userId format
- [ ] Check if memberIds array is being populated
- [ ] Look for errors in server logs
- [ ] Try manual endpoint test with cURL

### Bridge Builder Not Unlocking

- [ ] Verify pod has memberIds with multiple users
- [ ] Check if college names match in User documents
- [ ] Confirm colleges are different (not null/empty)
- [ ] Try joining pod created by different college user
- [ ] Check server logs for hasMultipleCollegges logic

---

## Performance Testing

### Load Test: Multiple Badge Unlocks

```
1. Create 5+ users
2. Have each join same pod
3. Verify Pod Pioneer unlocks for all
4. Check response times
```

### Data Test: Large Badge Collection

```
1. Award 20+ badges to single user
2. Load BadgeCenter
3. Test public profile with 3 featured
4. Verify UI performance
```

---

## Sign-Off Checklist

- [ ] All 6 badges unlock correctly
- [ ] Endorsement system works (3 endorsements = Skill Sage)
- [ ] Pod joining triggers Pod Pioneer
- [ ] Inter-college pods trigger Bridge Builder
- [ ] Featured badges save and display correctly
- [ ] Public profile shows only featured badges
- [ ] Progress bars update in real-time
- [ ] No console errors
- [ ] Mobile responsive (test on different screen sizes)
- [ ] API endpoints all respond with correct status codes

---

**Last Updated**: January 30, 2026
**Test Environment**: Local development
**Database**: MongoDB (development)
**Frontend**: React + Vite
**Backend**: Spring Boot + Maven

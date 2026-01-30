# Quick Test Guide - Founding Dev Badge & Badge Features

## ⚡ 30-Second Test

### Step 1: Set isDev to True
```
Database Command:
db.users.updateOne(
  { _id: ObjectId("your-user-id") },
  { $set: { isDev: true } }
)
```

### Step 2: Refresh App
- Logout and login again
- OR just refresh the page
- Check BadgeCenter - "Founding Dev" 💻 should appear as **unlocked**

### Step 3: Check Public Profile
1. Click "👁️ Public Profile" button
2. See "Featured Achievements" section (empty by default)

### Step 4: Feature the Badge
1. Click "← Back to Full Profile"
2. In full profile, scroll to achievements
3. Click "✏️ Choose Featured"
4. Click "Founding Dev" badge to select it
5. Click "✓ Save Featured Badges"
6. Click "👁️ Public Profile" again
7. **See "Founding Dev" in Featured Achievements** ✓

---

## 🎯 Complete Test Sequence

### Test A: Founding Dev Badge
```
1. Set isDev = true in database
2. Refresh page
3. ✓ Badge appears in BadgeCenter
4. ✓ Badge shows as unlocked (not greyed out)
5. ✓ Can select and feature on profile
```

### Test B: Campus Catalyst Badge
```
1. Set role = "COLLEGE_HEAD" in database
2. Refresh page
3. ✓ Campus Catalyst appears in BadgeCenter
4. ✓ Badge shows as unlocked
5. ✓ Can select and feature on profile
```

### Test C: Featured Badges Display
```
1. Have at least 3 badges unlocked
2. Click "Choose Featured" in profile
3. Select exactly 3 badges
4. Click "Save"
5. View public profile
6. ✓ See all 3 featured badges in "Featured Achievements"
7. ✓ No other badges shown (only 3)
8. ✓ Back to full profile shows ALL badges
```

### Test D: Max 3 Badge Limit
```
1. In badge selector
2. Select 3 badges
3. Try to click a 4th badge
4. ✓ Alert appears: "You can only display 3 badges"
5. ✓ 4th badge not selected
```

---

## 🔍 What to Check

### In BadgeCenter
- [ ] Founding Dev shows as **Legendary** (💻)
- [ ] Campus Catalyst shows as **Epic** (📢)
- [ ] Badges marked as "unlocked" (not greyed out)
- [ ] Progress bars show correctly
- [ ] Can switch between tabs (All, Earned, Evolving)

### In Full Profile
- [ ] "Unlocked Achievements" section visible
- [ ] "✏️ Choose Featured" button appears (on own profile)
- [ ] All earned badges display in grid

### In Public Profile
- [ ] "Featured Achievements" section visible
- [ ] Only selected badges display (max 3)
- [ ] Badge icons and names show correctly
- [ ] Hover effects work
- [ ] Fallback message shows if no badges featured

### In Badge Selector
- [ ] Click to toggle selection
- [ ] Visual feedback (border, scale) on selected badges
- [ ] Checkmark appears on selected badges
- [ ] Cancel button resets selection
- [ ] Save button persists changes

---

## 🐛 Troubleshooting

### Badge Not Appearing After Setting isDev = true
**Solution**:
1. Refresh page (hard refresh: Ctrl+F5)
2. Logout and login again
3. Check database - is isDev actually true?
4. Check browser console for errors

### Featured Badges Not Saving
**Solution**:
1. Check Network tab - POST request should succeed (200)
2. Check browser console for errors
3. Verify you have 3 badges selected (not more)
4. Try clearing browser cache
5. Check database - is displayedBadges array updated?

### Badges Not Showing on Public Profile
**Solution**:
1. Make sure displayedBadges array is not empty in database
2. Check that you own the badges you're trying to display
3. Refresh public profile view
4. Check if badges array has any badges first

### UI Looks Broken
**Solution**:
1. Check browser console for JavaScript errors
2. Try different browser (Chrome/Firefox/Safari)
3. Clear browser cache and hard refresh
4. Zoom reset (Ctrl+0)

---

## ✅ Success Criteria

**All tests pass when:**

- [ ] isDev=true → Founding Dev badge unlocks immediately ✓
- [ ] role=COLLEGE_HEAD → Campus Catalyst badge unlocks immediately ✓
- [ ] User can select up to 3 badges ✓
- [ ] Featured badges display on public profile ✓
- [ ] Full profile shows all earned badges ✓
- [ ] Max 3 badge limit enforced ✓
- [ ] No console errors ✓
- [ ] Responsive on mobile ✓
- [ ] Data persists after refresh ✓

---

## 📊 API Test with cURL

### Test: Get User with Founding Dev Badge
```bash
curl -X GET http://localhost:8080/api/users/{userId} \
  -H "Content-Type: application/json"

# Response should include:
# "isDev": true
# "badges": ["Founding Dev", ...]
```

### Test: Set Featured Badges
```bash
curl -X POST http://localhost:8080/api/users/{userId}/displayed-badges \
  -H "Content-Type: application/json" \
  -d '{
    "badges": ["Founding Dev", "Pod Pioneer", "Skill Sage"]
  }'

# Response should include:
# "displayedBadges": ["Founding Dev", "Pod Pioneer", "Skill Sage"]
```

---

## 📱 Mobile Testing

Test on mobile devices or responsive view:
- [ ] Badge selector displays properly
- [ ] Grid adjusts for screen size
- [ ] Buttons are clickable
- [ ] Hover effects don't interfere
- [ ] Text is readable

---

## 🎬 Demo Flow

1. **Setup**: Set `isDev = true` in database
2. **Show**: Refresh page, show Founding Dev badge
3. **Feature**: Go to profile, select badge to feature
4. **Display**: View public profile with featured badge
5. **Prove**: Switch back/forth to show all vs featured

---

**Total Test Time**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to test ✅

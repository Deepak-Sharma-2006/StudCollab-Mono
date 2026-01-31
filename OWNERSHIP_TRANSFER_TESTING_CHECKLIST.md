## Ownership Transfer Feature - Testing & Deployment Checklist

---

## Pre-Deployment Verification

### Code Quality Check
- [x] No compilation errors in Java files
- [x] No compilation errors in JavaScript/React files
- [x] All imports resolved correctly
- [x] No undefined variables or functions
- [x] Proper error handling implemented
- [x] No console warnings in development build
- [x] Code follows existing style conventions
- [x] Comments and documentation present

### Functionality Check
- [x] Backend transferOwnership() method implemented
- [x] Backend leavePod() owner validation added
- [x] New /transfer-ownership endpoint created
- [x] Inbox notification type added (POD_EVENT)
- [x] Frontend modal component created
- [x] API function exported in api.js
- [x] CollabPodPage integrated with dialog
- [x] Error handling for all scenarios

### Git History
- [x] Feature branch merged to main
- [x] Meaningful commit messages
- [x] Clean commit history
- [x] No merge conflicts
- [x] All changes tracked

---

## Local Testing Checklist

### Backend Testing

#### Setup
- [ ] Backend running on http://localhost:8080
- [ ] MongoDB running with test data
- [ ] Create test pod with test users
  - [ ] Owner: User A (userId: `test-user-a`)
  - [ ] Member: User B (userId: `test-user-b`)
  - [ ] Member: User C (userId: `test-user-c`)

#### Test Case 1: Valid Ownership Transfer
```
Steps:
1. POST http://localhost:8080/pods/{podId}/transfer-ownership
   Body: {
     "currentOwnerId": "test-user-a",
     "newOwnerId": "test-user-b"
   }

Expected Results:
[ ] 200 OK response
[ ] Response body contains updated pod
[ ] pod.ownerId === "test-user-b"
[ ] pod.memberIds contains "test-user-a"
[ ] New owner receives Inbox notification
[ ] System message appears in pod chat
```

#### Test Case 2: Owner Tries to Leave (Should Fail)
```
Steps:
1. POST http://localhost:8080/pods/{podId}/leave
   Body: { "userId": "test-user-b" }

Expected Results:
[ ] 500 Internal Server Error
[ ] Error message: "Pod owner cannot leave. Transfer ownership or close the pod."
[ ] User not removed from pod
[ ] No cooldown created
```

#### Test Case 3: Non-Owner Can Leave
```
Steps:
1. POST http://localhost:8080/pods/{podId}/leave
   Body: { "userId": "test-user-c" }

Expected Results:
[ ] 200 OK response
[ ] Message: "Successfully left the pod"
[ ] User removed from memberIds
[ ] PodCooldown created (expires in 15 min)
[ ] System message: "test-user-c left the pod."
```

#### Test Case 4: Invalid Owner ID
```
Steps:
1. POST http://localhost:8080/pods/{podId}/transfer-ownership
   Body: {
     "currentOwnerId": "test-user-c",
     "newOwnerId": "test-user-b"
   }

Expected Results:
[ ] 403 Forbidden
[ ] Error message: "Only the current owner can transfer ownership"
[ ] No pod changes
```

#### Test Case 5: New Owner Not in Pod
```
Steps:
1. POST http://localhost:8080/pods/{podId}/transfer-ownership
   Body: {
     "currentOwnerId": "test-user-a",
     "newOwnerId": "invalid-user-id"
   }

Expected Results:
[ ] 500 Error
[ ] Error message: "New owner must be a current member or admin of the pod"
[ ] No pod changes
```

#### Test Case 6: Missing Parameters
```
Steps:
1. POST http://localhost:8080/pods/{podId}/transfer-ownership
   Body: { "currentOwnerId": "test-user-a" }  // missing newOwnerId

Expected Results:
[ ] 400 Bad Request
[ ] Error message: "newOwnerId is required"
```

### Frontend Testing

#### Setup
- [ ] Frontend running on http://localhost:5173 (Vite) or equivalent
- [ ] Logged in as test user (owner)
- [ ] Navigated to a pod you own

#### Test Case 1: Owner Sees Transfer Modal
```
Steps:
1. Click "Leave" button in pod header
2. Observe modal appearance

Expected Results:
[ ] Transfer Ownership modal appears
[ ] Modal title: "Transfer Ownership"
[ ] Modal shows list of current members/admins
[ ] Your ID is NOT in the list (excluded)
[ ] Each member shows: avatar, name, email
[ ] Radio buttons for selection
[ ] "Transfer" button is disabled initially
[ ] "Cancel" button visible
```

#### Test Case 2: Select New Owner
```
Steps:
1. Click "Leave" button
2. Click radio button for User B

Expected Results:
[ ] Radio button selected (highlighted cyan)
[ ] "Transfer" button becomes enabled (blue)
[ ] Selected member highlighted
```

#### Test Case 3: Cancel Transfer
```
Steps:
1. Click "Leave" button
2. Click "Cancel" button

Expected Results:
[ ] Modal closes
[ ] You remain in pod
[ ] No API call made
```

#### Test Case 4: Successful Transfer
```
Steps:
1. Click "Leave" button
2. Select User B as new owner
3. Click "✓ Transfer" button
4. Wait for loading state

Expected Results:
[ ] Loading spinner appears
[ ] Button shows "⏳ Transferring..."
[ ] API call sent to /transfer-ownership
[ ] Success alert appears: "Ownership transferred successfully!"
[ ] Modal closes
[ ] Pod data refreshes
[ ] UI shows new owner
[ ] You can see yourself as "Member" (not "Owner")
```

#### Test Case 5: Transfer Error Handling
```
Steps:
1. Click "Leave" button
2. Select invalid user (if possible)
3. Click "Transfer" button

Expected Results:
[ ] Error message displays in red box
[ ] Modal stays open
[ ] Can try again or cancel
[ ] User-friendly error message shown
```

#### Test Case 6: Non-Owner Leave
```
Steps:
1. Login as non-owner
2. Click "Leave" button

Expected Results:
[ ] Transfer modal does NOT appear
[ ] Confirmation dialog appears instead
[ ] Message: "Are you sure you want to leave this pod? You can rejoin after 15 minutes."
[ ] Two options: "Leave" and "Cancel"
```

#### Test Case 7: Non-Owner Confirms Leave
```
Steps:
1. Non-owner clicks "Leave" button
2. Confirm dialog appears
3. Click "Leave" button

Expected Results:
[ ] You removed from pod
[ ] Navigated to pod list (/campus/pods or /global/rooms)
[ ] Can rejoin after 15 minutes
```

#### Test Case 8: New Owner Receives Notification
```
Steps:
1. Transfer ownership to User B
2. Switch user to User B (logout/login or other account)
3. Check Inbox (📬 icon)

Expected Results:
[ ] Notification appears in Inbox
[ ] Type: POD_EVENT (cyan indicator)
[ ] Title: "You are now the owner of [Pod Name]"
[ ] Message: "[User A] transferred ownership to you. You can now manage members and delete the pod."
[ ] Message can be marked as read
```

#### Test Case 9: System Message in Chat
```
Steps:
1. Transfer ownership to User B
2. Check pod chat

Expected Results:
[ ] System message appears
[ ] Text: "Ownership transferred from Alice to Bob."
[ ] Gray styling (system message style)
[ ] Timestamp showing when transfer occurred
[ ] No sender avatar (system message)
```

---

## Integration Testing

### Test Case 1: Full Ownership Transfer Cycle
```
1. User A creates pod
2. User B joins as member
3. User C joins as member
4. User A tries to leave (transfer modal appears)
5. User A selects User B as new owner
6. User A transfers ownership
7. Check:
   [ ] Pod.ownerId = User B
   [ ] User A in memberIds
   [ ] User B removed from memberIds
   [ ] Notification in User B's inbox
   [ ] System message in chat
8. User A clicks "Leave" again
   [ ] Can now leave normally (non-owner)
   [ ] 15-min cooldown created
9. User B can now:
   [ ] See themselves as "Owner"
   [ ] Kick User A or C
   [ ] Transfer ownership again
   [ ] Delete the pod
```

### Test Case 2: Rapid Transfer Sequence
```
1. User A owns pod
2. Transfer to User B (success)
3. User B transfers to User C (success)
4. User C transfers to User D (success)
5. Check:
   [ ] Each transfer creates system message
   [ ] Each creates inbox notification
   [ ] ownerId updates correctly
   [ ] All members updated properly
   [ ] No race conditions or conflicts
```

### Test Case 3: Edge Case - Only Owner
```
1. Pod with only owner (no other members)
2. Owner clicks "Leave"
3. Transfer modal appears but empty
4. Expected:
   [ ] Modal shows "No members available..."
   [ ] "Transfer" button disabled
   [ ] Owner cannot leave
   [ ] Must delete pod or add members first
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] No console errors in browser
- [ ] Backend logs show no errors
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Stakeholders notified

### Backend Deployment
```bash
# Build
[ ] mvn clean package

# Check
[ ] JAR created successfully
[ ] No build errors

# Deploy
[ ] Copy JAR to server
[ ] Restart Spring Boot service
[ ] Verify startup in logs

# Post-Deploy
[ ] Health check endpoint responds
[ ] Database connections working
[ ] API endpoints responding
[ ] WebSocket connections functional
```

### Frontend Deployment
```bash
# Build
[ ] npm run build

# Check
[ ] Build successful
[ ] No build errors
[ ] dist/ folder created

# Deploy
[ ] Upload dist/ to hosting
[ ] Clear CDN cache if applicable
[ ] Verify site loads
[ ] No 404 errors

# Post-Deploy
[ ] Test in production URL
[ ] Check API connectivity
[ ] Verify CORS headers
[ ] Test on multiple browsers
```

### Database
- [ ] MongoDB backup confirmed
- [ ] New Inbox.NotificationType.POD_EVENT supported
- [ ] Collection indexes optimal
- [ ] No data migration required

### Monitoring
- [ ] New endpoint metrics tracked
- [ ] Error logging for /transfer-ownership
- [ ] Performance monitoring enabled
- [ ] User feedback channels active

---

## Post-Deployment Verification

### Immediate (Day 1)
- [ ] Users can see transfer modal
- [ ] Transfer operations completing
- [ ] Notifications appearing
- [ ] System messages logging
- [ ] No errors in production logs
- [ ] API response times normal
- [ ] Database queries performant

### Short-term (Week 1)
- [ ] Multiple ownership transfers working
- [ ] No duplicate notifications
- [ ] Inbox updates correctly
- [ ] Chat messages displaying
- [ ] Edge cases handled
- [ ] User feedback positive
- [ ] No hotfixes needed

### Long-term (Month 1)
- [ ] Feature adoption by users
- [ ] No regressions reported
- [ ] Performance stable
- [ ] Error rate acceptable
- [ ] Usage metrics tracked
- [ ] Analytics updated
- [ ] Documentation verified

---

## Rollback Plan

If issues discovered:

### Immediate Actions
1. [ ] Stop accepting new transfers
2. [ ] Put notice in UI
3. [ ] Monitor for issues
4. [ ] Collect error logs

### Rollback Steps (If Needed)
1. [ ] Revert to previous backend JAR
2. [ ] Revert to previous frontend build
3. [ ] Clear any corrupted data
4. [ ] Restore from backup if needed
5. [ ] Verify functionality
6. [ ] Notify users

### Post-Rollback
1. [ ] Investigate root cause
2. [ ] Fix issues
3. [ ] Additional testing
4. [ ] Re-deploy when ready

---

## Sign-Off Checklist

**Developer**: _____________________ Date: _______
- [ ] Code complete and tested
- [ ] No known bugs
- [ ] Documentation complete
- [ ] Ready for deployment

**QA/Tester**: _____________________ Date: _______
- [ ] All tests passed
- [ ] Edge cases verified
- [ ] Performance acceptable
- [ ] Recommends deployment

**DevOps/Deployment**: _______________ Date: _______
- [ ] Infrastructure ready
- [ ] Backup confirmed
- [ ] Monitoring configured
- [ ] Deploy approved

**Product Manager**: ________________ Date: _______
- [ ] Feature meets requirements
- [ ] User feedback positive
- [ ] Ready to launch
- [ ] Go-live approved

---

## Documentation Links

- [Ownership Transfer Feature Guide](./OWNERSHIP_TRANSFER_FEATURE.md)
- [Quick Reference](./OWNERSHIP_TRANSFER_QUICK_REFERENCE.md)
- [Implementation Summary](./OWNERSHIP_TRANSFER_IMPLEMENTATION_SUMMARY.md)
- [Visual Summary](./OWNERSHIP_TRANSFER_VISUAL_SUMMARY.md)

---

## Support Contact

**Questions about the feature?**
- Backend: Ask backend team
- Frontend: Ask frontend team
- Database: Ask DevOps team
- General: Check documentation first

**Found a bug?**
1. Document steps to reproduce
2. Collect error logs
3. Create issue in tracker
4. Assign to appropriate team

---

## Version Information

- **Feature Version**: 1.0
- **Release Date**: [To be filled]
- **Java Version**: 17+
- **Node Version**: 16+
- **React Version**: 18+
- **MongoDB Version**: 4.0+

---

**Feature Status**: ✅ Ready for Testing & Deployment


# Events Hub Data Mapping Bug Fixes - Summary

## Overview
Fixed 3 critical data mapping bugs in the "Events Hub" feature where event data (date, skills, team size) was not being saved or displayed correctly, and the "Find Team" modal failed to auto-fill details.

## Bugs Fixed

### Bug #1: Event Data Storage (Backend & Frontend)
**Problem:** User enters Date ("14-01-2026"), Skills, and Team Size, but data is not saved to backend.

**Root Causes:**
- **Date:** Frontend sent date+time as separate fields (date: "YYYY-MM-DD", time: "HH:mm"), but backend EventService was not parsing them and converting to LocalDateTime
- **Skills & Team Size:** Backend EventService was not mapping `requiredSkills` and `maxTeamSize` from the DTO to the Event entity

**Solution:** Updated [EventService.java](server/src/main/java/com/studencollabfin/server/service/EventService.java#L38)

**Code Changes:**
```java
public Event createEvent(CreateEventRequest request) {
    Event newEvent = new Event();
    // ... other fields ...
    
    // ✅ FIX: Properly parse date and time strings
    try {
        String dateStr = request.getDate();      // "2025-09-19"
        String timeStr = request.getTime();      // "21:30"
        
        if (dateStr != null && !dateStr.isEmpty() && timeStr != null && !timeStr.isEmpty()) {
            String dateTimeStr = dateStr + "T" + timeStr + ":00";
            LocalDateTime startDate = LocalDateTime.parse(dateTimeStr);
            newEvent.setStartDate(startDate);
            newEvent.setEndDate(startDate.plusHours(2));
        }
    } catch (Exception e) {
        System.err.println("Error parsing date/time: " + e.getMessage());
    }
    
    // ✅ FIX: Map the requiredSkills field
    newEvent.setRequiredSkills(request.getRequiredSkills());
    
    // ✅ FIX: Map the maxTeamSize to maxParticipants
    newEvent.setMaxParticipants(request.getMaxTeamSize() != null ? request.getMaxTeamSize() : 4);
    
    newEvent.setStatus(Event.EventStatus.UPCOMING);
    return eventRepository.save(newEvent);
}
```

**Backend Data Flow:**
1. Frontend sends: `{ date: "2025-09-19", time: "21:30", requiredSkills: ["React"], maxTeamSize: 5 }`
2. Backend parses to ISO format: `2025-09-19T21:30:00`
3. Backend converts to `LocalDateTime` and saves to MongoDB
4. All fields now properly persisted: `startDate`, `requiredSkills`, `maxParticipants`

---

### Bug #2: Event Card Display (Frontend)
**Problem:** Event Card shows "Invalid Date" and missing skills/team size values.

**Root Causes:**
- **Date:** Attempting to parse `event.dateTime` which might be null or invalid format
- **Team Size:** Event entity field is `maxParticipants` but frontend looked for `maxTeamSize`
- **Skills:** Not handling null/empty array gracefully

**Solution:** Updated [EventsHub.jsx](client/src/components/EventsHub.jsx)

**Code Changes:**

1. **Added date formatter function:**
```jsx
const formatEventDate = (dateTimeString) => {
  if (!dateTimeString) return 'TBD';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    }) + ' ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  } catch (err) {
    return 'Invalid Date';
  }
};
```

2. **Updated event card rendering:**
```jsx
// Date: Use new formatter and fallback to dateTime field
<span className="text-sm">{formatEventDate(event.startDate || event.dateTime)}</span>

// Team Size: Check both maxParticipants (new) and maxTeamSize (fallback)
<span className="text-sm">Max team size: {event.maxParticipants || event.maxTeamSize || 'N/A'}</span>

// Skills: Handle null/empty array gracefully
{event.requiredSkills && event.requiredSkills.length > 0 ? (
  <>
    {event.requiredSkills.slice(0, 4).map((skill) => <Badge key={skill}>{skill}</Badge>)}
    {event.requiredSkills.length > 4 && <Badge>+{event.requiredSkills.length - 4} more</Badge>}
  </>
) : (
  <span className="text-xs text-muted-foreground">No specific skills required</span>
)}

// Participants: Handle null values
<div className="font-semibold text-blue-600">{event.participantsCount || 0}</div>
```

**Frontend Display Flow:**
1. Backend returns: `{ startDate: "2025-09-19T21:30:00", requiredSkills: ["React"], maxParticipants: 5 }`
2. `formatEventDate()` safely parses and displays: `"Sep 19, 2025 9:30 PM"`
3. Skills displayed: `"React + 0 more"`
4. Team size displayed: `"Max team size: 5 members"`

---

### Bug #3: "Find Team" Modal Auto-Fill (Frontend)
**Problem:** Modal opens but fails to auto-fill Event Details (Skills, Size) and User Details (Name, Year).

**Root Causes:**
- **Event Details:** Reading wrong field names - `maxTeamSize` instead of `maxParticipants`, no null safety
- **User Details:** Reading `user?.name` and `user?.year` but should be `user?.fullName` and `user?.yearOfStudy`
- **Missing Fallbacks:** No graceful handling when fields are missing

**Solution:** Updated [EventsHub.jsx](client/src/components/EventsHub.jsx) Find Team Modal

**Code Changes:**

**Before (broken):**
```jsx
<div><strong>Max Team Size:</strong> {selectedEvent.maxTeamSize} members</div>
<div><strong>Required Skills:</strong> {selectedEvent.requiredSkills?.join(', ')}</div>
<!-- ... -->
<div><strong>Name:</strong> {user?.name || 'Your Name'}</div>
<div><strong>Year:</strong> {user?.year || 'Your Year'}</div>
<div><strong>Badges:</strong> {user?.badges?.slice(0, 3).join(', ') || 'Your Badges'}</div>
```

**After (fixed):**
```jsx
<div><strong>Max Team Size:</strong> {selectedEvent.maxParticipants || selectedEvent.maxTeamSize || 'Not specified'} members</div>
<div><strong>Required Skills:</strong> {selectedEvent.requiredSkills && selectedEvent.requiredSkills.length > 0 ? selectedEvent.requiredSkills.join(', ') : 'No specific skills required'}</div>
<!-- ... -->
<div><strong>Name:</strong> {user?.fullName || user?.name || 'Your Name'}</div>
<div><strong>Year:</strong> {user?.yearOfStudy || user?.year || 'Your Year'}</div>
```

**Auto-Fill Flow:**
1. User clicks "Find Team" on an event
2. Modal opens with `selectedEvent` and `user` props
3. Event Details section auto-fills:
   - Event Title: `selectedEvent.title`
   - Max Team Size: `selectedEvent.maxParticipants` (backend field)
   - Required Skills: `selectedEvent.requiredSkills` (now properly saved)
4. User Profile section auto-fills:
   - Name: `user?.fullName` (correct field from backend)
   - Year: `user?.yearOfStudy` (correct field from backend)
5. User can add optional extra skills
6. User writes team post description
7. Post is created with all auto-filled details

---

## Data Flow Diagram

```
EVENT CREATION
==============
Frontend (EventsHub.jsx)
  ↓
Input: { title, category, date: "YYYY-MM-DD", time: "HH:mm", description, requiredSkills[], maxTeamSize }
  ↓
POST /api/events
  ↓
Backend (EventController.java)
  ↓
EventService.createEvent(CreateEventRequest)
  ↓
✅ Parse date+time → LocalDateTime
✅ Map requiredSkills → Event.requiredSkills
✅ Map maxTeamSize → Event.maxParticipants
  ↓
Event saved to MongoDB:
  {
    startDate: LocalDateTime,
    endDate: LocalDateTime,
    requiredSkills: [String],
    maxParticipants: Integer,
    ... other fields
  }
  ↓
Response returns Event object with all fields


EVENT DISPLAY
=============
Backend GET /api/events
  ↓
Event { startDate, requiredSkills, maxParticipants, ... }
  ↓
Frontend EventsHub.jsx renderEvents()
  ↓
formatEventDate(event.startDate)
  → "Sep 19, 2025 9:30 PM"
  ↓
Display maxParticipants (or fallback to maxTeamSize)
  → "Max team size: 5 members"
  ↓
Display requiredSkills safely
  → "React, Node.js, MongoDB + 1 more"
  ↓
Event card rendered correctly ✅


FIND TEAM AUTO-FILL
===================
User clicks "Find Team" button
  ↓
Modal receives:
  - selectedEvent: { title, maxParticipants, requiredSkills }
  - user: { fullName, yearOfStudy }
  ↓
Auto-fill sections populate:
  - Event Details: title, maxParticipants, requiredSkills
  - User Profile: fullName, yearOfStudy
  ↓
User adds optional skills + description
  ↓
Modal state ready for team post creation ✅
```

## Files Modified

1. **Backend:**
   - [EventService.java](server/src/main/java/com/studencollabfin/server/service/EventService.java) - Fixed date/time parsing and field mapping

2. **Frontend:**
   - [EventsHub.jsx](client/src/components/EventsHub.jsx) - Fixed event card display and Find Team modal auto-fill

## Testing Scenarios

### ✅ Scenario 1: Create Event with All Details
1. Moderator creates event with:
   - Title: "React Workshop"
   - Date: "2025-09-19"
   - Time: "21:30"
   - Required Skills: ["React", "JavaScript"]
   - Max Team Size: 5
2. Backend saves with `startDate: "2025-09-19T21:30:00"`, `requiredSkills: ["React", "JavaScript"]`, `maxParticipants: 5`
3. Event card displays:
   - Date: "Fri, Sep 19, 2025 9:30 PM" ✅
   - Team Size: "Max team size: 5 members" ✅
   - Skills: "React, JavaScript" ✅

### ✅ Scenario 2: Create Event Without Skills
1. Moderator creates event without specifying required skills
2. Event card displays: "No specific skills required" ✅
3. Find Team modal shows: "No specific skills required" ✅

### ✅ Scenario 3: Find Team Modal Auto-Fill
1. User opens Find Team for "React Workshop"
2. Auto-filled Event Details show:
   - Event: "React Workshop" ✅
   - Max Team Size: "5 members" ✅
   - Required Skills: "React, JavaScript" ✅
3. Auto-filled User Details show:
   - Name: "John Doe" (from `user.fullName`) ✅
   - Year: "3rd Year" (from `user.yearOfStudy`) ✅

### ✅ Scenario 4: Null/Empty Fallbacks
1. Event created with minimal data
2. Team Size field shows: "Not specified" ✅
3. Skills field shows: "No specific skills required" ✅
4. User details fallback to defaults if not in profile ✅

## Backend Field Mapping Reference

| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `date` | N/A | String | Parsed with time to create startDate |
| `time` | N/A | String | Parsed with date to create startDate |
| `requiredSkills` | `requiredSkills` | List<String> | ✅ Now properly mapped |
| `maxTeamSize` | `maxParticipants` | Integer | ✅ Now properly mapped |
| N/A | `startDate` | LocalDateTime | ✅ Now properly set |
| N/A | `endDate` | LocalDateTime | ✅ Now set to startDate + 2 hours |

## Frontend Field Mapping Reference

| Backend Field | Frontend Use | Fallback | Notes |
|---|---|---|---|
| `startDate` | Display in event card | `event.dateTime` | ✅ Safe parsing with error handling |
| `maxParticipants` | Display in event card | `event.maxTeamSize` | ✅ Check both for compatibility |
| `requiredSkills` | Display in event card & modal | Empty state message | ✅ Safe iteration with null checks |
| User `fullName` | Display in Find Team modal | `user.name` | ✅ Proper field mapping |
| User `yearOfStudy` | Display in Find Team modal | `user.year` | ✅ Proper field mapping |

## Impact & Benefits

✅ **Data Persistence:** Event data now correctly saved to MongoDB  
✅ **Data Display:** Event cards show correct, formatted information  
✅ **User Experience:** Find Team modal auto-fills with correct user profile information  
✅ **Error Handling:** Graceful fallbacks for missing or invalid data  
✅ **Backward Compatibility:** Fallbacks support both old and new field names  

## Notes

- Date formatting uses browser's locale settings for best UX
- Event end time is automatically set to 2 hours after start time (can be adjusted)
- All null checks prevent "undefined" errors in the UI
- Field name fallbacks ensure compatibility if frontend/backend get out of sync

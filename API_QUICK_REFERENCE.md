# Synergy Platform - API Quick Reference

## Base URL

```
http://localhost:8080/api
```

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Profile Management

### 1. Get User Profile

```
GET /users/{userId}

Response (200 OK):
{
  "id": "user123",
  "fullName": "John Doe",
  "email": "john@college.edu",
  "collegeName": "SINHGAD",
  "yearOfStudy": "3rd Year",
  "department": "Computer Science",
  "skills": ["React", "Node.js", "MongoDB"],
  "excitingTags": ["AI/ML", "Social Impact"],
  "goals": "Build innovative solutions...",
  "rolesOpenTo": ["Full Stack Developer"],
  "badges": ["Skill Sage", "Profile Pioneer"],
  "level": 3,
  "xp": 245,
  "totalXP": 300,
  "endorsementsCount": 5,
  "role": "STUDENT",
  "isDev": false,
  "profileCompleted": true
}
```

---

### 2. Update Profile (NEW ✨)

```
PUT /users/{userId}/profile
Content-Type: application/json

Request Body:
{
  "fullName": "Updated Name",
  "collegeName": "MIT",
  "yearOfStudy": "4th Year",
  "department": "Computer Science",
  "goals": "Become a full-stack engineer specializing in distributed systems",
  "skills": ["Java", "Python", "Go", "Rust"],
  "excitingTags": ["Distributed Systems", "DevOps", "Cloud Architecture"],
  "rolesOpenTo": ["Backend Engineer", "DevOps Engineer", "Tech Lead"]
}

Response (200 OK):
{
  "id": "user123",
  "fullName": "Updated Name",
  "collegeName": "MIT",
  ... [all updated fields]
}

Errors:
- 404 Not Found: User ID doesn't exist
- 500 Internal Server Error: Database or processing error
```

**Frontend Integration**:

```jsx
const handleSave = async () => {
  try {
    const res = await api.put(
      `/api/users/${profileOwner.id}/profile`,
      formData,
    );
    // res.data contains updated user
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Update failed: " + err.response?.data?.error);
  }
};
```

---

### 3. Endorse User Skill (NEW ✨)

```
POST /users/{userId}/endorse
Authorization: Bearer TOKEN

Request Body: {} (empty)

Response (200 OK):
{
  "message": "Endorsement added successfully",
  "endorsementsCount": 3,
  "user": {
    "id": "user456",
    "fullName": "Jane Doe",
    "endorsementsCount": 3,
    "badges": ["Skill Sage", "Profile Pioneer"],  // NEW: Skill Sage added!
    ... [full user object]
  }
}

Errors:
- 404 Not Found: User to endorse doesn't exist
- 500 Internal Server Error: Database error
```

**Frontend Integration**:

```jsx
const handleEndorse = async () => {
  try {
    const res = await api.post(`/api/users/${profileOwner.id}/endorse`);
    alert(
      `✨ Endorsement added! They now have ${res.data.endorsementsCount} endorsements.`,
    );
    // Update parent state with res.data.user
  } catch (err) {
    alert("Endorsement failed: " + err.response?.data?.error);
  }
};
```

---

## Achievement & Badge System

### 4. Get User Achievements

```
GET /users/{userId}/achievements

Response (200 OK):
[
  {
    "id": "ach1",
    "userId": "user123",
    "title": "Profile Pioneer",
    "description": "Complete your profile",
    "type": "PARTICIPATION",
    "xpValue": 50,
    "unlocked": true,
    "unlockedAt": "2026-01-28T10:30:00Z"
  },
  {
    "id": "ach2",
    "userId": "user123",
    "title": "Skill Sage",
    "description": "Received 3+ skill endorsements",
    "type": "SKILL_SAGE",
    "xpValue": 200,
    "unlocked": true,
    "unlockedAt": "2026-01-28T11:45:00Z"
  }
]
```

---

## Developer Tools

### 5. Grant Campus Catalyst Badge

```
POST /users/{userId}/grant-catalyst
Authorization: Bearer DEVELOPER_TOKEN
X-User-Id: developer_user_id

Response (200 OK):
{
  "message": "User promoted to Campus Catalyst",
  "user": {
    "id": "user456",
    "role": "COLLEGE_HEAD",
    "badges": ["Campus Catalyst", ...],
    ...
  }
}

Errors:
- 403 Forbidden: Only developers can grant badges
- 404 Not Found: Target user not found
```

### 6. Activate Developer Mode

```
POST /users/{userId}/activate-dev
Authorization: Bearer TOKEN

Response (200 OK):
{
  "message": "Developer mode activated",
  "user": {
    "id": "user123",
    "isDev": true,
    "badges": ["Founding Dev", ...],
    ...
  }
}
```

---

## Badge Unlock Triggers

| Badge           | Unlock Condition             | XP Reward |
| --------------- | ---------------------------- | --------- |
| Profile Pioneer | All profile fields completed | 50 XP     |
| Skill Sage      | Received 3+ endorsements     | 200 XP    |
| Pod Pioneer     | Joined a collab pod          | 100 XP    |
| Bridge Builder  | Collaborated across colleges | 150 XP    |
| Campus Catalyst | Granted by developer         | 500 XP    |
| Founding Dev    | Activated developer mode     | 1000 XP   |

---

## Data Models

### User Model (MongoDB)

```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  fullName: String,
  collegeName: String,
  yearOfStudy: String,
  department: String,
  profilePicUrl: String,
  skills: [String],
  rolesOpenTo: [String],
  goals: String,
  excitingTags: [String],
  linkedinUrl: String,
  githubUrl: String,
  portfolioUrl: String,
  profileCompleted: Boolean,
  badges: [String],
  level: Number (default: 1),
  xp: Number (default: 0),
  totalXP: Number (default: 100),
  endorsementsCount: Number (default: 0),  // NEW!
  role: String (default: "STUDENT"),
  isDev: Boolean (default: false),
  oauthId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Achievement Model

```javascript
{
  _id: ObjectId,
  userId: String,
  title: String,
  description: String,
  type: String (FOUNDING_DEV, CAMPUS_CATALYST, POD_PIONEER, BRIDGE_BUILDER, SKILL_SAGE, PARTICIPATION),
  xpValue: Number,
  unlocked: Boolean,
  unlockedAt: Date,
  createdAt: Date
}
```

---

## Response Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (invalid token)         |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found (resource doesn't exist)   |
| 500  | Internal Server Error                |

---

## Common Errors & Solutions

### Error: 404 User not found

```json
{
  "error": "User not found with ID: user999"
}
```

**Solution**: Verify the userId is correct and the user exists in MongoDB.

### Error: 403 Access Denied

```json
{
  "error": "Access Denied: Only developers can grant badges"
}
```

**Solution**: Only users with `isDev: true` can grant badges. Use `/activate-dev` first if needed.

### Error: Invalid token

```
Authorization header missing or invalid
```

**Solution**: Ensure token is included:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Example: Complete Update & Endorse Flow

### 1. Fetch user profile

```bash
curl http://localhost:8080/api/users/user123 \
  -H "Authorization: Bearer token"
```

### 2. Update their profile

```bash
curl -X PUT http://localhost:8080/api/users/user123/profile \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Alex Johnson",
    "collegeName": "Stanford",
    "yearOfStudy": "3rd Year",
    "department": "Computer Science",
    "goals": "Work on AI/ML projects that make a social impact",
    "skills": ["Python", "TensorFlow", "JAX"],
    "excitingTags": ["Machine Learning", "NLP", "Social Good"],
    "rolesOpenTo": ["ML Engineer", "Research Engineer"]
  }'
```

### 3. Check achievements (profile should now be complete)

```bash
curl http://localhost:8080/api/users/user123/achievements \
  -H "Authorization: Bearer token"
```

Response should include "Profile Pioneer" as unlocked.

### 4. Other user endorses them

```bash
curl -X POST http://localhost:8080/api/users/user123/endorse \
  -H "Authorization: Bearer token"
```

### 5. After 3rd endorsement

Response includes:

```json
{
  "endorsementsCount": 3,
  "user": {
    "badges": ["Profile Pioneer", "Skill Sage"] // NEW!
  }
}
```

---

## Frontend Integration Example

```jsx
import api from "@/lib/api.js";

export default function ProfilePage({ user, profileOwner }) {
  const [formData, setFormData] = useState({ ...profileOwner });

  // Save profile changes
  const handleSave = async () => {
    try {
      const res = await api.put(
        `/api/users/${profileOwner.id}/profile`,
        formData,
      );
      // res.data contains updated user with all fields from MongoDB
      alert("Profile updated!");
    } catch (err) {
      alert("Error: " + err.response?.data?.error);
    }
  };

  // Endorse another user
  const handleEndorse = async () => {
    try {
      const res = await api.post(`/api/users/${profileOwner.id}/endorse`);
      // res.data.endorsementsCount shows new total
      // res.data.user contains updated user object
      alert(`Endorsement added! Total: ${res.data.endorsementsCount}`);
    } catch (err) {
      alert("Error: " + err.response?.data?.error);
    }
  };

  return (
    <div>
      {/* Display dynamic data from MongoDB */}
      <h1>{profileOwner?.fullName}</h1>
      <p>
        {profileOwner?.collegeName} • {profileOwner?.department}
      </p>

      {/* Show badges */}
      {profileOwner?.badges?.map((badge) => (
        <Badge key={badge}>{badge}</Badge>
      ))}

      {/* Action buttons */}
      <Button onClick={handleSave}>Save Profile</Button>
      <Button onClick={handleEndorse}>Endorse Skills</Button>
    </div>
  );
}
```

---

**API Documentation Last Updated**: January 28, 2026
**Synergy Platform v2.0 - Dynamic Profile System**

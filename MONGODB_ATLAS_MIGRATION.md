# MongoDB Migration Guide - localhost to Atlas

## 📋 Migration Summary

**Date:** January 30, 2026  
**Migration Type:** MongoDB local (localhost:27017) → MongoDB Atlas (FinIQ cluster, Mumbai)  
**Primary Database:** `studencollabfin`  
**Status:** ✅ Complete

---

## 🔄 What Was Changed

### 1. Java Backend (Spring Boot)

#### **File:** `server/src/main/resources/application.properties`

**Before:**
```properties
spring.data.mongodb.uri=mongodb://localhost:27017/studencollabfin
```

**After:**
```properties
# MongoDB Atlas Configuration
# Using environment variable for password security
spring.data.mongodb.uri=mongodb+srv://diptan0506:${MONGO_DB_PASSWORD}@finiq.mukfozh.mongodb.net/studencollabfin?retryWrites=true&w=majority
spring.data.mongodb.database=studencollabfin
```

**Key Changes:**
- ✅ Connected to MongoDB Atlas (FinIQ cluster)
- ✅ Uses environment variable `${MONGO_DB_PASSWORD}` for security
- ✅ Explicitly set database name to `studencollabfin`
- ✅ Connection string includes retryWrites and w=majority for reliability

#### **File:** `server/src/main/resources/application-local.properties`

**Updated with:**
- Documentation on how to set environment variables
- Instructions for Windows, Linux, and macOS
- Optional fallback configuration (commented)

### 2. Security Configuration

#### **File:** `.env.example` (Created)

Contains:
```
MONGO_DB_PASSWORD=your_mongodb_atlas_password
```

With detailed instructions for:
- Setting environment variables per OS
- Running Spring Boot with the password
- Complete Atlas connection details

### 3. React Frontend

**Status:** ✅ No changes needed
- React app only connects via Backend API (http://localhost:8080)
- No direct database connections in code
- All database operations go through Spring Boot backend

---

## 🚀 How to Run with MongoDB Atlas

### **Option 1: Set Environment Variable Temporarily (Recommended for Development)**

#### Windows (Command Prompt):
```bash
set MONGO_DB_PASSWORD=your_mongodb_atlas_password && mvn spring-boot:run
```

#### Windows (PowerShell):
```powershell
$env:MONGO_DB_PASSWORD="your_mongodb_atlas_password"; mvn spring-boot:run
```

#### Linux/macOS:
```bash
MONGO_DB_PASSWORD=your_mongodb_atlas_password mvn spring-boot:run
```

### **Option 2: Create Local .env File (Secure for Local Development)**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. File structure:
   ```
   .env
   .env.example
   .gitignore (should include .env)
   ```

3. Load environment variables before running:
   - Windows: Use `dotenv` or PowerShell
   - Linux/macOS: Use `source .env` or similar

### **Option 3: System Environment Variable (Production-Ready)**

Set permanently in your system environment:

**Windows:**
1. Settings → System → Environment Variables
2. Add: `MONGO_DB_PASSWORD=your_mongodb_atlas_password`
3. Restart IDE or terminal

**Linux/macOS:**
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export MONGO_DB_PASSWORD=your_mongodb_atlas_password
```

---

## 🔗 MongoDB Atlas Connection Details

| Detail | Value |
|--------|-------|
| **Cluster** | finiq |
| **Region** | Mumbai (ap-south-1) |
| **Database** | studencollabfin |
| **Username** | diptan0506 |
| **Connection String** | `mongodb+srv://diptan0506:${MONGO_DB_PASSWORD}@finiq.mukfozh.mongodb.net/studencollabfin?retryWrites=true&w=majority` |

---

## 📊 Collections in MongoDB Atlas

The `studencollabfin` database contains:

| Collection | Purpose |
|------------|---------|
| users | User profiles and authentication |
| posts | Social posts and team-finding posts |
| comments | Comments on posts |
| collabpods | Collaboration pod data |
| messages | Messages within pods/rooms |
| chats | Direct chat conversations |
| events | Events and buddy beacon events |
| badges | User badges and achievements |
| achievements | Achievement tracking |
| applications | Applications to team posts |
| (and more...) | Other application data |

---

## ⚙️ Spring Boot Configuration Details

### **Connection String Components:**

```
mongodb+srv://
  ├─ Username: diptan0506
  ├─ Password: ${MONGO_DB_PASSWORD} (environment variable)
  ├─ Cluster: finiq
  ├─ Domain: finiq.mukfozh.mongodb.net
  ├─ Database: studencollabfin
  └─ Options: retryWrites=true&w=majority
```

### **What These Options Mean:**

- `retryWrites=true`: Automatically retry failed writes (improves reliability)
- `w=majority`: Write concern - ensures writes are replicated to majority (safer)
- `+srv`: DNS SeedList connection (easier cluster management)

---

## 🔒 Security Best Practices

### **DO:**
- ✅ Use environment variables for passwords
- ✅ Add `.env` to `.gitignore` (never commit real passwords)
- ✅ Use `.env.example` as a template
- ✅ Use strong, unique passwords for production
- ✅ Enable IP whitelisting in MongoDB Atlas
- ✅ Rotate passwords regularly

### **DON'T:**
- ❌ Commit `.env` files with real passwords
- ❌ Hardcode passwords in code
- ❌ Share passwords in commit messages
- ❌ Use simple passwords in production
- ❌ Store passwords in plain text

---

## 🧪 Verification Steps

After setting up, verify the connection:

1. **Start Spring Boot Backend:**
   ```bash
   cd server
   set MONGO_DB_PASSWORD=your_password && mvn spring-boot:run
   ```

2. **Check Logs for Success:**
   ```
   ✅ Should see: "Connected to MongoDB"
   ❌ Should NOT see: "Connection refused" or "mongo://localhost"
   ```

3. **Start React Frontend:**
   ```bash
   cd client
   npm run dev
   ```

4. **Login and Use App:**
   - Create account or login
   - Create a post or pod
   - Check MongoDB Atlas dashboard → Collections to verify data

5. **Check MongoDB Atlas:**
   - Go to: https://cloud.mongodb.com/
   - Project: StudEnCollabFin
   - Cluster: finiq
   - Database: studencollabfin
   - Verify new collections and documents appear

---

## 🔄 Rollback Plan (If Needed)

If you need to revert to localhost:

1. **Update application.properties:**
   ```properties
   spring.data.mongodb.uri=mongodb://localhost:27017/studencollabfin
   spring.data.mongodb.database=studencollabfin
   ```

2. **Start local MongoDB:**
   ```bash
   mongod --port 27017
   ```

3. **Restart Spring Boot** (without MONGO_DB_PASSWORD variable)

---

## 📝 Environment Variable Reference

### **Spring Boot Environment Variable Handling**

Spring Boot automatically resolves `${VARIABLE_NAME}` placeholders from:
1. System environment variables
2. System properties
3. Command-line arguments

### **Order of Precedence:**
```
Command-line (-DVARIABLE=value) 
    ↓
System Environment Variable
    ↓
.env file (if using spring-dotenv)
    ↓
Default value (or fail if not set)
```

**Current Setup:** Uses system environment variable directly (Option 1)

---

## 🎯 Success Indicators

After migration, you should see:

✅ **Backend Logs:**
```
[INFO] Connected to MongoDB Atlas cluster finiq
[INFO] Database: studencollabfin
[INFO] Collections initialized
```

✅ **Frontend:**
- Login works
- Posts, pods, messages save successfully
- No "Unauthorized" or database errors

✅ **MongoDB Atlas:**
- Collections appear in the database
- Data is being written in real-time

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` | Set MONGO_DB_PASSWORD before running |
| `Authentication failed` | Check password in MONGO_DB_PASSWORD env var |
| `Cluster not found` | Verify cluster name "finiq" is correct |
| `Database doesn't exist` | MongoDB Atlas auto-creates on first write |
| `Collections empty` | Create/login with account and trigger operations |

---

## ✅ Checklist

- [x] Updated application.properties with Atlas URI
- [x] Added spring.data.mongodb.database property
- [x] Created .env.example with credentials
- [x] Updated application-local.properties with documentation
- [x] Verified React frontend uses only Backend API
- [x] No hardcoded localhost connections in code
- [x] Migration guide created
- [ ] Set MONGO_DB_PASSWORD environment variable on your machine
- [ ] Start Spring Boot with password and verify connection
- [ ] Test features (login, create post, send message)
- [ ] Verify data appears in MongoDB Atlas dashboard

---

**Migration Date:** January 30, 2026  
**Status:** ✅ Configuration Complete - Ready to Run

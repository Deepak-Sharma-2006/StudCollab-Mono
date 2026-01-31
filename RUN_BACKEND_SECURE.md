# Running Backend with Secure MongoDB Atlas Connection

## ⚠️ Security Fix Applied

The MongoDB Atlas password has been **removed from all committed files** for security. The backend now uses environment variables to securely pass the password at runtime.

---

## 🔐 How the Backend Connection Works Now

### Configuration Flow:
```
application.properties
  ↓
spring.data.mongodb.uri=mongodb+srv://diptan0506:${MONGO_DB_PASSWORD}@...
  ↓
Runtime Environment Variable: MONGO_DB_PASSWORD
  ↓
Spring Boot resolves ${MONGO_DB_PASSWORD} from your system
```

---

## 🚀 How to Run the Backend (Choose One Method)

### **Method 1: Set Variable Before Running (Recommended)**

#### Windows (Command Prompt):
```bash
set MONGO_DB_PASSWORD=YOUR_ACTUAL_PASSWORD && cd server && mvn spring-boot:run
```

#### Windows (PowerShell):
```powershell
$env:MONGO_DB_PASSWORD="YOUR_ACTUAL_PASSWORD"; cd server; mvn spring-boot:run
```

#### Linux/macOS:
```bash
MONGO_DB_PASSWORD=YOUR_ACTUAL_PASSWORD cd server && mvn spring-boot:run
```

### **Method 2: Set System Environment Variable (Permanent)**

#### Windows:
1. Open System Properties: `Win + X` → System → Advanced System Settings
2. Click "Environment Variables"
3. Click "New" (under User variables or System variables)
4. Variable name: `MONGO_DB_PASSWORD`
5. Variable value: `YOUR_ACTUAL_PASSWORD`
6. Click OK and restart your IDE/Terminal

#### Linux/macOS:
Add to `~/.bashrc`, `~/.zshrc`, or `~/.bash_profile`:
```bash
export MONGO_DB_PASSWORD="YOUR_ACTUAL_PASSWORD"
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc or ~/.bash_profile
```

### **Method 3: Create Local .env File (Development Only)**

1. Create a `.env` file in the project root (NOT in git):
   ```
   MONGO_DB_PASSWORD=YOUR_ACTUAL_PASSWORD
   ```

2. Load it before running (requires additional tooling):
   - **Windows PowerShell**: Use `dotenv` or similar
   - **Linux/macOS**: Use `source .env` or `direnv`

---

## ✅ Verification Steps

After setting the environment variable and running the backend:

### 1. Check Backend Logs
Look for these messages in the console output:
```
[INFO] Connected to MongoDB Atlas
[INFO] Starting StudCollabApplication
```

### 2. Verify No Connection Errors
Should NOT see:
```
❌ Connection refused
❌ Authentication failed
❌ Unknown host
```

### 3. Test the API
```bash
curl http://localhost:8080/api/auth/me
```

Should return 401 (no token) with proper JSON response, NOT connection errors.

### 4. Test Full Feature
- Start the frontend: `cd client && npm run dev`
- Login to the application
- Create a post or send a message
- Data should persist in MongoDB Atlas

---

## 🔑 MongoDB Atlas Password

Get your actual password from:
1. **Option A** (Recommended): Check with the project maintainer
2. **Option B**: Reset password in MongoDB Atlas dashboard:
   - Go to: https://cloud.mongodb.com
   - Project: StudEnCollabFin
   - Cluster: finiq
   - Database Access → Users → Edit → Change Password

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `Connection refused` | ✅ Set MONGO_DB_PASSWORD environment variable before running |
| `Authentication failed` | ✅ Verify password is correct (ask maintainer if unsure) |
| `Cluster not found` | ✅ Check internet connection and MongoDB Atlas cluster status |
| Backend won't start | ✅ Check Spring Boot logs for detailed error message |
| `Failed to connect to localhost:27017` | ✅ You're using old config - Make sure you have the latest code |

---

## 📝 Important Notes

### ✅ What's Secure Now:
- ✅ Real passwords are NOT in git history
- ✅ `.env.example` has placeholder values only
- ✅ Documentation uses placeholders, not real passwords
- ✅ Environment variable approach prevents accidental commits

### ✅ What Still Works:
- ✅ All existing code (no breaking changes)
- ✅ MongoDB Atlas connection (same cluster, database, collections)
- ✅ Backend API endpoints
- ✅ Frontend-Backend integration

### ⚠️ Remember:
- Never commit real passwords to git
- Use environment variables for all secrets
- Each team member sets their own environment variable
- In production, use a secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)

---

## 🎯 Quick Start

**One-liner to run backend (replace YOUR_PASSWORD):**

### Windows (Command Prompt):
```bash
set MONGO_DB_PASSWORD=YOUR_PASSWORD && cd server && mvn spring-boot:run
```

### Linux/macOS:
```bash
MONGO_DB_PASSWORD=YOUR_PASSWORD cd server && mvn spring-boot:run
```

---

**Status:** ✅ Backend is ready to run securely  
**Last Updated:** January 31, 2026

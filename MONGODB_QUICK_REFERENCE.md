# MongoDB Atlas Migration - Quick Reference

## 🚀 Run Backend with Atlas (Pick One)

### **Option 1: Windows Command Prompt**
```bash
set MONGO_DB_PASSWORD=Y7tgfrOHFxF1jrNU && mvn spring-boot:run
```

### **Option 2: Windows PowerShell**
```powershell
$env:MONGO_DB_PASSWORD="Y7tgfrOHFxF1jrNU"; mvn spring-boot:run
```

### **Option 3: Linux/macOS**
```bash
MONGO_DB_PASSWORD=Y7tgfrOHFxF1jrNU mvn spring-boot:run
```

---

## 🔗 Connection Details

| Key | Value |
|-----|-------|
| **Database** | studencollabfin |
| **Cluster** | finiq (Mumbai) |
| **Username** | diptan0506 |
| **Password** | Y7tgfrOHFxF1jrNU |
| **URI** | `mongodb+srv://diptan0506:${MONGO_DB_PASSWORD}@finiq.mukfozh.mongodb.net/studencollabfin?retryWrites=true&w=majority` |

---

## 📂 Files Updated

- ✅ `server/src/main/resources/application.properties` → MongoDB Atlas URI
- ✅ `server/src/main/resources/application-local.properties` → Documentation
- ✅ `.env.example` → Created (credentials template)
- ✅ React Frontend → Verified (no changes needed)

---

## ✅ Verification

After starting backend:
- [ ] Check logs: "Connected to MongoDB"
- [ ] Login to app
- [ ] Create post/message
- [ ] Verify in MongoDB Atlas dashboard

---

## 🔒 Security Notes

⚠️ **DO NOT:**
- Commit `.env` with real password
- Hardcode password in code
- Share password in commits

✅ **DO:**
- Use environment variables
- Keep `.env` in `.gitignore`
- Use `.env.example` as template

---

## 📚 Full Documentation

Read for complete setup, troubleshooting, and production deployment:
- **MONGODB_ATLAS_MIGRATION.md** - Comprehensive guide
- **MONGODB_MIGRATION_SUMMARY.md** - Executive summary

---

**Migration Date:** January 30, 2026  
**Status:** ✅ Complete and Ready to Use

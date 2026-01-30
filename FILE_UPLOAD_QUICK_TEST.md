# File Upload Feature - Quick Test Guide

## Prerequisites
- Java 11+ installed
- Node.js 16+ installed
- MongoDB running on localhost:27017
- Ports 8080 (backend) and 5173 (frontend) available

## Startup Commands

### Terminal 1 - Start Backend
```bash
cd d:\StudCollab-Mono\server
java -jar target/server-0.0.1-SNAPSHOT.jar
```

**Expected Output**:
```
Started ServerApplication in X.XXX seconds (process running for X.XXX)
```

### Terminal 2 - Start Frontend (if not already running)
```bash
cd d:\StudCollab-Mono\client
npm run dev
```

**Expected Output**:
```
VITE v4.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Quick Test Steps

1. **Open Browser**:
   - Navigate to `http://localhost:5173`
   - Press F12 to open DevTools console

2. **Login** (if required):
   - Enter credentials
   - Wait for app to load

3. **Navigate to a Pod**:
   - Go to Campus Hub
   - Click on any collab pod or discussion
   - The chat interface should load

4. **Upload an Image**:
   - Click the attachment/file button in the message input area
   - Select an image file (JPG, PNG, GIF, etc.)
   - Watch the console for: `📤 Starting file upload:`
   - Type a message or just send the image
   - Click send

5. **Monitor Console**:
   - **Upload starts**: See `📤 Starting file upload:` with file details
   - **FormData ready**: See `📤 FormData prepared, sending to /api/uploads/pod-files`
   - **Success**: See `✅ Upload successful:` with URL
   - **Image appears**: The image should display in the chat bubble

6. **Check Server Logs**:
   - Terminal 1 should show:
   ```
   ========== FILE UPLOAD START ==========
   File name: [filename]
   File size: [bytes]
   Content type: [mime-type]
   ...
   ✅ Response URL: /uploads/[uuid].ext
   ========== FILE UPLOAD SUCCESS ==========
   ```

7. **Verify File on Disk**:
   - Open file explorer
   - Navigate to `d:\StudCollab-Mono\server\uploads`
   - You should see the uploaded file with UUID name

## Troubleshooting

### Issue: 500 Error on Upload
**Check 1**: Server console shows error details
- Read the full error message in Terminal 1
- Common: "Upload directory is not writable"
- Solution: Check `d:\StudCollab-Mono\server\uploads` exists

**Check 2**: Frontend console shows error details
- Open DevTools (F12)
- Look for `❌ Upload error details:`
- The object will show `errorType` and `path` fields

**Check 3**: Network tab in DevTools
- Open DevTools → Network tab
- Try uploading
- Click the failed POST request
- View Response tab for server error

### Issue: Image Not Showing in Chat
**Check 1**: Upload succeeded but image won't display
- Check browser console for image loading errors
- Verify URL format: should be `/uploads/[uuid].ext`
- Try right-clicking image → "Open in new tab"
- Should load from `http://localhost:8080/uploads/[uuid].ext`

**Check 2**: File exists on disk but can't load
- Navigate to `d:\StudCollab-Mono\server\uploads`
- Confirm file is there with UUID name
- Check Windows permissions on file
- Try renaming file to add extension: `[uuid].jpg`

### Issue: "Connection refused" Error
**Check 1**: Backend not running
- Verify Terminal 1 shows "Started ServerApplication"
- Check port 8080: `netstat -ano | findstr :8080`
- If not running, start it with: `java -jar target/server-0.0.1-SNAPSHOT.jar`

**Check 2**: Wrong host/port
- Frontend api.js should have: `baseURL: 'http://localhost:8080'`
- Backend should be listening on `0.0.0.0:8080`

### Issue: CORS Error in Browser
**Check**: FileUploadController has @CrossOrigin annotation
- If missing, add: `@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")`
- Rebuild backend: `mvn clean package -DskipTests`
- Restart backend

## Expected Files Created

After successful upload, you should see:
```
d:\StudCollab-Mono\server\uploads\
├── [uuid-1].jpg
├── [uuid-2].png
├── [uuid-3].pdf
└── ... (more uploaded files)
```

Where `[uuid]` looks like: `550e8400-e29b-41d4-a716-446655440000`

## Console Log Examples

### Successful Upload
```javascript
📤 Starting file upload: {
  fileName: "vacation.jpg",
  fileSize: 45678,
  fileType: "image/jpeg"
}
📤 FormData prepared, sending to /api/uploads/pod-files
✅ Upload successful: {
  url: "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
  type: "IMAGE",
  fileName: "vacation.jpg"
}
```

### Failed Upload
```javascript
❌ Upload error details: {
  message: "Request failed with status code 500",
  status: 500,
  statusText: "Internal Server Error",
  error: "Upload directory is not writable",
  errorType: "INTERNAL_ERROR",
  uploadDir: "d:\StudCollab-Mono\server\uploads",
  path: "d:\StudCollab-Mono\server\uploads"
}
```

## Server Log Examples

### Successful Upload
```
========== FILE UPLOAD START ==========
File name: vacation.jpg
File size: 45678 bytes
Content type: image/jpeg
Project root: d:\StudCollab-Mono\server
Upload dir: d:\StudCollab-Mono\server\uploads
✅ Directory already exists
✅ Directory is writable
Generated filename: 550e8400-e29b-41d4-a716-446655440000.jpg
Full file path: d:\StudCollab-Mono\server\uploads\550e8400-e29b-41d4-a716-446655440000.jpg
✅ File copied: 45678 bytes
✅ File verified - Size on disk: 45678 bytes
Attachment type: IMAGE
✅ Response URL: /uploads/550e8400-e29b-41d4-a716-446655440000.jpg
========== FILE UPLOAD SUCCESS ==========
```

### Failed Upload
```
========== FILE UPLOAD START ==========
File name: document.pdf
File size: 2048000 bytes
Content type: application/pdf
Project root: d:\StudCollab-Mono\server
Upload dir: d:\StudCollab-Mono\server\uploads
❌ Upload directory is not writable!
========== FILE UPLOAD FAILED ==========
```

## Testing Different File Types

### Images
- JPG: `test.jpg` ✅
- PNG: `test.png` ✅
- GIF: `test.gif` ✅
- WebP: `test.webp` ✅

### Documents
- PDF: `document.pdf` ✅
- DOCX: `document.docx` ✅
- TXT: `notes.txt` ✅

### Max Sizes
- Single file: 10MB (configured)
- Total request: 10MB (configured)

## Performance Notes

- First upload on app startup might take 1-2 seconds
- Typical upload time: < 500ms for images < 5MB
- Recommended max image size: 2-5MB for chat
- File is renamed to UUID on server (original name preserved in response)

## Rollback (If Issues)

If upload fails after these fixes:

1. **Revert FileUploadController**:
   ```bash
   git checkout server/src/main/java/com/studencollabfin/server/controller/FileUploadController.java
   ```

2. **Rebuild**:
   ```bash
   cd server && mvn clean package -DskipTests
   ```

3. **Restart**:
   ```bash
   java -jar target/server-0.0.1-SNAPSHOT.jar
   ```

## Additional Resources

- **Backend Logs**: Terminal 1 (Java output)
- **Frontend Logs**: DevTools Console (F12)
- **Network Debugging**: DevTools Network tab (F12)
- **Server Health**: `curl http://localhost:8080/api/health` (if endpoint exists)
- **Upload Dir**: `d:\StudCollab-Mono\server\uploads`

---

**Last Updated**: 30-01-2026
**Status**: Ready for testing

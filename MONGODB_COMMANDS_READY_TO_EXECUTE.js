/**
 * ============================================================================
 * CRITICAL: TTL INDEX COMMAND FOR PODCOOLDOWNS AUTO-DELETION
 * ============================================================================
 * 
 * Run this FIRST in MongoDB to enable auto-deletion after 15 minutes:
 * 
 * COPY AND PASTE INTO MONGODB CLI/COMPASS/ATLAS:
 */

db.podCooldowns.createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 0 }
);

/**
 * ============================================================================
 * FULL MIGRATION SCRIPT - RUN ALL COMMANDS BELOW
 * ============================================================================
 * 
 * Execute these commands in MongoDB CLI, Compass, or Atlas
 * Environment: Any MongoDB instance with CollabPods and Messages collections
 */

// ============================================================================
// STEP 1: MIGRATE COLLABPODS - ROLE-BASED SYSTEM
// ============================================================================

// Update all documents: creatorId → ownerId, moderatorIds → adminIds
db.collabPods.updateMany(
    {},
    [
        {
            $set: {
                ownerId: "$creatorId",
                adminIds: {
                    $cond: [
                        { $eq: ["$moderatorIds", null] },
                        [],
                        "$moderatorIds"
                    ]
                },
                bannedIds: {
                    $cond: [
                        { $eq: ["$bannedIds", null] },
                        [],
                        "$bannedIds"
                    ]
                }
            }
        }
    ]
);

// Verify update succeeded
db.collabPods.findOne();

// ============================================================================
// STEP 2: CREATE INDEXES ON COLLABPODS
// ============================================================================

db.collabPods.createIndex({ ownerId: 1 });
db.collabPods.createIndex({ adminIds: 1 });
db.collabPods.createIndex({ bannedIds: 1 });
db.collabPods.createIndex({ podId: 1, ownerId: 1, adminIds: 1, memberIds: 1 });

// ============================================================================
// STEP 3: CREATE PODCOOLDOWNS COLLECTION & INDEXES
// ============================================================================

// Create collection (optional - MongoDB creates on first insert)
db.createCollection("podCooldowns");

// ⭐ CRITICAL: TTL Index - Auto-deletes documents 15 minutes after expiryDate
db.podCooldowns.createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 0 }
);

// Unique index: Only one cooldown per user per pod
db.podCooldowns.createIndex(
    { userId: 1, podId: 1 },
    { unique: true }
);

// Index for finding cooldowns by userId
db.podCooldowns.createIndex({ userId: 1 });

// Index for finding cooldowns by podId
db.podCooldowns.createIndex({ podId: 1 });

// ============================================================================
// STEP 4: UPDATE MESSAGES - ADD MESSAGETYPE ENUM
// ============================================================================

// Set messageType to CHAT for all existing messages
db.messages.updateMany(
    { messageType: { $exists: false } },
    { $set: { messageType: "CHAT" } }
);

// Optionally, preserve old messageType string as messageTypeString
db.messages.updateMany(
    {
        messageType: { $exists: true },
        $expr: { $eq: [{ $type: "$messageType" }, "string"] }
    },
    [
        {
            $set: {
                messageTypeString: "$messageType",
                messageType: "CHAT"
            }
        }
    ]
);

// Verify update
db.messages.findOne();

// ============================================================================
// STEP 5: CREATE INDEXES ON MESSAGES
// ============================================================================

db.messages.createIndex({ messageType: 1 });
db.messages.createIndex({ podId: 1, messageType: 1, sentAt: -1 });

// ============================================================================
// STEP 6: VERIFY ALL UPDATES
// ============================================================================

console.log("=== VERIFICATION ===");

console.log("\n1. Sample CollabPod (should have ownerId, adminIds, memberIds, bannedIds):");
db.collabPods.findOne();

console.log("\n2. Sample PodCooldown:");
db.podCooldowns.findOne();

console.log("\n3. Sample Message (should have messageType enum):");
db.messages.findOne();

console.log("\n4. CollabPods Indexes:");
db.collabPods.getIndexes();

console.log("\n5. PodCooldowns Indexes (verify TTL index):");
db.podCooldowns.getIndexes();

console.log("\n6. Messages Indexes:");
db.messages.getIndexes();

console.log("\n✅ Migration Complete!");

/**
 * ============================================================================
 * USEFUL QUERIES FOR TESTING & OPERATIONS
 * ============================================================================
 */

// Find all pods owned by a user
// db.collabPods.find({ ownerId: "USER_ID" });

// Find all pods where user is admin
// db.collabPods.find({ adminIds: "USER_ID" });

// Find all pods where user is member
// db.collabPods.find({ memberIds: "USER_ID" });

// Find all pods where user is banned
// db.collabPods.find({ bannedIds: "USER_ID" });

// Check if user has active cooldown for a pod
// db.podCooldowns.findOne({ userId: "USER_ID", podId: "POD_ID" });

// Find all active cooldowns for a user
// db.podCooldowns.find({ userId: "USER_ID" });

// Find all CHAT messages in a pod
// db.messages.find({ podId: "POD_ID", messageType: "CHAT" });

// Find all SYSTEM messages (actions) in a pod
// db.messages.find({ podId: "POD_ID", messageType: "SYSTEM" });

// Create a system message (user kicked)
// db.messages.insertOne({
//     messageType: "SYSTEM",
//     podId: "POD_ID",
//     text: "User John Doe was kicked from the pod",
//     sentAt: new Date(),
//     read: false
// });

// Ban a user from a pod
// db.collabPods.updateOne(
//     { _id: ObjectId("POD_ID") },
//     {
//         $pull: { memberIds: "USER_ID", adminIds: "USER_ID" },
//         $addToSet: { bannedIds: "USER_ID" }
//     }
// );

// Promote a member to admin
// db.collabPods.updateOne(
//     { _id: ObjectId("POD_ID") },
//     { $addToSet: { adminIds: "USER_ID" } }
// );

// Remove a user from a pod (without banning)
// db.collabPods.updateOne(
//     { _id: ObjectId("POD_ID") },
//     { $pull: { memberIds: "USER_ID", adminIds: "USER_ID" } }
// );

// Create a cooldown for a user (prevent rejoin for 15 minutes)
// db.podCooldowns.insertOne({
//     userId: "USER_ID",
//     podId: "POD_ID",
//     action: "LEAVE",
//     createdAt: new Date(),
//     expiryDate: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
// });

// Check number of members in a pod
// db.collabPods.findOne({ _id: ObjectId("POD_ID") }).memberIds.length;

// Get pod statistics
// db.collabPods.aggregate([
//     { $match: { _id: ObjectId("POD_ID") } },
//     { $project: {
//         name: 1,
//         owner: "$ownerId",
//         adminCount: { $size: "$adminIds" },
//         memberCount: { $size: "$memberIds" },
//         bannedCount: { $size: "$bannedIds" }
//     } }
// ]);

/**
 * ============================================================================
 * TTL INDEX BEHAVIOR
 * ============================================================================
 * 
 * How TTL Works:
 * 1. Documents are marked for deletion when current time >= expiryDate
 * 2. MongoDB checks every 60 seconds (default interval)
 * 3. Documents deleted within 60 seconds of their expiration
 * 4. NO manual cleanup needed - fully automatic
 * 
 * Example:
 * - Cooldown created at 10:00 AM
 * - expiryDate set to 10:15 AM (15 minutes later)
 * - MongoDB automatically deletes between 10:15 and 10:16 AM
 * - No action required from application code
 * 
 * ⚠️ Note: TTL indexes run on a background process, so there may be
 * a delay of up to 60 seconds between expiry and deletion.
 * ============================================================================
 */

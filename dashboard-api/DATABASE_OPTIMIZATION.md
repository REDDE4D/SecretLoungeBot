# Database Optimization Guide

## Current Index Strategy

This document outlines the database indexes currently in place and optimization strategies for the TG-Lobby-Bot Dashboard API.

## Existing Indexes

### User Model (`src/models/User.js`)
- `alias` - Single index (unique, sparse) - Fast alias lookups
- `inLobby` - Single index - Filter lobby members
- `inLobby + role` - Compound index - Query lobby members by role
- `bannedUntil` - Single index - Find banned users
- `mutedUntil` - Single index - Find muted users

**Query Optimization:**
- User list with filters: ✅ Optimized
- Role-based lookups: ✅ Optimized
- Moderation queries: ✅ Optimized

### Activity Model (`src/models/Activity.js`)
- `userId` - Single index - Fast user activity lookup
- `status + lastActive` - Compound index - Filter by online/idle/offline
- `userId + lastActive` - Compound index - Compliance queries
- `userId + status` - Compound index - User-specific status checks

**Query Optimization:**
- Online user count: ✅ Optimized
- User activity tracking: ✅ Optimized
- Compliance checks: ✅ Optimized

### Report Model (`src/models/Report.js`)
- `reporterId` - Single index - Reporter history
- `reportedUserId` - Single index - Reports against user
- `status` - Single index - Filter by status
- `status + createdAt` - Compound index - Pending reports by date
- `reportedUserId + createdAt` - Compound index - User report history

**Query Optimization:**
- Pending reports list: ✅ Optimized
- User report history: ✅ Optimized
- Report filtering: ✅ Optimized

### Session Model (`dashboard-api/models/Session.js`)
- `userId` - Single index - Find user sessions
- `accessTokenHash` - Single index - Fast token lookup
- `refreshTokenHash` - Single index - Refresh token validation
- `expiresAt` - TTL index (expireAfterSeconds: 0) - Auto-delete expired sessions
- `userId + expiresAt` - Compound index - Active session queries

**Query Optimization:**
- Token validation: ✅ Optimized
- Session cleanup: ✅ Auto-handled by TTL index
- Multi-device sessions: ✅ Optimized

## Performance Recommendations

### 1. Query Patterns

**Efficient Queries:**
```javascript
// ✅ Use indexed fields in queries
User.find({ inLobby: true, role: "admin" }); // Uses compound index

// ✅ Limit and sort with indexed fields
Report.find({ status: "pending" }).sort({ createdAt: -1 }).limit(50);

// ✅ Use projection to return only needed fields
User.find({ inLobby: true }, "alias icon role");
```

**Queries to Avoid:**
```javascript
// ❌ Avoid full collection scans
User.find({ "preferences.theme": "dark" }); // Not indexed

// ❌ Avoid regex without anchors on large collections
User.find({ alias: /test/ }); // Slow without ^anchor

// ✅ Better: Use anchored regex
User.find({ alias: /^test/ }); // Can use index
```

### 2. Aggregation Pipelines

**Optimized Aggregations:**
```javascript
// ✅ Filter early in pipeline with indexed fields
db.users.aggregate([
  { $match: { inLobby: true } }, // Uses index
  { $sort: { alias: 1 } },
  { $limit: 100 }
]);

// ✅ Use $facet for multiple aggregations
db.activities.aggregate([
  { $facet: {
    online: [{ $match: { status: "online" } }, { $count: "count" }],
    idle: [{ $match: { status: "idle" } }, { $count: "count" }],
    offline: [{ $match: { status: "offline" } }, { $count: "count" }]
  }}
]);
```

### 3. Connection Pooling

**Current Configuration:**
- Default Mongoose connection pool: 5-10 connections
- Suitable for small to medium traffic

**Recommended for High Traffic:**
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 4. Caching Strategy

**API Level Caching:**
- Statistics: Cache for 5 seconds (real-time not critical)
- User list: Cache for 30 seconds with pagination
- Settings: Cache until modified

**Implementation Example:**
```javascript
// Simple in-memory cache for stats
const statsCache = {
  data: null,
  timestamp: 0,
  ttl: 5000, // 5 seconds
};

function getCachedStats() {
  if (Date.now() - statsCache.timestamp < statsCache.ttl) {
    return statsCache.data;
  }
  return null;
}
```

### 5. Monitoring Slow Queries

**Enable MongoDB Slow Query Logging:**
```javascript
// In MongoDB
db.setProfilingLevel(1, { slowms: 100 }); // Log queries > 100ms

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

**Application-Level Logging:**
```javascript
mongoose.set('debug', process.env.NODE_ENV === 'development');
```

## Future Index Considerations

### If Traffic Grows Beyond 10,000 Users:

1. **Add Text Index for Search:**
```javascript
userSchema.index({ alias: "text" });
```

2. **Optimize Report Queries:**
```javascript
// Add compound index for dashboard filtering
reportSchema.index({ status: 1, resolvedBy: 1, createdAt: -1 });
```

3. **Add Partial Indexes for Sparse Data:**
```javascript
// Only index banned/muted users
userSchema.index(
  { bannedUntil: 1 },
  { partialFilterExpression: { bannedUntil: { $ne: null } } }
);
```

4. **Consider Sharding for Sessions:**
```javascript
// If sessions collection grows very large (millions)
// Shard by userId to distribute load
```

## Performance Metrics

### Current Performance (Expected)
- User lookup by ID: < 1ms
- Lobby member list (1000 users): < 10ms
- Pending reports query: < 5ms
- Stats aggregation: < 50ms
- Session validation: < 1ms

### Monitoring Checklist
- [ ] Monitor query execution times via MongoDB profiler
- [ ] Track API response times via logging middleware
- [ ] Monitor database connection pool usage
- [ ] Check index usage with `db.collection.getIndexes()`
- [ ] Review slow query log weekly

## Database Maintenance

### Regular Tasks
1. **Weekly:**
   - Review slow query log
   - Check collection sizes: `db.stats()`
   - Monitor index sizes

2. **Monthly:**
   - Analyze query patterns
   - Consider new indexes based on usage
   - Compact collections if needed: `db.runCommand({ compact: 'collection' })`

3. **Quarterly:**
   - Review and remove unused indexes
   - Update index strategy based on growth
   - Consider archiving old data (sessions, logs)

## Load Testing Results

**Test Scenario:** 100 concurrent users
- Average response time: TBD
- 95th percentile: TBD
- Max concurrent connections: TBD

**Recommendations:**
- Run load tests before deployment
- Use tools: Artillery, Apache Bench, or k6
- Test endpoints: `/api/stats/overview`, `/api/users`, `/api/moderation/reports`

## Summary

✅ All critical models have proper indexes
✅ Compound indexes for common query patterns
✅ TTL indexes for automatic cleanup
✅ Query patterns optimized for dashboard API

**Next Steps:**
- Implement query caching for statistics endpoints
- Add monitoring for slow queries
- Run load tests to validate performance
- Consider Redis for session storage at scale

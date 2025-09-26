# Resolved Status Database Fields

## Fields Added to Topics

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resolved` | Integer (0/1) | 0 | Topic resolved status (0=unresolved, 1=resolved) |
| `resolvedBy` | Integer/null | null | User ID who marked as resolved |
| `resolvedAt` | Integer/null | null | Unix timestamp (ms) when resolved |

## Usage

### Reading Status
```javascript
// Single topic
const resolved = await Topics.getTopicField(tid, 'resolved');
const isResolved = resolved === 1;

// Multiple fields
const data = await Topics.getTopicFields(tid, ['resolved', 'resolvedBy', 'resolvedAt']);
```

### Setting Status (API Team - Issue #5)
```javascript
// Mark resolved
await Topics.setTopicFields(tid, {
    resolved: 1,
    resolvedBy: uid,
    resolvedAt: Date.now()
});

// Mark unresolved
await Topics.setTopicFields(tid, {
    resolved: 0,
    resolvedBy: null,
    resolvedAt: null
});
```

## Implementation Files
- Schema: `src/topics/data.js:17`
- Migration: `src/upgrades/4.3.3/add_resolved_fields_to_topics.js`
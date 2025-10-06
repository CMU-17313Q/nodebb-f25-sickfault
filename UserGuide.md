# Mark Resolved Feature - User-Guide

## Overview

The Mark Resolved feature allows users to mark forum topics as resolved or unresolved, helping community members quickly identify which discussions have been answered or completed. This feature includes three main components:

1. **Mark Resolved Button** - Toggle button to mark topics as resolved/unresolved
2. **Resolved Indicator** - Visual indicator showing when a topic is resolved
3. **Resolved Filter** - Filter to view only resolved or unresolved topics

---

## Feature Components

### 1. Mark Resolved/Unresolved Button

#### Location
The Mark Resolved button appears on individual topic pages in the topic toolbar, alongside other topic management tools (lock, pin, delete, etc.).

#### Who Can Use It
- **Topic Author**: Can mark their own topics as resolved or unresolved
- **Administrators**: Can mark any topic as resolved or unresolved
- **Moderators**: Can mark any topic as resolved or unresolved
- **Regular Users**: Cannot mark other users' topics as resolved

#### How to Use

**To mark a topic as resolved:**
1. Navigate to the topic page you want to mark as resolved
2. Look for the "Mark Resolved" button (with a green checkmark icon) in the topic toolbar
3. Click the "Mark Resolved" button
4. The button will change to "Mark Unresolved" (undo icon)
5. A green success message will pop up and indicate: "Topic marked as resolved"
6. A resolved indicator will appear on the topic

**To mark a topic as unresolved:**
1. Navigate to a resolved topic
2. Look for the "Mark Unresolved" button (undo icon) in the topic toolbar
3. Click the "Mark Unresolved" button
4. The button will change back to "Mark Resolved"
5. A success message will pop up and indicate: "Topic marked as unresolved"
6. The resolved indicator will be removed

#### Visual Elements
- **Mark Resolved button**: Green checkmark icon with "Mark Resolved" text
- **Mark Unresolved button**: Undo icon (fa-undo) with "Mark Unresolved" text

---

### 2. Resolved Indicator

#### Purpose
The resolved indicator provides a visual cue that a topic has been marked as resolved. It appears both on the topic page and in the category page.

#### Location
- On the topic page: Appears in the topic labels section alongside other indicators (locked, pinned, etc.)
- In the category page: Appears next to the topic title in category views

#### Visual Appearance
The indicator displays a checkmark icon with styling that matches the forum's theme, making it easy to spot resolved topics at a glance.

#### Metadata Stored
When a topic is marked as resolved, the system stores:
- **resolved**: Integer flag (1 = resolved, 0 = unresolved)
- **resolvedBy**: User ID of the person who marked it as resolved
- **resolvedAt**: Timestamp when the topic was marked as resolved

---

### 3. Resolved/Unresolved Filter

#### Location
The filter dropdown appears in the category view toolbar, alongside other filters like sort options and tag filters. It's located in the top section of category pages.

#### Filter Options
The filter provides the following options:
- **All Topics** (default): Shows all topics regardless of resolved status
- **Resolved**: Shows only topics that have been marked as resolved
- **Unresolved**: Shows only topics that have not been marked as resolved

#### How to Use

**To filter resolved topics:**
1. Navigate to a category page
2. Locate the filter dropdown in the topic list toolbar (filter icon)
3. Click the filter dropdown
4. Select "Resolved" from the dropdown menu
5. The page will reload showing only resolved topics
6. The URL will update to include `?filter=resolved`

**To filter unresolved topics:**
1. Navigate to a category page
2. Click the filter dropdown
3. Select "Unresolved" from the dropdown menu
4. The page will reload showing only unresolved topics
5. The URL will update to include `?filter=unresolved`

**To view all topics:**
1. Click the filter dropdown
2. Select "All Topics" or the default filter option
3. The page will show all topics regardless of resolved status

---

## Common Use Cases

### For Question-Based Forums
1. User posts a question
2. Community members provide answers
3. Original poster or moderator marks the topic as resolved once the question is answered
4. Other users can filter for unresolved questions to find topics that still need help and provide answers to those posts

### For Support Requests
1. User requests help with an issue
2. Support team provides assistance
3. Once the issue is resolved, the topic is marked as resolved
4. Support team can filter unresolved topics to prioritize open requests

---

## Automated Testing

### Test File Location
Automated tests for the mark-resolved feature are located at:
```
/test/mark-resolved.js
```

### Running Tests
To run the automated tests:
```bash
npm run test
```

The tests will run automatically as part of the full test suite. To run only the mark-resolved tests:
```bash
npx mocha test/mark-resolved.js
```

### Test Coverage

We believe that the test suite includes comprehensive coverage across three main areas:

#### 1. Database Schema Tests (Lines 35-118)
**What is tested:**
- Resolved field is properly defined in database schema
- Resolved field is stored as an integer (0 or 1)
- New topics initialize with resolved field as 0 or undefined
- resolvedBy field stores user ID correctly
- resolvedAt field stores timestamp correctly
- Topic data retrieval includes resolved fields
- Fields are parsed as integers (not strings)

**Why these tests are sufficient:**
These tests ensure the database layer correctly stores and retrieves resolved status, which is the foundation for the entire feature. By testing that the schema includes the necessary fields and that data is stored/retrieved with proper data types, we verify the persistence layer works correctly.

#### 2. Button and Socket Handler Tests (Lines 120-225)
**What is tested:**
- Socket handlers for resolve/unresolve are defined
- Resolve/Unresolve button marks topic as resolved via socket
- Input validation prevents invalid resolve requests
- Resolved status updates immediately after button click
- Topic author can resolve their own topic
- Administrators can resolve any topic
- General users cannot resolve topics they don't own
- Cannot resolve already-resolved topics (prevents duplicate actions)
- Topic data includes resolved flag for UI indicator
- Unresolve updates UI data correctly

**Why these tests are sufficient:**
These tests cover all permission scenarios and user interactions with the resolve/unresolve buttons. They verify that:
- Only authorized users can mark topics as resolved
- The feature properly validates input and prevents invalid states
- The UI receives the correct data to display indicators
- Both resolve and unresolve actions work correctly

#### 3. Filter Functionality Tests (Lines 227-345)
**What is tested:**
- Filter shows only resolved topics when "resolved" filter is applied
- Returned topics have resolved = 1 when filtering by resolved
- Filter shows only unresolved topics when "unresolved" filter is applied
- Returned topics have resolved != 1 when filtering by unresolved
- All topics are shown when no filter is applied

**Why these tests are sufficient:**
These tests verify that the filtering mechanism works correctly in both directions (showing resolved and unresolved topics). By creating multiple resolved and unresolved topics and checking that the correct ones appear in each filter view, we ensure users can effectively find topics based on resolved status.

### Test Data Setup
The tests create:
- Admin user with full privileges
- Regular user with standard permissions
- Test category for creating topics
- Multiple test topics in various resolved states

This setup ensures tests run in isolation and accurately simulate real-world usage scenarios.

### Test Methodology
- **Comprehensive coverage**: Tests cover database layer, API layer, permissions, and filtering
- **Permission testing**: Verifies authorization rules for different user types
- **State transitions**: Tests both marking as resolved and unmarking (unresolve)
- **Edge cases**: Includes tests for invalid input, duplicate actions, and unauthorized access
- **Integration testing**: Tests verify the entire flow from button click to database update to UI update

### Why We Believe Test Coverage is Sufficient

The test suite provides sufficient coverage because:

1. **Database Layer**: Confirms data persistence and retrieval work correctly
2. **Business Logic**: Validates all permission rules and state transitions
3. **API Layer**: Verifies socket handlers process requests correctly
4. **Filtering**: Ensures users can find topics based on resolved status
5. **Error Handling**: Tests invalid inputs and unauthorized access attempts
6. **State Management**: Verifies topics can transition between resolved/unresolved states
7. **User Experience**: Confirms UI receives correct data to display indicators

The tests follow best practices by:
- Testing behavior, not implementation details
- Covering happy paths and error cases
- Verifying permissions and authorization
- Testing state transitions and edge cases
- Ensuring data integrity throughout the application

---

## Technical Implementation Details

### Frontend Components
- **Button Component**: `/public/src/client/topic/threadTools.js` (lines 86-124)
- **State Management**: `/public/src/client/topic/threadTools.js` (lines 459-477)
- **Template**: `/vendor/nodebb-theme-harmony-2.1.15/templates/partials/topic/resolve.tpl`
- **Filter Template**: `/vendor/nodebb-theme-harmony-2.1.15/templates/partials/topic-filters.tpl`

### Backend Components
- **Socket Handlers**: Defined in `/src/socket.io/topics.js`
- **Database Schema**: Integer fields `resolved`, `resolvedBy`, `resolvedAt` in topics table
- **Filter Logic**: Implemented in `/src/categories.js` (getCategoryTopics function)

### API Endpoints
- **Mark Resolved**: `PUT /api/topics/:tid/resolve`
- **Mark Unresolved**: `DELETE /api/topics/:tid/resolve`

### Socket Events
- **resolve**: Emits when topic is marked as resolved
- **unresolve**: Emits when topic is marked as unresolved

---

## Troubleshooting

### Button Not Appearing
- **Solution**: Verify you have permission to mark the topic as resolved (must be topic author or moderator/admin).

### Filter Not Working
- **Solution**: Clear your browser cache and refresh the page.
- **Solution**: Check that the URL includes the filter parameter (`?filter=resolved` or `?filter=unresolved`).

### Cannot Mark Topic as Resolved
- **Error**: "No privileges" - You must be the topic author, moderator, or administrator.
- **Error**: "Topic already resolved" - The topic is already marked as resolved. Use the unresolve button instead.

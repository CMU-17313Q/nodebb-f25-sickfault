# Features
## [Mark Resolved](#mark-resolved-feature---user-guide)
## [User Public Categories](#user-public-categories-feature---user-guide)
## [Search](#search-feature---user-guide)

---

# Mark Resolved Feature - User Guide

## Overview

The Mark Resolved feature allows users to mark forum topics as resolved or unresolved, helping community members quickly identify which discussions have been answered or completed. This feature includes three main components:

1. **Mark Resolved Button** - Toggle button to mark topics as resolved/unresolved
2. **Resolved Indicator** - Visual indicator showing when a topic is resolved
3. **Resolved Filter** - Filter to view only resolved or unresolved topics

---

## Feature Components

### 1. Mark Resolved/Unresolved Button

#### Location
The Mark Resolved button appears on individual topic pages in the topic toolbar, alongside other topic management tools such as Mark Unread, Watching, etc.

#### Who Can Use It
- **Topic Author**: Can mark their own topics as resolved or unresolved
- **Administrators**: Can mark any topic as resolved or unresolved
- **Moderators**: Can mark any topic as resolved or unresolved
- **Regular Users**: **CANNOT** mark other users' topics as resolved

#### How to Use

**To mark a topic as resolved:**
1. Navigate to the topic page you want to mark as resolved
2. Look for the "Mark Resolved" button (with a blue checkmark icon) in the topic toolbar
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
- On the topic page: Resolving/unresolving will show in the topic action/event history
- In the category page: Appears underneath the topic title in category views

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
2. Select "All Topics" which is the default filter option
3. The page will show all topics regardless of resolved status

---

## Common Use Cases

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

## Automated Testing (All Features)

### Test File Location
Automated tests are located at:
```
/test/mark-resolved.js
```

### Running Tests
To run the automated tests:
```bash
npm run test
```

The tests will run automatically as part of the full test suite.
To run only the mark-resolved tests:
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
- General users **CANNOT** resolve topics they don't own
- **CANNOT** resolve already-resolved topics (prevents duplicate actions)
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

## Troubleshooting

### Button Not Appearing
- **Solution**: Verify you have permission to mark the topic as resolved (must be topic author or moderator/admin).

### Filter Not Working
- **Solution**: Clear your browser cache and refresh the page.
- **Solution**: Check that the URL includes the filter parameter (`?filter=resolved` or `?filter=unresolved`).

### CANNOT Mark Topic as Resolved
- **Error**: "No privileges" - You must be the topic author, moderator, or administrator.
- **Error**: "Topic already resolved" - The topic is already marked as resolved. Use the unresolve button instead.

---

# User Public Categories Feature - User Guide

## Overview

The User Public Categories feature allows logged-in users to create and manage their own private categories with granular member control. This feature includes five main components:

1. **Create New Category Button** - Button to create a private category you own
2. **My Categories Button** - View and manage categories you have created
3. **Manage Members Button** - Invite or remove members from your category
4. **Delete Category Button** - Permanently delete your owned category
5. **Lock Icon Indicator** - Visual indicator showing user-created private categories

---

## Activation

To activate the User Public Categories plugin:

1. Install the plugin:
```bash
npm install
```

2. Navigate plugin:
- Login as Admin
- Go to Admin Panel
- Extend > Plugins > nodebb-plugin-user-public-categories
- Activate the plugin

3. Rebuild and restart NodeBB:
```bash
./nodebb build
./nodebb restart
```

The plugin is now active and the buttons will appear on the categories page for logged-in users.

---

## Feature Components

### 1. Create New Category Button

#### Location
The Create New Category button appears on the categories list page (`/categories`), displayed below the page header alongside the "My Categories" button.

#### Who Can Use It
- **Logged-in Users**: Can create their own private categories
- **Guests**: **CANNOT** create categories (must be logged in)

#### How to Use

**To create a new category:**
1. Navigate to the categories page (`/categories`)
2. Look for the "Create New Category" button (blue button with plus icon)
3. Click the "Create New Category" button
4. A modal dialog will appear with a form
5. Enter the category name 
6. Optionally enter a description 
7. Click "Create Category" button
10. The category is private by default - only you can access it until you invite members

**Validation rules:**
- Category name must be at least 3 characters
- Category name cannot exceed 100 characters
- Description is optional but limited to 500 characters

#### Visual Elements
- **Create New Category button**: Blue primary button with plus icon (`fa-plus`)
- **Modal dialog**: Standard Bootstrap modal with form fields

---

### 2. My Categories Button

#### Purpose
The My Categories button allows users to view a list of all categories they have created, along with member counts and quick access links.

#### Location
The button appears on the categories list page (`/categories`), displayed below the page header next to the "Create New Category" button.

#### How to Use

**To view your owned categories:**
1. Navigate to the categories page (`/categories`)
2. Look for the "My Categories" button (blue info button with list icon)
3. Click the "My Categories" button
4. A modal dialog will appear showing all categories you own
5. Each category displays:
   - Category name (clickable link)
   - Category description (if provided)
   - Member count
   - "View" button to navigate to the category
6. Click any category name or "View" button to navigate to that category
7. If you haven't created any categories, a message will display: "You haven't created any categories yet."

---

### 3. Manage Members Button

#### Location
The Manage Members button appears on individual category pages, in the category controls/header area, but ONLY for categories you own.

#### Who Can Use It
- **Category Owner**: Can manage members of their own categories
- **Other Users**: **CANNOT** see or use this button

#### How to Use

**To invite a member:**
1. Navigate to a category you own
2. Look for the "Manage Members" button (blue info button with users icon)
3. Click the "Manage Members" button
4. A modal dialog will appear with an invite form and member list
5. Enter the username of the person you want to invite
6. Click the "Invite" button (or press Enter)
7. If successful, the user will be added to the member list
8. The invited user will receive read and create privileges for the category

**To remove a member:**
1. Open the Manage Members modal
2. Find the member you want to remove in the "Current Members" list
3. Click the red "Remove" button next to their name
4. The member will be removed from the category immediately
5. The removed user will lose all access to the category

**Invite validation:**
- Username must exist in the system
- User cannot already be a member of the category
- Owner cannot remove themselves from the category
- Empty username field will show an error

#### Visual Elements
- **Manage Members button**: Blue info button with users icon (`fa-users`)
- **Member list**: Shows profile picture, username, and owner badge
- **Remove button**: Red danger button (only shows for non-owner members)
- **Invite input**: Text field with attached "Invite" button

---

### 4. Delete Category Button

#### Location
The Delete Category button appears on individual category pages, in the category controls/header area, next to the "Manage Members" button, but ONLY for categories you own.

#### Who Can Use It
- **Category Owner**: Can delete their own categories
- **Other Users**: **CANNOT** see or use this button

#### How to Use

**To delete a category:**
1. Navigate to a category you own
2. Look for the "Delete Category" button (red button with trash icon)
3. Click the "Delete Category" button
4. A confirmation dialog will appear warning that this action is permanent
6. Click "Delete" to confirm
7. If confirmed, the category and all its content will be permanently deleted
8. You will be redirected to the categories page

**Important warnings:**
- Deletion is permanent and **CANNOT** be undone

#### Visual Elements
- **Delete Category button**: Red danger button with trash icon (`fa-trash`)
- **Confirmation dialog**: Bootstrap confirmation modal with warning message
- **Loading state**: Spinner icon shows while category is being deleted

---

## Common Use Cases

### For Study Groups
1. User creates a private category for their study group
2. Invites fellow students using their usernames
3. Group members can create topics for different subjects
4. Only invited members can see and participate
5. Owner can remove members if they leave the group

### For Project Teams
1. Project leader creates a category for team collaboration
2. Invites team members to the private category
3. Team can discuss project details privately
4. Track project progress through dedicated topics
5. Delete category when project is completed

### For Private Communities
1. Community organizer creates a category for their interest group
2. Carefully curates membership by inviting trusted members
3. Members can engage in focused discussions
4. Lock icon indicates exclusive/private nature
5. Organizer maintains control over membership

---

## Automated Testing

### Test File Location
Automated tests for the user-public-categories feature are located at:
```
/test/user-public-categories.js
```

### Running Tests
To run the automated tests:
```bash
npm run test
```

The tests will run automatically as part of the full test suite. To run only the user-public-categories tests:
```bash
npx mocha test/user-public-categories.js
```

### Test Coverage

The test suite includes comprehensive coverage across seven main areas:

#### 1. Category Creation Tests (Lines 49-98)
**What is tested:**
- Private category creation with owner assignment
- ownerUid field is properly set in database
- Owner is automatically added to members set
- Category name length validation (minimum 3 characters)
- Default group privileges are removed for privacy
- Owner receives full privileges upon creation

**Why these tests are sufficient:**
These tests ensure the foundation of the feature works correctly. By verifying that categories are created with proper ownership, privacy settings, and privilege assignments, we confirm that the core category creation flow operates as designed.

#### 2. Permission Enforcement Tests (Lines 100-115)
**What is tested:**
- Category owner can view their own category
- Non-members **CANNOT** view private category
- Administrators can view any private category
- Permission system correctly enforces access control

**Why these tests are sufficient:**
Permission enforcement is critical for private categories. These tests verify that the privacy model works correctly - owners have access, non-members are blocked, and admins have override capabilities. This ensures categories remain private as intended.

#### 3. Member Management - Invite Tests (Lines 117-163)
**What is tested:**
- Owner can invite users to their category
- Invited users are added to members set
- Invited users receive proper read and create privileges
- Duplicate invitation detection (user already a member)
- Username validation (user must exist)
- Ownership verification before allowing invites
- Administrators can bypass ownership checks

**Why these tests are sufficient:**
These tests cover the complete invite flow including validation, authorization, and privilege assignment. By testing both success and error cases (duplicates, non-existent users, ownership), we ensure the invite feature is robust and secure.

#### 4. Member Management - Remove Tests (Lines 165-204)
**What is tested:**
- Owner can remove members from their category
- Removed users are removed from members set
- Removed users lose all category privileges
- Owner **CANNOT** be removed from their own category
- Ownership verification before allowing removal
- Administrators can bypass ownership checks

**Why these tests are sufficient:**
These tests verify that member removal works correctly and includes critical safeguards like preventing owner removal. The privilege revocation check ensures removed members truly lose access to the category.

#### 5. Member List Tests (Lines 206-238)
**What is tested:**
- Category members can be retrieved from database
- Member details (username, picture, uid) are fetched correctly
- Members set exists for user-created categories
- Regular admin categories do **NOT** have members sets
- Member list includes at least the owner

**Why these tests are sufficient:**
These tests ensure the member list feature works correctly and can distinguish between user-created categories and system categories. This is important for UI display and determining which categories support member management.

#### 6. Category Deletion Tests (Lines 240-277)
**What is tested:**
- Owner can delete their own category
- Members set is cleaned up upon deletion
- Category is fully purged from system
- Category no longer exists after deletion
- Ownership verification before allowing deletion
- Administrators can bypass ownership checks

**Why these tests are sufficient:**
Deletion is a destructive operation, so these tests verify that it works completely (category and members set are both removed) and that proper authorization checks are in place. This prevents unauthorized deletions while ensuring cleanup is thorough.

#### 7. Plugin Hooks Tests (Lines 313-354)
**What is tested:**
- preserveOwnerUidOnCreate hook preserves ownerUid during category creation
- addOwnerUidToFields hook adds ownerUid to field list
- addOwnerUidToCategory hook adds ownerUid to single category data
- addOwnerUidToCategories hook adds ownerUid to multiple categories
- Hooks properly integrate with NodeBB's filter system

**Why these tests are sufficient:**
These tests verify that the plugin correctly hooks into NodeBB's category system. The hooks ensure ownerUid data persists and is available throughout the application, which is essential for all ownership checks and UI features.

### Test Methodology
- **Comprehensive coverage**: Tests cover creation, permissions, member management, deletion, and hooks
- **Permission testing**: Verifies authorization rules for owners, members, non-members, and admins
- **State validation**: Checks database state before and after operations
- **Edge cases**: Includes tests for duplicate invites, owner removal prevention, and non-existent users
- **Integration testing**: Tests verify the entire flow from UI actions to database updates
- **Cleanup verification**: Ensures deletion properly removes all traces of category

--- 

# Search Feature - User Guide

#### Purpose
The search feature lets users search a set of keywords that appears in any post (or other entites, see [UI-Features](#ui-features)) across different categories and topics. Users can search using the web UI or by using the API. 

#### Location
- On any page: The search button can be found on the bottom of the left bar
- Search page: Can be accessed through this new URI: `/search`
- API: The new endpoint can be access through this new URI: `/api/v3/search/posts` 
<img width="145" height="379" alt="image" src="https://github.com/user-attachments/assets/300e9b56-5b24-4333-895b-7ed3b19c0dc2" />

#### API Documentation
To access the API documentation:
1. set to development mode
 - For linux / macOS
```bash
set NODE_ENV=development
```
 - For windows
```bas
set NODE_ENV=development
```
2. Access this URI: `/debug/spec/write#tag/search/paths/~1search~1posts/get`

#### UI Features
The UI for searching offers has a simple interface and an advanced one, the advanced one does more than what the API does, it can:
 - Filter by:
   - Category
   - Tags
   - Poster
   - Number of replies
   - Time (e.g. in the last three month)
 - Search:
   - Titles and posts
   - Titles only
   - Posts only
   - Bookmarks
   - Categories
   - Usernames
   - Tags
 - Sort by (in ascending / descending order of):
   - Relevance
   - Post time
   - Votes
   - Last reply time
   - Topic title
   - Number of replies
   - Number of views
   - Topic votes
   - Topic start date
   - Username
   - Category
 - Show results as posts or as the topics they were found in
 - Save searching options

### Test File Location
Automated tests are located at:
```
/test/search-comprehensive.js
```

### Running Tests
To run the automated tests:
```bash
npm run test
```

The tests will run automatically as part of the full test suite. To run only the searching tests:
```bash
npx mocha test/search-comprehensive.js
```

## Troubleshooting

### Advanced search not showing results
 - **Temporary Solution**: Refresh the page without changing anything

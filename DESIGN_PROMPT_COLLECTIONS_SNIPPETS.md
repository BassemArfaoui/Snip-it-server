# Collections & Private Snippets Module - Design Prompt for Stitch AI

## Overview
Design comprehensive UI/UX for two interconnected modules in Snip-it: **Collections** (collaborative content organization) and **Private Snippets** (personal code storage with versioning). These features enable users to curate, organize, and share code snippets, posts, issues, and solutions.

---

## MODULE 1: COLLECTIONS

### Purpose
Collections allow users to organize and curate code snippets, posts, issues, and solutions into themed groups. Users can create personal collections, share them with collaborators using role-based permissions, and generate shareable links.

### Core Entities & Data Structure

#### Collection Entity
- **Basic Properties:**
  - Name: User-defined collection name (required, unique per user)
  - Description: Optional markdown description
  - Is Public: Boolean toggle for visibility
  - Owner: The user who created the collection
  - Created/Updated timestamps

- **Sharing Features:**
  - Share Token: Secure token for generating shareable links
  - Token Expiration: Optional expiry date for shared links
  - Share Link Permission: Default permission level for link access (VIEW/EDIT/ADMIN)
  - Allow Edit: Global setting for whether shared collections allow editing

- **Organizational:**
  - Items: Array of collection items (Posts, Issues, Solutions, Snippets)
  - Tags: Multiple tags for categorization and filtering
  - Collaborators: List of users with role-based access

#### Collection Items
Each item in a collection contains:
- **Target Reference:** The item ID and type (Post, Issue, Solution, Snippet)
- **Organization Flags:**
  - Is Pinned: Boolean to feature important items at top
  - Is Favorite: Boolean to mark user's favorite items
  - Order/Position: Sorting position within collection
  - Created timestamp

#### Collection Collaborators
Users added to collections with granular permissions:
- **Relationship:** User-to-Collection with unique constraint (no duplicates)
- **Permission Levels:**
  - VIEW: Read-only access, can view all items but cannot modify
  - EDIT: Can add/remove items, manage favorites and pins, modify item metadata
  - ADMIN: Full control including managing collaborators and collection settings
- **Metadata:**
  - Invited By: User who added this collaborator
  - Created timestamp

#### Tags
Collections can have multiple tags for filtering and discovery:
- Many-to-many relationship with Collections
- User-specific tags for consistency
- Display order field for custom sorting

---

### Key Features & Functionalities

#### 1. Collection CRUD Operations
- **Create:** User creates new collection with name and visibility settings
  - Validation: Name must be unique per user
  - Auto-generate share token if collection is public
  - Set default privacy and edit settings

- **Read/List:** Display all collections owned or collaborated on
  - Pagination support (page, size parameters)
  - Full-text search on collection names
  - Filter by tags
  - Display collection metadata (item count, collaborator count, last modified)

- **Read Single:** Get detailed collection view
  - Include all items with their metadata
  - Show all collaborators with permissions
  - Display share link details
  - Include tags

- **Update:** Modify collection properties
  - Change name (with uniqueness validation)
  - Toggle public/private visibility
  - Update global edit permissions
  - Manage share token settings
  - Add/remove tags

- **Delete:** Soft delete collection
  - Owner only
  - Preserves data integrity
  - All associated items remain in system

#### 2. Item Management
- **Add Items:**
  - Add any content type: Posts, Issues, Solutions, Snippets
  - Validate item exists and user has access
  - Prevent duplicate items in same collection
  - Support bulk operations
  - Permission: EDIT or ADMIN only

- **Remove Items:**
  - Delete specific items from collection
  - Items remain in original location (collection-only deletion)
  - Permission: EDIT or ADMIN only

- **Move Items:**
  - Transfer items between user's collections
  - Validate both source and destination collections exist
  - Prevent duplicate items in destination
  - Preserve item properties (pins, favorites)
  - Permission: EDIT or ADMIN for both collections

- **Organize Items:**
  - **Pin Items:** Mark important items to display first
  - **Favorite Items:** Mark preferred items for quick access
  - **Sort:** Multiple sort options (pinned, favorites, date created, alphabetical)
  - Permission: EDIT or ADMIN only

- **List Items with Filtering:**
  - Pagination support
  - Filter by content type (Post, Issue, Solution, Snippet)
  - Filter by programming language (for snippets)
  - Full-text search across item titles/content
  - Multi-sort support (field + direction)
  - Permission: VIEW or higher required

#### 3. Collaboration & Sharing

- **Add Collaborators (Owner Only):**
  - Search and add users by ID/username
  - Assign permission level (VIEW, EDIT, ADMIN)
  - Track who invited each collaborator
  - Prevent adding owner as collaborator
  - Prevent duplicate collaborators
  - Notify added user (future feature)

- **Update Collaborator Permissions (Admin Only):**
  - Change permission level for existing collaborator
  - Permission cascade applied immediately
  - Audit trail of permission changes

- **Remove Collaborators (Admin Only):**
  - Remove users from collection
  - Remove all their access tokens/sessions (future feature)

- **List Collaborators:**
  - View all collaborators with their permissions
  - Show who invited each collaborator
  - Display user information (username, email, profile)

- **Permission Enforcement:**
  - Checked on every operation
  - VIEW: Read access only
  - EDIT: Can modify items but not collection settings
  - ADMIN: Full control (same as owner)
  - Owner implicitly has ADMIN permission

#### 4. Public Sharing via Links

- **Generate Share Link (Owner Only):**
  - Create unique token-based share links
  - Set permission level for link access
  - Optional expiration date (days from now)
  - Auto-enable public visibility
  - Return shareable URL and token

- **Access via Token:**
  - Public endpoint: `/collections/share/:token`
  - No authentication required
  - Fetch collection with permission level indicated
  - Check token expiration
  - Throw error if expired or revoked

- **Revoke Share Link (Owner Only):**
  - Invalidate share token
  - Clear expiration date
  - Make collection private again
  - Immediate effect

#### 5. Tag Management

- **Assign Tags to Collections (Owner Only):**
  - Select from user's existing tags
  - Add multiple tags to collection
  - Validate tag ownership
  - Prevent duplicate tag assignments

- **Remove Tags:**
  - Unassign specific tag from collection
  - No cascade deletion of tag itself

- **List Tags:**
  - View all tags on a collection
  - Display in custom sort order
  - Used for filtering and discovery

---

## MODULE 2: PRIVATE SNIPPETS

### Purpose
Private Snippets enable users to store code snippets privately, manage versions, organize with tags, and later publish them as Posts. Each snippet contains code with metadata and maintains a complete version history.

### Core Entities & Data Structure

#### Private Snippet Entity
- **Content:**
  - Snippet: Reference to shared Snippet entity (contains title, content, language)
  - User: Owner of the private snippet
  - Post Flag: Boolean indicating if snippet has been published

- **Organization:**
  - Tags: Multiple tags for categorization and filtering
  - Versions: Complete version history with snapshots
  - Timestamps: Created and last updated timestamps

#### Snippet Entity (Shared)
- **Code Content:**
  - Title: Snippet name (unique per user)
  - Content: Actual code (supports large text)
  - Language: Programming language for syntax highlighting

- **Metadata:**
  - Posted: Boolean indicating if published as Post
  - Created/Updated: Timestamp tracking

#### Private Snippet Version Entity
- **Version Snapshot:**
  - Version Number: Sequential version number (1, 2, 3...)
  - Title Snapshot: Title at time of version
  - Content Snapshot: Code at time of version
  - Language Snapshot: Language at time of version
  - Created Timestamp: When version was created

- **Relationship:**
  - Links back to PrivateSnippet
  - Automatically created when snippet is updated

---

### Key Features & Functionalities

#### 1. Snippet CRUD Operations

- **Create:**
  - Accept optional title, required content, and language
  - Auto-title support (optional)
  - Validation: Title unique per user (if provided)
  - Returns created snippet with generated ID
  - Automatically creates version 1

- **Read/List:**
  - Pagination support (page, size parameters)
  - Filter by language
  - Full-text search on title and content
  - Filter by tags
  - Excludes published snippets (posted=true)
  - Show snippet metadata (language, lines of code, last modified)

- **Read Single:**
  - Detailed view of snippet
  - Include all versions (sorted by version number descending)
  - Show all tags
  - Display content length/statistics
  - Timestamps and version info

- **Update:**
  - Modify title, content, or language
  - Validation: Title uniqueness check (if changed)
  - Automatically creates new version with snapshot
  - Version number increments
  - Updates modified timestamp
  - Preserves all previous versions

- **Delete:**
  - Soft delete of snippet
  - Marks as deleted in database
  - Versions remain for audit trail

#### 2. Version Management

- **Automatic Versioning:**
  - Every update creates new version automatically
  - Version number increments sequentially
  - Full snapshot of title, content, language at time of save
  - Preserves original with timestamp

- **View Version History:**
  - List all versions of a snippet
  - Pagination support
  - Sorted by version number (newest first)
  - Show metadata: version number, timestamp, content length

- **Delete Specific Version:**
  - Remove individual versions from history
  - Cannot delete version (constraint: keep at least one)
  - Useful for cleanup of experimental versions
  - Soft delete maintains audit trail

- **Revert to Version (Future):**
  - Restore previous version as current
  - Creates new version with old content
  - Preserves full history

#### 3. Tag Management

- **Assign Tags:**
  - Add tags to private snippet
  - Select from user's tag library
  - Validate tag ownership
  - Prevent duplicate assignments
  - Update timestamp changes

- **Remove Tags:**
  - Unassign specific tag
  - No cascade effects
  - Update timestamp changes

- **List Tags:**
  - View all tags on snippet
  - Display in sort order
  - Used for filtering and discovery

- **Filter by Tags:**
  - Snippets list view supports tag filtering
  - Multiple tags = OR logic (match any tag)
  - Combine with other filters

#### 4. Publishing to Posts

- **Transform to Post (Owner Only):**
  - Convert private snippet to public Post
  - Input: Title and description
  - Optional: Set as draft or publish
  - Behavior:
    - Create new Post entity
    - Link to same Snippet
    - Set snippet.posted = true (hide from private list)
    - Copy metadata (language, author)
    - Return created post

- **Snippet Constraints After Publishing:**
  - Snippet still belongs to user but marked as posted
  - Cannot be deleted while published
  - Cannot be edited after publishing (prevents sync issues)

#### 5. Organization & Discovery

- **Full-Text Search:**
  - Search across title and content
  - Case-insensitive matching
  - Substring matching support

- **Filter Options:**
  - Language: Filter by programming language
  - Tags: Filter by one or more tags
  - Posted Status: Show only private (not published)

- **Sorting:**
  - By date created (newest/oldest)
  - By last modified (useful for frequent updates)
  - By title (alphabetical)
  - Default: by creation date descending

- **Pagination:**
  - Configurable page size (default 20, max 100)
  - Total count and page metadata
  - Seamless navigation through large libraries

---

## DATA RELATIONSHIPS

### Collections Relationships
```
User (1) ──► (N) Collection
Collection (1) ──► (N) CollectionItem
Collection (1) ──► (N) CollectionCollaborator ◄── (N) User
Collection (N) ◄──► (N) Tag
Collection (1) ──► (N) Post/Issue/Solution/Snippet (via items)
```

### Private Snippets Relationships
```
User (1) ──► (N) PrivateSnippet
PrivateSnippet (1) ──► (1) Snippet
PrivateSnippet (1) ──► (N) PrivateSnippetVersion
PrivateSnippet (N) ◄──► (N) Tag
Snippet (1) ──► (N) Post (when published)
```

---

## PERMISSION MATRIX

### Collections Permissions
| Operation | Owner | EDIT Collaborator | VIEW Collaborator | Public Link (EDIT) | Public Link (VIEW) |
|-----------|-------|-------------------|-------------------|-------------------|-------------------|
| View Collection | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit Properties | ✓ | ✗ | ✗ | ✗ | ✗ |
| Add Item | ✓ | ✓ | ✗ | ✓ | ✗ |
| Remove Item | ✓ | ✓ | ✗ | ✓ | ✗ |
| Pin/Favorite Item | ✓ | ✓ | ✗ | ✓ | ✗ |
| Move Item | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Collaborators | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Tags | ✓ | ✗ | ✗ | ✗ | ✗ |
| Share via Link | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete Collection | ✓ | ✗ | ✗ | ✗ | ✗ |

### Private Snippets Permissions
| Operation | Owner | Other Users |
|-----------|-------|-------------|
| Create | ✓ | ✗ |
| View Own | ✓ | ✗ |
| View Others | ✗ | ✗ (private) |
| Edit | ✓ | ✗ |
| Delete | ✓ | ✗ |
| View Versions | ✓ | ✗ |
| Delete Version | ✓ | ✗ |
| Assign Tags | ✓ | ✗ |
| Publish to Post | ✓ | ✗ |

---

## API ENDPOINTS SUMMARY

### Collections Endpoints
- `POST /collections` - Create collection
- `GET /collections` - List user's collections (paginated, searchable, filterable)
- `GET /collections/:id` - Get collection details
- `PUT /collections/:id` - Update collection
- `DELETE /collections/:id` - Delete collection

- `POST /collections/:id/items` - Add item to collection
- `DELETE /collections/:id/items` - Remove item
- `POST /collections/:id/items/move` - Move item between collections
- `POST /collections/:id/items/favorite` - Toggle favorite
- `GET /collections/:id/items` - List collection items (paginated, filterable)

- `POST /collections/:id/collaborators` - Add collaborator
- `GET /collections/:id/collaborators` - List collaborators
- `PATCH /collections/:id/collaborators/:collaboratorId` - Update permission
- `DELETE /collections/:id/collaborators/:collaboratorId` - Remove collaborator

- `POST /collections/:id/share` - Generate share link
- `DELETE /collections/:id/share` - Revoke share link
- `GET /collections/share/:token` - Access shared collection (public)

- `POST /collections/:id/tags/:tagId` - Assign tag
- `DELETE /collections/:id/tags/:tagId` - Remove tag
- `GET /collections/:id/tags` - List tags

### Private Snippets Endpoints
- `POST /private-snippets` - Create snippet
- `GET /private-snippets` - List snippets (paginated, searchable, filterable)
- `PUT /private-snippets/:id` - Update snippet
- `DELETE /private-snippets/:id` - Delete snippet

- `GET /private-snippets/:id/versions` - List versions (paginated)
- `DELETE /private-snippets/:id/versions/:versionId` - Delete version

- `POST /private-snippets/:id/transform` - Publish as post
- `POST /private-snippets/:id/tags/:tagId` - Assign tag
- `DELETE /private-snippets/:id/tags/:tagId` - Remove tag
- `GET /private-snippets/:id/tags` - List tags

---

## UI/UX CONSIDERATIONS

### Collections UI
1. **Collection List View:** Card-based layout showing collection name, item count, collaborators, and quick actions
2. **Collection Detail/Edit View:** Full collection settings, collaborator management, share options
3. **Item Management:** Drag-and-drop organization, inline pin/favorite toggles
4. **Collaborator Dialog:** User search, permission selector, remove action
5. **Share Link Generator:** Token display, permission selector, expiration picker, copy button
6. **Item Filtering/Sorting:** Multi-filter sidebar, sort dropdown, search bar

### Private Snippets UI
1. **Snippet List View:** Code preview, language badge, tag pills, metadata (lines, date)
2. **Snippet Editor:** Full code editor with syntax highlighting, language selector, title field
3. **Version History:** Timeline or list view showing versions with timestamps and ability to delete
4. **Publish Dialog:** Title and description fields for post creation, draft/publish toggle
5. **Tag Management:** Tag selector with existing tags, ability to create new
6. **Filter/Search:** Language filter, tag filter, full-text search, sort options

---

## Performance Considerations
- Pagination on all list views (default 20, max 100 items per page)
- Lazy load collaborator details and nested items
- Cache frequently accessed collections
- Index on userId, status, and timestamps
- Optimize queries with eager loading of relations

---

## Security Considerations
- Permission checks on every operation (user-level authorization)
- Share tokens cryptographically secure (32 bytes)
- Soft deletes maintain audit trail
- User isolation - cannot see others' collections unless invited
- Share link access restricted to valid tokens and expiration
- Sensitive data sanitization in responses (remove user passwords/emails)

---

## Analytics & Tracking (Optional)
- Collection usage metrics (items added, collaborators, shares)
- Popular snippets (most viewed/used)
- User collaboration patterns
- Version history for compliance
- Share link click-through rates

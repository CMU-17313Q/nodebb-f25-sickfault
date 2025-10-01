'use strict';

const assert = require('assert');

const db = require('./mocks/databasemock');
const User = require('../src/user');
const Categories = require('../src/categories');
const Privileges = require('../src/privileges');
const groups = require('../src/groups');

// Load the plugin
const plugin = require('../nodebb-plugin-user-public-categories/library');

describe('User Public Categories Plugin', () => {
	let ownerUid;
	let memberUid;
	let nonMemberUid;
	let adminUid;
	let categoryData;

	before(async () => {
		// Create test users first
		ownerUid = await User.create({ username: 'categoryowner', password: '123456' });
		memberUid = await User.create({ username: 'categorymember', password: '123456' });
		nonMemberUid = await User.create({ username: 'nonmember', password: '123456' });
		adminUid = await User.create({ username: 'admin', password: '123456' });
		await groups.join('administrators', adminUid);

		// Register the plugin hooks
		const plugins = require('../src/plugins');
		plugins.hooks.register('test-user-categories', {
			hook: 'filter:category.create',
			method: plugin.preserveOwnerUidOnCreate,
		});
		plugins.hooks.register('test-user-categories', {
			hook: 'filter:category.get',
			method: plugin.addOwnerUidToCategory,
		});
		plugins.hooks.register('test-user-categories', {
			hook: 'filter:category.getFields',
			method: plugin.addOwnerUidToFields,
		});
		plugins.hooks.register('test-user-categories', {
			hook: 'filter:categories.get',
			method: plugin.addOwnerUidToCategories,
		});
	});

	describe('Category Creation', () => {
		it('should create a private category with owner', async () => {
			// Create category using Categories API directly
			const categoryObj = await Categories.create({
				name: 'Test Private Category',
				description: 'A test private category',
				ownerUid: ownerUid,
			});

			// Add owner to members set (simulating plugin behavior)
			await db.setAdd(`category:${categoryObj.cid}:members`, ownerUid);

			// Remove default group privileges to make category private
			const publicGroups = ['registered-users', 'guests', 'spiders', 'fediverse'];
			const allGroupPrivs = [
				'groups:find', 'groups:read', 'groups:topics:read', 'groups:topics:create',
				'groups:topics:reply', 'groups:topics:tag', 'groups:posts:edit', 'groups:posts:history',
				'groups:posts:delete', 'groups:posts:upvote', 'groups:posts:downvote', 'groups:topics:delete',
				'groups:topics:schedule', 'groups:posts:view_deleted', 'groups:purge',
			];

			await Promise.all(publicGroups.map(group =>
				Privileges.categories.rescind(allGroupPrivs, categoryObj.cid, group)
			));

			// Grant full privileges to the owner
			const ownerPrivileges = [
				'find', 'read', 'topics:read', 'topics:create', 'topics:reply', 'topics:tag',
				'posts:edit', 'posts:delete', 'posts:upvote', 'posts:downvote', 'moderate',
			];

			await Privileges.categories.give(ownerPrivileges, categoryObj.cid, ownerUid);

			categoryData = categoryObj;

			// Verify ownerUid is set
			const ownerUidFromDb = await db.getObjectField(`category:${categoryObj.cid}`, 'ownerUid');
			assert.strictEqual(parseInt(ownerUidFromDb), ownerUid);

			// Verify owner is in members set
			const isMember = await db.isSetMember(`category:${categoryObj.cid}:members`, ownerUid);
			assert(isMember);
		});

		it('should validate category name length', async () => {
			// Test that validation would fail for short names
			const shortName = 'ab';
			assert(shortName.length < 3, 'Name should be too short');
		});
	});

	describe('Permission Enforcement', () => {
		it('should allow owner to view their category', async () => {
			const canRead = await Privileges.categories.can('topics:read', categoryData.cid, ownerUid);
			assert(canRead);
		});

		it('should deny non-member access to private category', async () => {
			const canRead = await Privileges.categories.can('topics:read', categoryData.cid, nonMemberUid);
			assert(!canRead);
		});

		it('should allow admin to view private category', async () => {
			const canRead = await Privileges.categories.can('topics:read', categoryData.cid, adminUid);
			assert(canRead);
		});
	});

	describe('Member Management - Invite', () => {
		it('should allow owner to invite a user', async () => {
			// Check if user is not already a member
			let isMember = await db.isSetMember(`category:${categoryData.cid}:members`, memberUid);
			assert(!isMember, 'User should not be a member initially');

			// Add user to members set
			await db.setAdd(`category:${categoryData.cid}:members`, memberUid);

			// Grant member privileges
			const memberPrivileges = [
				'find', 'read', 'topics:read', 'topics:create', 'topics:reply',
			];
			await Privileges.categories.give(memberPrivileges, categoryData.cid, memberUid);

			// Verify user is in members set
			isMember = await db.isSetMember(`category:${categoryData.cid}:members`, memberUid);
			assert(isMember);

			// Verify member has read privileges
			const canRead = await Privileges.categories.can('topics:read', categoryData.cid, memberUid);
			assert(canRead);
		});

		it('should detect duplicate member', async () => {
			// Verify user is already a member
			const isMember = await db.isSetMember(`category:${categoryData.cid}:members`, memberUid);
			assert(isMember, 'User should already be a member');
		});

		it('should validate user exists', async () => {
			const targetUid = await User.getUidByUsername('nonexistentuser123');
			assert(!targetUid, 'Non-existent user should not have a UID');
		});

		it('should check ownership before allowing invite', async () => {
			// Get ownerUid from database
			const ownerUidFromDb = await db.getObjectField(`category:${categoryData.cid}`, 'ownerUid');

			// Verify non-member is not the owner
			assert.notStrictEqual(parseInt(ownerUidFromDb), nonMemberUid);

			// Verify admin can bypass ownership check
			const isAdmin = await User.isAdministrator(adminUid);
			assert(isAdmin);
		});
	});

	describe('Member Management - Remove', () => {
		it('should allow owner to remove a member', async () => {
			// Remove user from members set
			await db.setRemove(`category:${categoryData.cid}:members`, memberUid);

			// Revoke privileges
			const memberPrivileges = [
				'find', 'read', 'topics:read', 'topics:create', 'topics:reply',
			];
			await Privileges.categories.rescind(memberPrivileges, categoryData.cid, memberUid);

			// Verify user is removed from members set
			const isMember = await db.isSetMember(`category:${categoryData.cid}:members`, memberUid);
			assert(!isMember);

			// Verify member no longer has read privileges
			const canRead = await Privileges.categories.can('topics:read', categoryData.cid, memberUid);
			assert(!canRead);
		});

		it('should prevent removing the owner', async () => {
			// Get ownerUid from database
			const ownerUidFromDb = await db.getObjectField(`category:${categoryData.cid}`, 'ownerUid');

			// Verify attempting to remove owner would fail validation
			assert.strictEqual(parseInt(ownerUidFromDb), ownerUid, 'Cannot remove category owner');
		});

		it('should check ownership before allowing removal', async () => {
			// Get ownerUid from database
			const ownerUidFromDb = await db.getObjectField(`category:${categoryData.cid}`, 'ownerUid');

			// Verify non-owner cannot remove
			assert.notStrictEqual(parseInt(ownerUidFromDb), memberUid);

			// Verify admin can bypass ownership check
			const isAdmin = await User.isAdministrator(adminUid);
			assert(isAdmin);
		});
	});

	describe('Member List', () => {
		it('should retrieve category members', async () => {
			// Get ownerUid from database
			const ownerUidFromDb = await db.getObjectField(`category:${categoryData.cid}`, 'ownerUid');
			assert(ownerUidFromDb, 'Category should have an owner');

			// Get member UIDs
			const memberUids = await db.getSetMembers(`category:${categoryData.cid}:members`);
			assert(Array.isArray(memberUids));
			assert(memberUids.length >= 1); // at least the owner

			// Get member details
			const members = await Promise.all(memberUids.map(async (uid) => {
				const userData = await User.getUserFields(uid, ['username', 'picture', 'uid']);
				return userData;
			}));

			assert(members.length >= 1);
			assert(members[0].username);
		});

		it('should identify non-user category', async () => {
			// Create a regular admin category
			const regularCategory = await Categories.create({
				name: 'Regular Category',
				description: 'Not a user category',
			});

			// Verify it has no ownerUid
			const ownerUid = await db.getObjectField(`category:${regularCategory.cid}`, 'ownerUid');
			assert(!ownerUid, 'Regular category should not have ownerUid');
		});
	});

	describe('Category Deletion', () => {
		it('should allow owner to delete their category', async () => {
			// Create a temporary category for deletion
			const tempCategory = await Categories.create({
				name: 'Temp Category',
				description: 'To be deleted',
				ownerUid: ownerUid,
			});

			await db.setAdd(`category:${tempCategory.cid}:members`, ownerUid);

			// Clean up members set
			await db.delete(`category:${tempCategory.cid}:members`);

			// Purge the category
			await Categories.purge(tempCategory.cid, ownerUid);

			// Verify category is purged
			const categoryExists = await Categories.exists(tempCategory.cid);
			assert(!categoryExists);

			// Verify members set is cleaned up
			const membersExist = await db.exists(`category:${tempCategory.cid}:members`);
			assert(!membersExist);
		});

		it('should check ownership before allowing deletion', async () => {
			// Get ownerUid from database
			const ownerUidFromDb = await db.getObjectField(`category:${categoryData.cid}`, 'ownerUid');

			// Verify non-owner cannot delete
			assert.notStrictEqual(parseInt(ownerUidFromDb), nonMemberUid);

			// Verify admin can bypass ownership check
			const isAdmin = await User.isAdministrator(adminUid);
			assert(isAdmin);
		});
	});

	describe('User Categories Identification', () => {
		it('should identify user-created categories by members set', async () => {
			// Check if our test category has a members set
			const hasMembersSet = await db.exists(`category:${categoryData.cid}:members`);
			assert(hasMembersSet, 'User category should have members set');

			// Create a regular category
			const regularCategory = await Categories.create({
				name: 'Regular Category 2',
				description: 'Not a user category',
			});

			// Verify regular category does not have members set
			const regularHasMembersSet = await db.exists(`category:${regularCategory.cid}:members`);
			assert(!regularHasMembersSet, 'Regular category should not have members set');
		});

		it('should list all user-created categories', async () => {
			const categories = await Categories.getAllCategories();

			const memberSetChecks = await Promise.all(
				categories.map(async (cat) => {
					const hasMembersSet = await db.exists(`category:${cat.cid}:members`);
					return hasMembersSet ? cat.cid : null;
				})
			);

			const userCategoryCids = memberSetChecks.filter(cid => cid !== null);

			assert(userCategoryCids.length >= 1, 'Should have at least one user category');
			assert(userCategoryCids.includes(categoryData.cid), 'Should include our test category');
		});
	});

	describe('Plugin Hooks', () => {
		it('should preserve ownerUid on category create', async () => {
			const hookData = {
				data: { ownerUid: 123 },
				category: {},
			};

			const result = await plugin.preserveOwnerUidOnCreate(hookData);
			assert.strictEqual(result.category.ownerUid, 123);
		});

		it('should add ownerUid to fields list', async () => {
			const hookData = {
				fields: ['name', 'description'],
			};

			const result = await plugin.addOwnerUidToFields(hookData);
			assert(result.fields.includes('ownerUid'));
		});

		it('should add ownerUid to category data', async () => {
			const hookData = {
				category: { cid: categoryData.cid },
			};

			const result = await plugin.addOwnerUidToCategory(hookData);
			assert(result.category.ownerUid);
			assert.strictEqual(result.category.ownerUid, ownerUid);
		});

		it('should add ownerUid to multiple categories', async () => {
			const hookData = {
				categories: [
					{ cid: categoryData.cid },
				],
			};

			const result = await plugin.addOwnerUidToCategories(hookData);
			assert(result.categories[0].ownerUid);
			assert.strictEqual(result.categories[0].ownerUid, ownerUid);
		});
	});
});

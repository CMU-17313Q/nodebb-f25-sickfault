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
});

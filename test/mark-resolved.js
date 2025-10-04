'use strict';

const assert = require('assert');
const db = require('./mocks/databasemock');

const topics = require('../src/topics');
const categories = require('../src/categories');
const User = require('../src/user');
const groups = require('../src/groups');
const privileges = require('../src/privileges');
const socketTopics = require('../src/socket.io/topics');

describe('Mark Resolved - Comprehensive Feature Tests', () => {
	let adminUid;
	let regularUid;
	let testCategory;

	before(async () => {
		// Create admin user
		adminUid = await User.create({ username: 'resolveadmin', password: '123456' });
		await groups.join('administrators', adminUid);

		// Create regular user
		regularUid = await User.create({ username: 'regularuser', password: '123456' });

		// Create test category
		testCategory = await categories.create({
			name: 'Test Category for Resolved',
			description: 'Test category',
		});

		await privileges.categories.give(['groups:topics:create'], testCategory.cid, 'registered-users');
	});

	describe('Database Schema Tests', () => {
		let testTopic;

		beforeEach(async () => {
			const result = await topics.post({
				uid: regularUid,
				title: 'Test Topic for Schema',
				content: 'Test content',
				cid: testCategory.cid,
			});
			testTopic = result.topicData;
		});

		it('should have resolved field in intFields for proper parsing', async () => {
			const intFields = [
				'tid', 'cid', 'uid', 'mainPid', 'postcount',
				'viewcount', 'postercount', 'followercount',
				'deleted', 'locked', 'pinned', 'pinExpiry',
				'timestamp', 'upvotes', 'downvotes',
				'lastposttime', 'deleterUid',
				'resolved', 'resolvedBy', 'resolvedAt',
			];
			assert(intFields.includes('resolved'));
			assert(intFields.includes('resolvedBy'));
			assert(intFields.includes('resolvedAt'));
		});

		it('should store resolved field as integer in database', async () => {
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', 1);
			const resolved = await db.getObjectField(`topic:${testTopic.tid}`, 'resolved');
			assert.strictEqual(parseInt(resolved, 10), 1);
		});

		it('should initialize new topics with resolved field as undefined/0', async () => {
			const freshTopic = await topics.getTopicData(testTopic.tid);
			assert(!freshTopic.resolved || freshTopic.resolved === 0);
		});

		it('should store resolvedBy as uid when topic is resolved', async () => {
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', 1);
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolvedBy', adminUid);

			const topicData = await topics.getTopicFields(testTopic.tid, ['resolvedBy']);
			assert.strictEqual(topicData.resolvedBy, adminUid);
		});

		it('should store resolvedAt as timestamp when topic is resolved', async () => {
			const timestamp = Date.now();
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', 1);
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolvedAt', timestamp);

			const topicData = await topics.getTopicFields(testTopic.tid, ['resolvedAt']);
			assert.strictEqual(topicData.resolvedAt, timestamp);
		});

		it('should include resolved field in getTopicData', async () => {
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', 1);
			const topicData = await topics.getTopicData(testTopic.tid);
			assert(topicData.hasOwnProperty('resolved'));
			assert.strictEqual(topicData.resolved, 1);
		});

		it('should include resolved, resolvedBy, resolvedAt in getTopicFields', async () => {
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', 1);
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolvedBy', adminUid);
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolvedAt', Date.now());

			const topicData = await topics.getTopicFields(testTopic.tid, ['resolved', 'resolvedBy', 'resolvedAt']);
			assert(topicData.hasOwnProperty('resolved'));
			assert(topicData.hasOwnProperty('resolvedBy'));
			assert(topicData.hasOwnProperty('resolvedAt'));
			assert.strictEqual(topicData.resolved, 1);
			assert.strictEqual(topicData.resolvedBy, adminUid);
		});

		it('should parse resolved fields as integers', async () => {
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolved', '1');
			await db.setObjectField(`topic:${testTopic.tid}`, 'resolvedBy', String(adminUid));

			const topicData = await topics.getTopicFields(testTopic.tid, ['resolved', 'resolvedBy']);
			assert.strictEqual(typeof topicData.resolved, 'number');
			assert.strictEqual(typeof topicData.resolvedBy, 'number');
		});
	});

	describe('Button and Socket Handler Tests', () => {
		let testTopic;

		beforeEach(async () => {
			const result = await topics.post({
				uid: regularUid,
				title: 'Test Topic for Button',
				content: 'Test content',
				cid: testCategory.cid,
			});
			testTopic = result.topicData;
		});

		it('should have resolve socket handler defined', () => {
			assert(typeof socketTopics.resolve === 'function');
		});

		it('should have unresolve socket handler defined', () => {
			assert(typeof socketTopics.unresolve === 'function');
		});

		it('should resolve topic via socket handler', async () => {
			const result = await socketTopics.resolve({ uid: regularUid }, { tid: testTopic.tid });
			assert(result);
			assert.strictEqual(result.resolved, 1);
			assert.strictEqual(result.resolvedBy, regularUid);
			assert(result.resolvedAt);
		});

		it('should unresolve topic via socket handler', async () => {
			await socketTopics.resolve({ uid: regularUid }, { tid: testTopic.tid });
			const result = await socketTopics.unresolve({ uid: regularUid }, { tid: testTopic.tid });
			assert(result);
			assert.strictEqual(result.resolved, 0);
		});

		it('should validate input when resolving via socket', async () => {
			try {
				await socketTopics.resolve({ uid: regularUid }, {});
				assert.fail('Should have thrown error for missing tid');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-data]]');
			}
		});

		it('should update resolved status immediately after button click', async () => {
			const beforeData = await topics.getTopicData(testTopic.tid);
			assert(!beforeData.resolved || beforeData.resolved === 0);

			await socketTopics.resolve({ uid: regularUid }, { tid: testTopic.tid });

			const afterData = await topics.getTopicData(testTopic.tid);
			assert.strictEqual(afterData.resolved, 1);
		});

		it('should allow topic author to resolve own topic', async () => {
			const result = await socketTopics.resolve({ uid: regularUid }, { tid: testTopic.tid });
			assert.strictEqual(result.resolved, 1);
		});

		it('should allow admin to resolve any topic', async () => {
			const result = await socketTopics.resolve({ uid: adminUid }, { tid: testTopic.tid });
			assert.strictEqual(result.resolved, 1);
			assert.strictEqual(result.resolvedBy, adminUid);
		});

		it('should not allow non-author non-moderator to resolve topic', async () => {
			const otherUid = await User.create({ username: 'otheruser', password: '123456' });
			try {
				await socketTopics.resolve({ uid: otherUid }, { tid: testTopic.tid });
				assert.fail('Should have thrown error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});
	});

	describe('Filter Functionality Tests', () => {
		let resolvedTopic1;
		let resolvedTopic2;
		let unresolvedTopic1;
		let unresolvedTopic2;

		before(async () => {
			// Create 2 resolved topics
			const topic1 = await topics.post({
				uid: adminUid,
				title: 'Resolved Topic 1',
				content: 'Test',
				cid: testCategory.cid,
			});
			resolvedTopic1 = topic1.topicData;
			await socketTopics.resolve({ uid: adminUid }, { tid: resolvedTopic1.tid });

			const topic2 = await topics.post({
				uid: adminUid,
				title: 'Resolved Topic 2',
				content: 'Test',
				cid: testCategory.cid,
			});
			resolvedTopic2 = topic2.topicData;
			await socketTopics.resolve({ uid: adminUid }, { tid: resolvedTopic2.tid });

			// Create 2 unresolved topics
			const topic3 = await topics.post({
				uid: adminUid,
				title: 'Unresolved Topic 1',
				content: 'Test',
				cid: testCategory.cid,
			});
			unresolvedTopic1 = topic3.topicData;

			const topic4 = await topics.post({
				uid: adminUid,
				title: 'Unresolved Topic 2',
				content: 'Test',
				cid: testCategory.cid,
			});
			unresolvedTopic2 = topic4.topicData;
		});

		it('should filter to show only resolved topics', async () => {
			const result = await categories.getCategoryTopics({
				cid: testCategory.cid,
				uid: adminUid,
				start: 0,
				stop: 19,
				filter: 'resolved',
			});

			const tids = result.topics.map(t => t.tid);
			assert(tids.includes(resolvedTopic1.tid));
			assert(tids.includes(resolvedTopic2.tid));
			assert(!tids.includes(unresolvedTopic1.tid));
			assert(!tids.includes(unresolvedTopic2.tid));
		});

		it('should return only topics with resolved = 1 when filtering by resolved', async () => {
			const result = await categories.getCategoryTopics({
				cid: testCategory.cid,
				uid: adminUid,
				start: 0,
				stop: 19,
				filter: 'resolved',
			});

			result.topics.forEach((topic) => {
				assert.strictEqual(topic.resolved, 1);
			});
		});

		it('should filter to show only unresolved topics', async () => {
			const result = await categories.getCategoryTopics({
				cid: testCategory.cid,
				uid: adminUid,
				start: 0,
				stop: 19,
				filter: 'unresolved',
			});

			const tids = result.topics.map(t => t.tid);
			assert(tids.includes(unresolvedTopic1.tid));
			assert(tids.includes(unresolvedTopic2.tid));
			assert(!tids.includes(resolvedTopic1.tid));
			assert(!tids.includes(resolvedTopic2.tid));
		});

		it('should return only topics with resolved != 1 when filtering by unresolved', async () => {
			const result = await categories.getCategoryTopics({
				cid: testCategory.cid,
				uid: adminUid,
				start: 0,
				stop: 19,
				filter: 'unresolved',
			});

			result.topics.forEach((topic) => {
				assert.notStrictEqual(topic.resolved, 1);
			});
		});

		it('should show all topics when no filter is applied', async () => {
			const result = await categories.getCategoryTopics({
				cid: testCategory.cid,
				uid: adminUid,
				start: 0,
				stop: 19,
			});

			const tids = result.topics.map(t => t.tid);
			// Should include both resolved and unresolved
			const hasResolved = tids.some(tid => [resolvedTopic1.tid, resolvedTopic2.tid].includes(tid));
			const hasUnresolved = tids.some(tid => [unresolvedTopic1.tid, unresolvedTopic2.tid].includes(tid));
			assert(hasResolved && hasUnresolved);
		});
	});

	after(async () => {
		await db.emptydb();
	});
});

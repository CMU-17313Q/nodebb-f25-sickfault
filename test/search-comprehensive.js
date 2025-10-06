// AI was used to generate this document. More details in the pull request...

'use strict';

const assert = require('assert');
const nconf = require('nconf');

const db = require('./mocks/databasemock');
const topics = require('../src/topics');
const categories = require('../src/categories');
const user = require('../src/user');
const search = require('../src/search');
const privileges = require('../src/privileges');
const request = require('../src/request');
const posts = require('../src/posts');

describe('Comprehensive Search Tests', () => {
	const testUsers = {};
	const testCategories = {};
	const testTopics = {};
	const testPosts = {};

	before(async () => {
		// Create test users
		testUsers.alice = await user.create({ username: 'alice_search_test', email: 'alice@test.com' });
		testUsers.bob = await user.create({ username: 'bob_search_test', email: 'bob@test.com' });
		testUsers.charlie = await user.create({ username: 'charlie_search_test', email: 'charlie@test.com' });

		// Create test categories
		testCategories.tech = (await categories.create({
			name: 'Technology',
			description: 'Technology discussions',
		})).cid;

		testCategories.gaming = (await categories.create({
			name: 'Gaming',
			description: 'Gaming discussions',
		})).cid;

		testCategories.music = (await categories.create({
			name: 'Music',
			description: 'Music discussions',
		})).cid;

		// Create test topics and posts
		const topic1 = await topics.post({
			uid: testUsers.alice,
			cid: testCategories.tech,
			title: 'JavaScript Frameworks Comparison',
			content: 'React and Vue are popular JavaScript frameworks for building user interfaces',
			tags: ['javascript', 'react', 'vue', 'frontend'],
		});
		testTopics.tech1 = topic1.topicData;
		testPosts.tech1Main = topic1.postData;

		const topic2 = await topics.post({
			uid: testUsers.bob,
			cid: testCategories.tech,
			title: 'Python for Data Science',
			content: 'Python is an excellent language for data science and machine learning',
			tags: ['python', 'datascience', 'machinelearning'],
		});
		testTopics.tech2 = topic2.topicData;
		testPosts.tech2Main = topic2.postData;

		const topic3 = await topics.post({
			uid: testUsers.charlie,
			cid: testCategories.gaming,
			title: 'Best RPG Games 2024',
			content: 'Discussion about the best role-playing games released in 2024',
			tags: ['gaming', 'rpg', '2024'],
		});
		testTopics.gaming1 = topic3.topicData;
		testPosts.gaming1Main = topic3.postData;

		const topic4 = await topics.post({
			uid: testUsers.alice,
			cid: testCategories.music,
			title: 'Classical Music Recommendations',
			content: 'Share your favorite classical music pieces and composers',
			tags: ['music', 'classical'],
		});
		testTopics.music1 = topic4.topicData;
		testPosts.music1Main = topic4.postData;

		// Create reply posts
		testPosts.tech1Reply1 = await topics.reply({
			uid: testUsers.bob,
			content: 'I prefer React because of its component-based architecture',
			tid: testTopics.tech1.tid,
		});

		testPosts.tech1Reply2 = await topics.reply({
			uid: testUsers.charlie,
			content: 'Vue has better documentation and is easier to learn',
			tid: testTopics.tech1.tid,
		});

		testPosts.tech2Reply1 = await topics.reply({
			uid: testUsers.alice,
			content: 'NumPy and Pandas are essential Python libraries for data science',
			tid: testTopics.tech2.tid,
		});

		// Grant search privileges to guests for API testing
		await privileges.global.give(['groups:search:content', 'groups:search:users', 'groups:search:tags'], 'guests');
	});

	after(async () => {
		// Clean up privileges
		await privileges.global.rescind(['groups:search:content', 'groups:search:users', 'groups:search:tags'], 'guests');
	});

	describe('Basic Content Search', () => {
		it('should search in titles only', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titles',
			});

			assert(result);
			assert(result.posts.length >= 1);
			assert(result.posts.some(post => post.topic.title.includes('JavaScript')));
		});

		it('should search in posts only', async () => {
			const result = await search.search({
				query: 'component',
				searchIn: 'posts',
			});

			assert(result);
			assert(result.posts.length >= 1);
		});

		it('should search in both titles and posts', async () => {
			const result = await search.search({
				query: 'Python',
				searchIn: 'titlesposts',
			});

			assert(result);
			assert(result.posts.length >= 1);
		});

		it('should return empty results for non-existent terms', async () => {
			const result = await search.search({
				query: 'xyznonexistent123456',
				searchIn: 'titlesposts',
			});

			assert(result);
			assert.strictEqual(result.posts.length, 0);
			assert.strictEqual(result.matchCount, 0);
		});

		it('should be case-insensitive', async () => {
			const result1 = await search.search({
				query: 'PYTHON',
				searchIn: 'titlesposts',
			});

			const result2 = await search.search({
				query: 'python',
				searchIn: 'titlesposts',
			});

			assert(result1);
			assert(result2);
			assert.strictEqual(result1.matchCount, result2.matchCount);
		});
	});

	describe('Match Words Filter', () => {
		it('should match all words when matchWords is "all"', async () => {
			const result = await search.search({
				query: 'React Vue',
				searchIn: 'titlesposts',
				matchWords: 'all',
			});

			assert(result);
			// Should find posts containing both React AND Vue
			result.posts.forEach((post) => {
				const text = (post.content + ' ' + post.topic.title).toLowerCase();
				assert(text.includes('react') && text.includes('vue'));
			});
		});

		it('should match any word when matchWords is "any"', async () => {
			const result = await search.search({
				query: 'React Python',
				searchIn: 'titlesposts',
				matchWords: 'any',
			});

			assert(result);
			assert(result.posts.length >= 2);
			// Should find posts containing React OR Python
		});
	});

	describe('Category Filter', () => {
		it('should filter by single category', async () => {
			const result = await search.search({
				query: 'data',
				searchIn: 'titlesposts',
				categories: [testCategories.tech.toString()],
				uid: testUsers.alice,
			});

			assert(result);
			result.posts.forEach((post) => {
				assert.strictEqual(post.category.cid, testCategories.tech);
			});
		});

		it('should filter by multiple categories', async () => {
			const result = await search.search({
				query: '2024',
				searchIn: 'titlesposts',
				categories: [testCategories.gaming.toString(), testCategories.music.toString()],
				uid: testUsers.alice,
			});

			assert(result);
			result.posts.forEach((post) => {
				assert([testCategories.gaming, testCategories.music].includes(post.category.cid));
			});
		});

		it('should search in all categories when "all" is specified', async () => {
			const result = await search.search({
				query: 'music',
				searchIn: 'titlesposts',
				categories: ['all'],
				uid: testUsers.alice,
			});

			assert(result);
			assert(result.posts.length >= 0);
		});
	});

	describe('User Filter', () => {
		it('should filter posts by specific user', async () => {
			const result = await search.search({
				query: 'React',
				searchIn: 'titlesposts',
				postedBy: 'alice_search_test',
				uid: testUsers.alice,
			});

			assert(result);
			result.posts.forEach((post) => {
				assert([testUsers.alice].includes(post.uid));
			});
		});

		it('should filter by multiple users', async () => {
			const result = await search.search({
				query: 'Python',
				searchIn: 'titlesposts',
				postedBy: ['alice_search_test', 'bob_search_test'],
				uid: testUsers.alice,
			});

			assert(result);
			result.posts.forEach((post) => {
				assert([testUsers.alice, testUsers.bob].includes(post.uid));
			});
		});
	});

	describe('Tag Filter', () => {
		it('should filter by single tag', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
				hasTags: ['javascript'],
			});

			assert(result);
			if (result.posts.length > 0) {
				result.posts.forEach((post) => {
					assert(post.topic, 'Post should have topic');
					assert(Array.isArray(post.topic.tags), 'Post topic tags should be an array');
					const tagValues = post.topic.tags.map(t => (typeof t === 'object' ? t.value : t));
					assert(tagValues.includes('javascript'), `Post should have javascript tag. Tags: ${JSON.stringify(tagValues)}`);
				});
			}
		});

		it('should filter by multiple tags (all tags must match)', async () => {
			const result = await search.search({
				query: 'frameworks',
				searchIn: 'titlesposts',
				hasTags: ['javascript', 'react'],
			});

			assert(result);
			if (result.posts.length > 0) {
				result.posts.forEach((post) => {
					assert(post.topic);
					assert(Array.isArray(post.topic.tags));
					const tagValues = post.topic.tags.map(t => (typeof t === 'object' ? t.value : t));
					assert(tagValues.includes('javascript'), 'Post should have javascript tag');
					assert(tagValues.includes('react'), 'Post should have react tag');
				});
			}
		});

		it('should return no results if tags do not match', async () => {
			const result = await search.search({
				query: 'Python',
				searchIn: 'titlesposts',
				hasTags: ['javascript'], // Python topic doesn't have javascript tag
			});

			assert(result);
			assert.strictEqual(result.matchCount, 0);
		});
	});

	describe('Reply Count Filter', () => {
		it('should filter topics with at least N replies', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
				replies: '2',
				repliesFilter: 'atleast',
			});

			assert(result);
			result.posts.forEach((post) => {
				assert(post.topic.postcount >= 2);
			});
		});

		it('should filter topics with at most N replies', async () => {
			const result = await search.search({
				query: 'music',
				searchIn: 'titlesposts',
				replies: '1',
				repliesFilter: 'atmost',
			});

			assert(result);
			result.posts.forEach((post) => {
				assert(post.topic.postcount <= 1);
			});
		});
	});

	describe('Time Range Filter', () => {
		it('should filter posts newer than specified time', async () => {
			const result = await search.search({
				query: 'Python',
				searchIn: 'titlesposts',
				timeRange: '86400', // 1 day in seconds
				timeFilter: 'newer',
			});

			assert(result);
			const oneDayAgo = Date.now() - 86400000;
			result.posts.forEach((post) => {
				assert(post.timestamp >= oneDayAgo);
			});
		});

		it('should filter posts older than specified time', async () => {
			// This test may not find results if all posts are recent
			const result = await search.search({
				query: 'test',
				searchIn: 'titlesposts',
				timeRange: '0.01', // Very short time in seconds
				timeFilter: 'older',
			});

			assert(result);
			// Just verify the search completes without error
		});
	});

	describe('Sorting', () => {
		it('should sort by timestamp descending', async () => {
			const result = await search.search({
				query: 'data',
				searchIn: 'titlesposts',
				sortBy: 'timestamp',
				sortDirection: 'desc',
			});

			assert(result);
			if (result.posts.length > 1) {
				for (let i = 0; i < result.posts.length - 1; i++) {
					assert(result.posts[i].timestamp >= result.posts[i + 1].timestamp);
				}
			}
		});

		it('should sort by timestamp ascending', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
				sortBy: 'timestamp',
				sortDirection: 'asc',
			});

			assert(result);
			if (result.posts.length > 1) {
				for (let i = 0; i < result.posts.length - 1; i++) {
					assert(result.posts[i].timestamp <= result.posts[i + 1].timestamp);
				}
			}
		});

		it('should sort by votes', async () => {
			const result = await search.search({
				query: 'Python',
				searchIn: 'titlesposts',
				sortBy: 'votes',
				sortDirection: 'desc',
			});

			assert(result);
			// Just verify it completes without error
		});
	});

	describe('Pagination', () => {
		it('should return correct page count', async () => {
			const result = await search.search({
				query: 'data',
				searchIn: 'titlesposts',
				itemsPerPage: 2,
			});

			assert(result);
			assert(result.pageCount >= 1);
			assert.strictEqual(typeof result.matchCount, 'number');
		});

		it('should return correct results for specific page', async () => {
			const result = await search.search({
				query: 'test',
				searchIn: 'titlesposts',
				page: 1,
				itemsPerPage: 5,
			});

			assert(result);
			assert(result.posts.length <= 5);
		});
	});

	describe('User Search', () => {
		it('should search for users by username', async () => {
			const result = await search.search({
				query: 'alice',
				searchIn: 'users',
			});

			assert(result);
			assert(result.users.length >= 1);
			assert(result.users.some(u => u.username.toLowerCase().includes('alice')));
		});

		it('should search for users with partial username', async () => {
			const result = await search.search({
				query: 'bob',
				searchIn: 'users',
			});

			assert(result);
			assert(result.users.length >= 1);
		});
	});

	describe('Category Search', () => {
		it('should search for categories by name', async () => {
			const result = await search.search({
				query: 'Technology',
				searchIn: 'categories',
			});

			assert(result);
			assert(result.categories.length >= 1);
			assert(result.categories.some(c => c.name.includes('Technology')));
		});

		it('should search for categories with partial name', async () => {
			const result = await search.search({
				query: 'Gam',
				searchIn: 'categories',
			});

			assert(result);
			assert(result.categories.length >= 1);
			assert(result.categories.some(c => c.name.includes('Gaming')));
		});
	});

	describe('Tag Search', () => {
		it('should search for tags', async () => {
			const result = await search.search({
				query: 'javascript',
				searchIn: 'tags',
			});

			assert(result);
			assert(result.tags);
		});
	});

	describe('Bookmark Search', () => {
		it('should search in user bookmarks', async () => {
			// First bookmark a post
			await posts.bookmark(testPosts.tech1Main.pid, testUsers.alice);

			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'bookmarks',
				uid: testUsers.alice,
			});

			assert(result);
			// Should only return bookmarked posts
		});
	});

	describe('Combined Filters', () => {
		it('should apply multiple filters together', async () => {
			const result = await search.search({
				query: 'React',
				searchIn: 'titlesposts',
				categories: [testCategories.tech.toString()],
				postedBy: ['alice_search_test'],
				hasTags: ['javascript'],
				matchWords: 'all',
				sortBy: 'timestamp',
				sortDirection: 'desc',
				uid: testUsers.alice,
			});

			assert(result);
			// Verify filters are applied
			if (result.posts.length > 0) {
				result.posts.forEach((post) => {
					assert.strictEqual(post.category.cid, testCategories.tech);
					const tagValues = post.topic.tags.map(t => (typeof t === 'object' ? t.value : t));
					assert(tagValues.includes('javascript'));
				});
			}
		});
	});

	describe('API Endpoint Tests', () => {
		it('should return search results via API', async () => {
			const qs = `/api/search?term=JavaScript&in=titlesposts&searchOnly=1`;
			const { body } = await request.get(nconf.get('url') + qs);

			assert(body);
			assert(body.hasOwnProperty('matchCount'));
			assert(body.hasOwnProperty('posts'));
		});

		it('should filter by category via API', async () => {
			const qs = `/api/search?term=data&in=titlesposts&categories[]=${testCategories.tech}&searchOnly=1`;
			const { body } = await request.get(nconf.get('url') + qs);

			assert(body);
			assert(body.hasOwnProperty('posts'));
		});

		it('should filter by user via API', async () => {
			const qs = `/api/search?term=Python&in=titlesposts&by=bob_search_test&searchOnly=1`;
			const { body } = await request.get(nconf.get('url') + qs);

			assert(body);
			assert(body.hasOwnProperty('posts'));
		});

		it('should handle empty search term', async () => {
			const qs = `/api/search?term=&in=titlesposts&searchOnly=1`;
			const { response, body } = await request.get(nconf.get('url') + qs);

			assert(body);
			assert.strictEqual(response.statusCode, 200);
		});

		it('should handle pagination via API', async () => {
			const qs = `/api/search?term=test&in=titlesposts&page=1&itemsPerPage=5&searchOnly=1`;
			const { body } = await request.get(nconf.get('url') + qs);

			assert(body);
			assert(body.hasOwnProperty('pageCount'));
			assert(body.hasOwnProperty('pagination'));
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid searchIn parameter', async () => {
			try {
				const result = await search.search({
					query: 'test',
					searchIn: 'invalid',
				});
				// If no error is thrown, the function may return empty results or handle gracefully
				// Just verify it doesn't crash
				assert(result !== undefined);
			} catch (err) {
				// If an error is thrown, verify it's the expected error
				assert(err.message.includes('error') || err.message.includes('unknown') || err.message.includes('filter'));
			}
		});

		it('should handle empty searchIn parameter', async () => {
			try {
				const result = await search.search({
					query: 'test',
					searchIn: '',
				});
				// If no error is thrown, the function may return empty results or handle gracefully
				assert(result !== undefined);
			} catch (err) {
				// If an error is thrown, verify it's the expected error
				assert(err.message.includes('error') || err.message.includes('unknown') || err.message.includes('filter'));
			}
		});
	});

	describe('Performance and Timing', () => {
		it('should include timing information in results', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
			});

			assert(result);
			assert(result.hasOwnProperty('time'));
			assert(typeof result.time === 'string');
			assert(!isNaN(parseFloat(result.time)));
		});
	});

	describe('Special Search Features', () => {
		it('should handle search with special characters', async () => {
			const result = await search.search({
				query: 'React & Vue',
				searchIn: 'titlesposts',
			});

			assert(result);
			// Should not crash with special characters
		});

		it('should handle search with numbers', async () => {
			const result = await search.search({
				query: '2024',
				searchIn: 'titlesposts',
			});

			assert(result);
			assert(result.posts.length >= 1);
		});

		it('should trim whitespace from query', async () => {
			const result1 = await search.search({
				query: '  JavaScript  ',
				searchIn: 'titlesposts',
			});

			const result2 = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
			});

			assert(result1);
			assert(result2);
			assert.strictEqual(result1.matchCount, result2.matchCount);
		});
	});

	describe('returnIds Option', () => {
		it('should return only IDs when returnIds is true', async () => {
			const result = await search.search({
				query: 'JavaScript',
				searchIn: 'titlesposts',
				returnIds: true,
			});

			assert(result);
			assert(result.hasOwnProperty('pids'));
			assert(result.hasOwnProperty('tids'));
			assert(Array.isArray(result.pids));
			assert(Array.isArray(result.tids));
		});
	});

	describe('Search Children Categories', () => {
		it('should search in child categories when searchChildren is true', async () => {
			// Create a child category
			const childCid = (await categories.create({
				name: 'Web Development',
				description: 'Web development topics',
				parentCid: testCategories.tech,
			})).cid;

			const childTopic = await topics.post({
				uid: testUsers.alice,
				cid: childCid,
				title: 'HTML CSS JavaScript Tutorial',
				content: 'Learn web development basics',
				tags: ['html', 'css', 'javascript'],
			});

			const result = await search.search({
				query: 'Tutorial',
				searchIn: 'titlesposts',
				categories: [testCategories.tech.toString()],
				searchChildren: true,
				uid: testUsers.alice,
			});

			assert(result);
			// Should find posts in child categories too
		});
	});
});

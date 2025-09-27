'use strict';

const privileges = require('../privileges');
const activitypub = require('../activitypub');
const plugins = require('../plugins');
const db = require('../database');

module.exports = function (Posts) {
	Posts.search = async function (data) {
		const query = data.query || '';
		const page = data.page || 1;
		const uid = data.uid || 0;
		const paginate = data.hasOwnProperty(data, 'paginate') ? data.paginate : true;

		const startTime = process.hrtime();

		if (activitypub.helpers.isWebfinger(query)) {
			await activitypub.actors.assertGroup([query]);
		}

		let pids = await findPids(query, data.hardCap);

		const result = await plugins.hooks.fire('filter:posts.search', {
			data,
			pids,
			uid,
		});
		pids = await privileges.posts.filter('find', result.pids, uid) || pids;

		const searchResult = {
			matchCount: pids.length,
		};

		if (paginate) {
			const resultsPerPage = data.resultsPerPage || 50;
			const start = Math.max(0, page - 1) * resultsPerPage;
			const stop = start + resultsPerPage;
			searchResult.pageCount = Math.ceil(pids.length / resultsPerPage);
			pids = pids.slice(start, stop);
		}

		const postsData = await Posts.getPostsByPids(pids, uid);

		searchResult.timing = (process.elapsedTimeSince(startTime) / 1000).toFixed(2);
		searchResult.posts = postsData;
		return searchResult;
	};

	async function findPids(query, hardCap) {
		if (!query || String(query).length < 2) {
			return [];
		}
		// this is how many recent posts to search
		const latestPosts = 500;
		let pids = await db.getSortedSetRevRange('posts:pid', 0, latestPosts);
		pids = pids.map(id => parseInt(id, 10)).filter(Boolean);
		const rows = await Promise.all(pids.map(pid => Posts.getPostFields(pid, ['pid', 'content'])));

		const strip = s => String(s || '').replace(/<[^>]*>/g, ' ').toLowerCase();
		const matchedPids = rows.filter(r => r && r.content && strip(r.content).includes(query.toLowerCase()))
			.map(r => r.pid);

		return Array.from(new Set(matchedPids)).slice(0, hardCap);
	}
};
'use strict';

const meta = require('../meta');
const db = require('../database');
const plugins = require('../plugins');
const user = require('../user');
const topics = require('../topics');
const categories = require('../categories');
const groups = require('../groups');
const privileges = require('../privileges');
const activitypub = require('../activitypub');
const utils = require('../utils');
const translate = require('../translate');
const websockets = require('../socket.io');

module.exports = function (Posts) {
	Posts.create = async function (data) {
		// This is an internal method, consider using Topics.reply instead
		const { uid, tid, _activitypub, sourceContent } = data;
		const content = data.content.toString();
		const timestamp = data.timestamp || Date.now();
		const isMain = data.isMain || false;

		// Set defaults immediately - translation will happen in background
		let isEnglish = true;
		let translatedContent = '';

		if (!uid && parseInt(uid, 10) !== 0) {
			throw new Error('[[error:invalid-uid]]');
		}

		if (data.toPid) {
			await checkToPid(data.toPid, uid);
		}

		const pid = data.pid || await db.incrObjectField('global', 'nextPid');

		// Check if translation is cached - if so, include it in initial post creation
		const isCached = translate.isCached(data);
		if (isCached) {
			try {
				const [detected, translated] = await translate.translate(data);
				isEnglish = detected;
				translatedContent = translated;
				// No socket event needed - button will appear in initial render
			} catch (err) {
				console.error('[translator] Cached translation retrieval failed:', err.message);
				// Keep defaults
			}
		} else {
			// Translation not cached - emit PENDING status immediately
			if (websockets) {
				const pendingStatusData = {
					pid: pid,
					tid: tid,
					status: 'pending',
				};
				websockets.in(`topic_${tid}`).emit('event:post_translation_status', pendingStatusData);
				websockets.in(`uid_${uid}`).emit('event:post_translation_status', pendingStatusData);
			}

			// Start translation in background
			translate.translate(data).then(async ([detected, translated]) => {
				// Update post asynchronously when translation completes
				await Posts.setPostFields(pid, {
					isEnglish: detected,
					translatedContent: translated,
				});

				// Emit SUCCESS status
				if (websockets) {
					const successStatusData = {
						pid: pid,
						tid: tid,
						status: 'success',
						isEnglish: detected,
						translatedContent: translated,
					};
					websockets.in(`topic_${tid}`).emit('event:post_translation_status', successStatusData);
					websockets.in(`uid_${uid}`).emit('event:post_translation_status', successStatusData);
				}

				// Also emit post_edited event for backward compatibility
				if (websockets) {
					const eventData = {
						post: {
							pid: pid,
							tid: tid,
							content: content,
							isEnglish: detected,
							translatedContent: translated,
							deleted: false,
							changed: false,
						},
						topic: { tid: tid },
					};
					// Emit to topic room (for users viewing the topic)
					websockets.in(`topic_${tid}`).emit('event:post_edited', eventData);
					// Also emit to post author's room (in case they just created the topic and haven't joined the room yet)
					websockets.in(`uid_${uid}`).emit('event:post_edited', eventData);
				}
			}).catch((err) => {
				// Translation failed - emit FAIL status
				console.error('[translator] Background translation failed:', err.message);

				if (websockets) {
					const failStatusData = {
						pid: pid,
						tid: tid,
						status: 'fail',
						error: err.message,
					};
					websockets.in(`topic_${tid}`).emit('event:post_translation_status', failStatusData);
					websockets.in(`uid_${uid}`).emit('event:post_translation_status', failStatusData);
				}
			});
		}

		let postData = { pid, uid, tid, content, sourceContent, timestamp, isEnglish, translatedContent };

		if (data.toPid) {
			postData.toPid = data.toPid;
		}
		if (data.ip && meta.config.trackIpPerPost) {
			postData.ip = data.ip;
		}
		if (data.handle && !parseInt(uid, 10)) {
			postData.handle = data.handle;
		}
		if (_activitypub) {
			if (_activitypub.url) {
				postData.url = _activitypub.url;
			}
			if (_activitypub.audience) {
				postData.audience = _activitypub.audience;
			}
		}

		// Rewrite emoji references to inline image assets
		if (_activitypub && _activitypub.tag && Array.isArray(_activitypub.tag)) {
			_activitypub.tag
				.filter(tag => tag.type === 'Emoji' &&
					tag.icon && tag.icon.type === 'Image')
				.forEach((tag) => {
					if (!tag.name.startsWith(':')) {
						tag.name = `:${tag.name}`;
					}
					if (!tag.name.endsWith(':')) {
						tag.name = `${tag.name}:`;
					}

					postData.content = postData.content.replace(new RegExp(tag.name, 'g'), `<img class="not-responsive emoji" src="${tag.icon.url}" title="${tag.name}" />`);
				});
		}

		({ post: postData } = await plugins.hooks.fire('filter:post.create', { post: postData, data: data }));
		await db.setObject(`post:${postData.pid}`, postData);

		const topicData = await topics.getTopicFields(tid, ['cid', 'pinned']);
		postData.cid = topicData.cid;

		await Promise.all([
			db.sortedSetAdd('posts:pid', timestamp, postData.pid),
			utils.isNumber(pid) ? db.incrObjectField('global', 'postCount') : null,
			user.onNewPostMade(postData),
			topics.onNewPostMade(postData),
			categories.onNewPostMade(topicData.cid, topicData.pinned, postData),
			groups.onNewPostMade(postData),
			addReplyTo(postData, timestamp),
			Posts.uploads.sync(postData.pid),
		]);

		const result = await plugins.hooks.fire('filter:post.get', { post: postData, uid: data.uid });
		result.post.isMain = isMain;
		plugins.hooks.fire('action:post.save', { post: { ...result.post, _activitypub } });
		return result.post;
	};

	async function addReplyTo(postData, timestamp) {
		if (!postData.toPid) {
			return;
		}
		await Promise.all([
			db.sortedSetAdd(`pid:${postData.toPid}:replies`, timestamp, postData.pid),
			db.incrObjectField(`post:${postData.toPid}`, 'replies'),
		]);
	}

	async function checkToPid(toPid, uid) {
		if (!utils.isNumber(toPid) && !activitypub.helpers.isUri(toPid)) {
			throw new Error('[[error:invalid-pid]]');
		}

		const [toPost, canViewToPid] = await Promise.all([
			Posts.getPostFields(toPid, ['pid', 'deleted']),
			privileges.posts.can('posts:view_deleted', toPid, uid),
		]);
		const toPidExists = !!toPost.pid;
		if (!toPidExists || (toPost.deleted && !canViewToPid)) {
			throw new Error('[[error:invalid-pid]]');
		}
	}
};

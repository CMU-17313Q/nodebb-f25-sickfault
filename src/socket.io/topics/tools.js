'use strict';

const topics = require('../../topics');
const privileges = require('../../privileges');
const plugins = require('../../plugins');

module.exports = function (SocketTopics) {
	SocketTopics.loadTopicTools = async function (socket, data) {
		if (!data) {
			throw new Error('[[error:invalid-data]]');
		}

		const [topicData, userPrivileges] = await Promise.all([
			topics.getTopicData(data.tid),
			privileges.topics.get(data.tid, socket.uid),
		]);

		if (!topicData) {
			throw new Error('[[error:no-topic]]');
		}
		if (!userPrivileges['topics:read'] || !userPrivileges.view_thread_tools) {
			throw new Error('[[error:no-privileges]]');
		}
		topicData.privileges = userPrivileges;
		const result = await plugins.hooks.fire('filter:topic.thread_tools', {
			topic: topicData,
			uid: socket.uid,
			tools: [],
		});
		result.topic.thread_tools = result.tools;
		return result.topic;
	};

	SocketTopics.orderPinnedTopics = async function (socket, data) {
		if (!data || !data.tid) {
			throw new Error('[[error:invalid-data]]');
		}

		await topics.tools.orderPinnedTopics(socket.uid, data);
	};

	SocketTopics.resolve = async function (socket, data) {
		if (!data || !data.tid) {
			throw new Error('[[error:invalid-data]]');
		}

		const result = await topics.tools.resolve(data.tid, socket.uid);

		// Emit event to all users viewing the topic
		require('../../socket.io').in(`topic_${data.tid}`).emit('event:topic_resolved', result);

		return result;
	};

	SocketTopics.unresolve = async function (socket, data) {
		if (!data || !data.tid) {
			throw new Error('[[error:invalid-data]]');
		}

		const result = await topics.tools.unresolve(data.tid, socket.uid);

		// Emit event to all users viewing the topic
		require('../../socket.io').in(`topic_${data.tid}`).emit('event:topic_unresolved', result);

		return result;
	};
};

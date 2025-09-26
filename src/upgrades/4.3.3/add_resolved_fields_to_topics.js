'use strict';

const batch = require('../../batch');

module.exports = {
	name: 'Add resolved status fields to topics',
	timestamp: Date.UTC(2024, 8, 26), // September 26, 2024 (month is 0-indexed)
	method: async function () {
		const { progress } = this;

		const db = require('../../database');

		await batch.processSortedSet('topics:tid', async (tids) => {
			progress.incr(tids.length);

			const bulkSet = tids.map(tid => [
				`topic:${tid}`,
				{
					resolved: 0,
					resolvedBy: null,
					resolvedAt: null,
				},
			]);

			await db.setObjectBulk(bulkSet);
		}, {
			batch: 500,
			progress,
		});
	},
};
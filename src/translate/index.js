
/* eslint-disable strict */

const crypto = require('crypto');
const { LRUCache } = require('lru-cache');

const translatorApi = module.exports;

// FIFO queue to handle requests to translator microservice
class TaskQueue {
	constructor(concurrency) {
		this.concurrency = concurrency;
		this.running = 0;
		this.queue = [];
	}

	add(task) {
		return new Promise((resolve, reject) => {
			this.queue.push({ task, resolve, reject });
			this.runNext();
		});
	}

	runNext() {
		if (this.running >= this.concurrency) return;
		const job = this.queue.shift();
		if (!job) return;

		this.running += 1;
		job.task()
			.then(job.resolve)
			.catch(job.reject)
			.finally(() => {
				this.running -= 1;
				this.runNext();
			});
	}
}

// Concurrency = 1 because our microservice can't handle simultaneous requests
const translatorQueue = new TaskQueue(1);


// LRU cache for translations with max size and TTL
const translationCache = new LRUCache({
	max: 500, // Maximum 500 entries
	ttl: 1000 * 60 * 60, // 1 hour TTL
	updateAgeOnGet: true, // Reset TTL on cache hit
});

translatorApi.isCached = function (postData) {
	const contentHash = crypto.createHash('md5').update(postData.content).digest('hex');
	return translationCache.has(contentHash);
};

translatorApi.translate = async function (postData) {
	// Generate cache key from content hash
	const contentHash = crypto.createHash('md5').update(postData.content).digest('hex');

	// Check if translation is already cached
	if (translationCache.has(contentHash)) {
		return translationCache.get(contentHash);
	}

	// Add request to queue
	return translatorQueue.add(async () => {
		try {
			const TRANSLATOR_API = 'http://crs-17313-sickfault-gpu.qatar.cmu.edu';

			// Set up timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout

			const response = await fetch(
				`${TRANSLATOR_API}/?content=${encodeURIComponent(postData.content)}`,
				{ signal: controller.signal }
			);
			clearTimeout(timeoutId);

			const data = await response.json();

			// Validate API response format
			if (typeof data.is_english !== 'boolean' || typeof data.translated_content !== 'string') {
				throw new Error('Invalid API response format');
			}

			const result = [data.is_english, data.translated_content];

			// Cache the result
			translationCache.set(contentHash, result);

			return result;
		} catch (error) {
			// Fallback: assume English if translation fails (timeout, network error, etc.)
			if (error.name === 'AbortError') {
				console.warn('[translator] Request timeout after 10 seconds');
			} else {
				console.error('[translator] Translation failed:', error.message);
			}
			return [true, ''];
		}
	});
};

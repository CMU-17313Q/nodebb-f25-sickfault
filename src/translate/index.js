
/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	try {
		const TRANSLATOR_API = 'http://crs-17313-sickfault-gpu.qatar.cmu.edu';

		// Set up timeout to prevent hanging
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

		const response = await fetch(
			`${TRANSLATOR_API}/?content=${encodeURIComponent(postData.content)}`,
			{ signal: controller.signal }
		);
		clearTimeout(timeoutId);

		const data = await response.json();
		return [data.is_english, data.translated_content];
	} catch (error) {
		// Fallback: assume English if translation fails (timeout, network error, etc.)
		if (error.name === 'AbortError') {
			console.warn('[translator] Request timeout after 3 seconds');
		} else {
			console.error('[translator] Translation failed:', error.message);
		}
		return [true, postData.content];
	}
};


/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	try {
		const TRANSLATOR_API = 'http://crs-17313-sickfault-gpu.qatar.cmu.edu';
		const response = await fetch(TRANSLATOR_API + '/?content=' + postData.content);
		const data = await response.json();
		return [data.is_english, data.translated_content];
	} catch (error) {
		// Fallback to simple version if fetch fails
		return ['is_english', postData];
	}
};

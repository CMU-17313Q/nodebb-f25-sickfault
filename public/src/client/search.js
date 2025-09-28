'use strict';

define('forum/search', [
	'search',
	'storage',
	'hooks',
	'alerts',
	'api',
	'translator',
	'categoryFilter',
	'userFilter',
], function (searchModule, storage, hooks, alerts, api, translator, categoryFilter, userFilter) {
	const Search = {};
	let selectedUsers = [];
	let selectedTags = [];
	let selectedCids = [];
	let searchFilters = {};
	let searchTimeout;

	Search.init = function () {
		if (document.getElementById('simple-search-input')) {
			initializeSimpleSearch();
			initializeToggle();
		}

		const searchIn = $('#search-in');
		searchIn.on('change', function () {
			updateFormItemVisiblity(searchIn.val());
		});

		const searchQuery = $('#results').attr('data-search-query');
		searchModule.highlightMatches(
			searchQuery,
			$('.search-results .content p, .search-results .topic-title')
		);

		$('#advanced-search form').off('submit').on('submit', function (e) {
			e.preventDefault();
			searchModule.query(getSearchDataFromDOM());
			return false;
		});

		handleSavePreferences();

		categoryFilterDropdown(ajaxify.data.selectedCids);
		userFilterDropdown($('[component="user/filter"]'), ajaxify.data.userFilterSelected);
		tagFilterDropdown($('[component="tag/filter"]'), ajaxify.data.tagFilterSelected);

		$('[component="search/filters"]').on('hidden.bs.dropdown', '.dropdown', function () {
			const updateFns = {
				replies: updateReplyCountFilter,
				time: updateTimeFilter,
				sort: updateSortFilter,
				tag: updateTagFilter,
			};

			if (updateFns[$(this).attr('data-filter-name')]) {
				updateFns[$(this).attr('data-filter-name')]();
			}

			const searchFiltersNew = getSearchDataFromDOM();
			if (JSON.stringify(searchFilters) !== JSON.stringify(searchFiltersNew)) {
				searchFilters = searchFiltersNew;
				searchModule.query(searchFilters);
			}
		});

		fillOutForm();
		updateTimeFilter();
		updateReplyCountFilter();
		updateSortFilter();

		searchFilters = getSearchDataFromDOM();

		const urlParams = new URLSearchParams(window.location.search);
		const queryParam = urlParams.get('term') || urlParams.get('query');
		if (queryParam) {
			const simpleInput = document.getElementById('simple-search-input');
			if (simpleInput) {
				simpleInput.value = queryParam;
				performSearch();
			}
		}
	};

	function initializeSimpleSearch() {
		const searchInput = document.getElementById('simple-search-input');
		const searchButton = document.getElementById('simple-search-button');
		const searchSuggestions = document.getElementById('search-suggestions');

		if (!searchInput || !searchButton) {
			return;
		}

		// Handle search input with debouncing for real-time suggestions
		searchInput.addEventListener('input', function (e) {
			const query = e.target.value.trim();
			
			clearTimeout(searchTimeout);
			
			if (query.length < 2) {
				searchSuggestions.classList.remove('active');
				searchSuggestions.innerHTML = '';
				return;
			}

			// Debounce for 300ms
			searchTimeout = setTimeout(() => {
				showSuggestions(query);
			}, 300);
		});

		// Handle enter key press
		searchInput.addEventListener('keypress', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				performSearch();
			}
		});

		// Handle search button click
		searchButton.addEventListener('click', function (e) {
			e.preventDefault();
			performSearch();
		});

		// Hide suggestions when clicking outside
		document.addEventListener('click', function (e) {
			if (!e.target.closest('.search-box')) {
				searchSuggestions.classList.remove('active');
			}
		});
	}

	function initializeToggle() {
		const toggleAdvanced = document.getElementById('toggle-advanced');
		const backToSimple = document.getElementById('back-to-simple');
		const simpleSearch = document.getElementById('simple-search');
		const advancedSearch = document.getElementById('advanced-search');

		if (toggleAdvanced) {
			toggleAdvanced.addEventListener('click', function () {
				simpleSearch.classList.add('d-none');
				advancedSearch.classList.remove('d-none');
				
				// Copy search term to advanced search
				const simpleInput = document.getElementById('simple-search-input');
				const advancedInput = document.getElementById('search-input');
				if (simpleInput && advancedInput) {
					advancedInput.value = simpleInput.value;
				}
			});
		}

		if (backToSimple) {
			backToSimple.addEventListener('click', function () {
				advancedSearch.classList.add('d-none');
				simpleSearch.classList.remove('d-none');
				
				// Copy search term back to simple search
				const advancedInput = document.getElementById('search-input');
				const simpleInput = document.getElementById('simple-search-input');
				if (simpleInput && advancedInput) {
					simpleInput.value = advancedInput.value;
				}
			});
		}
	}

	function showSuggestions(query) {
		const searchSuggestions = document.getElementById('search-suggestions');
		
		// Show loading state in suggestions
		searchSuggestions.innerHTML = '<div class="suggestion-item">Searching...</div>';
		searchSuggestions.classList.add('active');

		// Fetch search results for suggestions
		api.get('/api/search', {
			term: query,
			in: 'titlesposts',
			searchOnly: 1,
		})
			.then(function (data) {
				if (data && data.posts && data.posts.length > 0) {
					displaySuggestions(data.posts.slice(0, 5), query);
				} else if (data && data.matchCount === 0) {
					searchSuggestions.innerHTML = '<div class="suggestion-item">No results found</div>';
				} else {
					searchSuggestions.innerHTML = '<div class="suggestion-item">Search not available</div>';
				}
			})
			.catch(function (err) {
				console.error('Search error:', err);
				searchSuggestions.innerHTML = '<div class="suggestion-item">Error loading suggestions</div>';
			});
	}

	function displaySuggestions(posts, query) {
		const searchSuggestions = document.getElementById('search-suggestions');
		
		const html = posts.map(function (post) {
			const title = post.topic ? post.topic.title : (post.title || 'Untitled');
			const content = post.content || '';
			
			return `
				<div class="suggestion-item" data-pid="${post.pid}" data-tid="${post.tid || (post.topic ? post.topic.tid : '')}">
					<div class="suggestion-title">${highlightQuery(escapeHtml(title), query)}</div>
					<div class="suggestion-content">${highlightQuery(escapeHtml(truncateText(content, 100)), query)}</div>
				</div>
			`;
		}).join('');

		searchSuggestions.innerHTML = html;
		searchSuggestions.classList.add('active');

		// Add click handlers to suggestions
		searchSuggestions.querySelectorAll('.suggestion-item').forEach(function (item) {
			item.addEventListener('click', function () {
				const tid = this.getAttribute('data-tid');
				const pid = this.getAttribute('data-pid');
				if (tid) {
					window.location.href = config.relative_path + '/topic/' + tid + (pid ? '/' + pid : '');
				}
			});
		});
	}

	function performSearch() {
		const searchInput = document.getElementById('simple-search-input');
		const searchResults = document.getElementById('simple-search-results');
		const searchStatus = document.getElementById('search-status');
		const searchSuggestions = document.getElementById('search-suggestions');
		
		const query = searchInput.value.trim();
		
		if (!query) {
			alerts.alert({
				type: 'warning',
				title: 'No search query',
				message: 'Please enter something to search for.',
				timeout: 3000,
			});
			return;
		}
		
		searchSuggestions.classList.remove('active');
		
		const newUrl = window.location.pathname + '?term=' + encodeURIComponent(query);
		window.history.pushState({ path: newUrl }, '', newUrl);
		
		searchStatus.innerHTML = 'Searching for "' + escapeHtml(query) + '"...';
		searchResults.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
		searchResults.classList.add('active');
		
		api.get('/api/search', {
			term: query,
			in: 'titlesposts',
			searchOnly: 1,
		})
			.then(function (data) {
				if (data && data.posts && data.posts.length > 0) {
					displayResults(data.posts, query);
				} else if (data && data.matchCount === 0) {
					showNoResults(query);
				} else {
					searchStatus.innerHTML = 'Search functionality is not available';
					searchResults.innerHTML = `
						<div class="no-results">
							<i class="fa fa-exclamation-circle"></i>
							<p>Search plugin is not activated. Please contact the administrator.</p>
						</div>
					`;
				}
			})
			.catch(function (err) {
				console.error('Search error:', err);
				searchStatus.innerHTML = 'Error performing search';
				searchResults.innerHTML = `
					<div class="no-results">
						<i class="fa fa-exclamation-triangle"></i>
						<p>An error occurred while searching. Please try again.</p>
					</div>
				`;
			});
	}

	function displayResults(posts, query) {
		const searchResults = document.getElementById('simple-search-results');
		const searchStatus = document.getElementById('search-status');
		
		searchStatus.innerHTML = `Found ${posts.length} result${posts.length !== 1 ? 's' : ''} for "<strong>${escapeHtml(query)}</strong>"`;
		
		const html = posts.map(function (post) {
			const user = post.user || {};
			const topic = post.topic || {};
			const timeAgo = getTimeAgo(post.timestamp);
			const userPicture = user.picture || '/assets/uploads/system/avatar-default.png';
			const username = user.username || 'Unknown User';
			const topicTitle = topic.title || post.title || 'Untitled Topic';
			const topicSlug = topic.slug || topic.tid || post.tid || '';
			const postIndex = post.index || '';
			const postContent = post.content || '';
			
			return `
				<div class="result-item">
					<div class="result-header">
						<img src="${userPicture}" 
							 alt="${escapeHtml(username)}" 
							 class="result-avatar" />
						<div class="result-meta">
							<span class="result-author">${escapeHtml(username)}</span>
							<span class="result-time">${timeAgo}</span>
						</div>
					</div>
					<a href="${config.relative_path}/topic/${topicSlug}${postIndex ? '/' + postIndex : ''}" 
					   class="result-title">
						${highlightQuery(escapeHtml(topicTitle), query)}
					</a>
					<div class="result-content">
						${highlightQuery(escapeHtml(truncateText(postContent, 200)), query)}
					</div>
					<div class="result-footer">
						<span><i class="fa fa-thumbs-up"></i> ${post.upvotes || 0}</span>
						<span><i class="fa fa-thumbs-down"></i> ${post.downvotes || 0}</span>
						<span><i class="fa fa-eye"></i> ${topic.viewcount || 0} views</span>
					</div>
				</div>
			`;
		}).join('');
		
		searchResults.innerHTML = html;
	}

	function showNoResults(query) {
		const searchResults = document.getElementById('simple-search-results');
		const searchStatus = document.getElementById('search-status');
		
		searchStatus.innerHTML = `No results found for "<strong>${escapeHtml(query)}</strong>"`;
		searchResults.innerHTML = `
			<div class="no-results">
				<i class="fa fa-search"></i>
				<p>No posts found matching your search.</p>
				<p>Try using different keywords or checking your spelling.</p>
			</div>
		`;
	}

	function escapeHtml(text) {
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		};
		return (text || '').toString().replace(/[&<>"']/g, m => map[m]);
	}

	function truncateText(text, maxLength) {
		if (!text) return '';
		text = text.replace(/<[^>]*>/g, '');
		if (text.length <= maxLength) return text;
		return text.substr(0, maxLength) + '...';
	}

	function highlightQuery(text, query) {
		if (!text || !query) return text;
		const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}

	function getTimeAgo(timestamp) {
		if (!timestamp) return 'some time ago';

		const seconds = Math.floor((Date.now() - timestamp) / 1000);

		const intervals = [
			{ label: 'year', seconds: 31536000 },
			{ label: 'month', seconds: 2592000 },
			{ label: 'day', seconds: 86400 },
			{ label: 'hour', seconds: 3600 },
			{ label: 'minute', seconds: 60 },
			{ label: 'second', seconds: 1 },
		];

		for (let i = 0; i < intervals.length; i++) {
			const interval = intervals[i];
			const count = Math.floor(seconds / interval.seconds);
			if (count >= 1) {
				return count + ' ' + interval.label + (count !== 1 ? 's' : '') + ' ago';
			}
		}

		return 'just now';
	}

	function updateTagFilter() {
		const isActive = selectedTags.length > 0;
		let labelText = '[[search:tags]]';
		if (selectedTags.length) {
			labelText = translator.compile(
				'search:tags-x', selectedTags.map(u => u.value).join(', ')
			);
		}
		$('[component="tag/filter/button"]').toggleClass(
			'active-filter', isActive
		).find('.filter-label').translateHtml(labelText);
	}

	function updateTimeFilter() {
		const isActive = $('#post-time-range').val() > 0;
		$('#post-time-button').toggleClass(
			'active-filter', isActive
		).find('.filter-label').translateText(
			isActive ?
				`[[search:time-${$('#post-time-filter').val()}-than-${$('#post-time-range').val()}]]` :
				`[[search:time]]`
		);
	}

	function updateSortFilter() {
		const isActive = $('#post-sort-by').val() !== 'relevance' || $('#post-sort-direction').val() !== 'desc';
		$('#sort-by-button').toggleClass(
			'active-filter', isActive
		).find('.filter-label').translateText(
			isActive ?
				`[[search:sort-by-${$('#post-sort-by').val()}-${$('#post-sort-direction').val()}]]` :
				`[[search:sort]]`
		);
	}

	function updateReplyCountFilter() {
		const isActive = $('#reply-count').val() > 0;
		$('#reply-count-button').toggleClass(
			'active-filter', isActive
		).find('.filter-label').translateText(
			isActive ?
				`[[search:replies-${$('#reply-count-filter').val()}-count, ${$('#reply-count').val()}]]` :
				`[[search:replies]]`
		);
	}

	function getSearchDataFromDOM() {
		const form = $('#advanced-search');
		const searchData = {
			in: $('#search-in').val(),
		};
		searchData.term = $('#search-input').val();
		if (['posts', 'titlesposts', 'titles', 'bookmarks'].includes(searchData.in)) {
			searchData.matchWords = form.find('#match-words-filter').val();
			searchData.by = selectedUsers.length ? selectedUsers.map(u => u.username) : undefined;
			searchData.categories = selectedCids.length ? selectedCids : undefined;
			searchData.searchChildren = form.find('#search-children').is(':checked');
			searchData.hasTags = selectedTags.length ? selectedTags.map(t => t.value) : undefined;
			searchData.replies = form.find('#reply-count').val();
			searchData.repliesFilter = form.find('#reply-count-filter').val();
			searchData.timeFilter = form.find('#post-time-filter').val();
			searchData.timeRange = form.find('#post-time-range').val();
			searchData.sortBy = form.find('#post-sort-by').val();
			searchData.sortDirection = form.find('#post-sort-direction').val();
			searchData.showAs = form.find('#show-results-as').val();
		}

		hooks.fire('action:search.getSearchDataFromDOM', {
			form: form,
			data: searchData,
		});

		return searchData;
	}

	function updateFormItemVisiblity(searchIn) {
		const hideTitlePostFilters = !['posts', 'titles', 'bookmarks'].some(token => searchIn.includes(token));
		$('.post-search-item').toggleClass('hidden', hideTitlePostFilters);
	}

	function fillOutForm() {
		const params = utils.params({
			disableToType: true,
		});

		const searchData = searchModule.getSearchPreferences();
		const formData = utils.merge(searchData, params);

		if (formData) {
			if (ajaxify.data.term) {
				$('#search-input').val(ajaxify.data.term);
			}
			formData.in = formData.in || ajaxify.data.searchDefaultIn;
			$('#search-in').val(formData.in);
			updateFormItemVisiblity(formData.in);

			if (formData.matchWords) {
				$('#match-words-filter').val(formData.matchWords);
			}

			if (formData.showAs) {
				$('#show-results-as').val(formData.showAs);
			}

			if (formData.by) {
				formData.by = Array.isArray(formData.by) ? formData.by : [formData.by];
				formData.by.forEach(function (by) {
					$('#posted-by-user').tagsinput('add', by);
				});
			}

			if (formData.categories) {
				$('#posted-in-categories').val(formData.categories);
			}

			if (formData.searchChildren) {
				$('#search-children').prop('checked', true);
			}

			if (formData.hasTags) {
				formData.hasTags = Array.isArray(formData.hasTags) ? formData.hasTags : [formData.hasTags];
				formData.hasTags.forEach(function (tag) {
					$('#has-tags').tagsinput('add', tag);
				});
			}

			if (formData.replies) {
				$('#reply-count').val(formData.replies);
				$('#reply-count-filter').val(formData.repliesFilter);
			}

			if (formData.timeRange) {
				$('#post-time-range').val(formData.timeRange);
				$('#post-time-filter').val(formData.timeFilter);
			}

			if (formData.sortBy || ajaxify.data.searchDefaultSortBy) {
				$('#post-sort-by').val(formData.sortBy || ajaxify.data.searchDefaultSortBy);
			}
			$('#post-sort-direction').val(formData.sortDirection || 'desc');

			hooks.fire('action:search.fillOutForm', {
				form: formData,
			});
		}
	}

	function handleSavePreferences() {
		$('#save-preferences').on('click', function () {
			const data = getSearchDataFromDOM();
			const fieldsToSave = [
				'matchWords', 'in', 'showAs',
				'replies', 'repliesFilter',
				'timeFilter', 'timeRange',
				'sortBy', 'sortDirection',
			];
			const saveData = {};
			fieldsToSave.forEach((key) => {
				saveData[key] = data[key];
			});
			storage.setItem('search-preferences', JSON.stringify(saveData));
			alerts.success('[[search:search-preferences-saved]]');
			return false;
		});

		$('#clear-preferences').on('click', async function () {
			storage.removeItem('search-preferences');
			const html = await app.parseAndTranslate('partials/search-filters', {});
			$('[component="search/filters"]').replaceWith(html);
			$('#search-in').val(ajaxify.data.searchDefaultIn);
			$('#post-sort-by').val(ajaxify.data.searchDefaultSortBy);
			$('#match-words-filter').val('all');
			$('#show-results-as').val('posts');
			// clearing dom removes all event handlers, reinitialize
			userFilterDropdown($('[component="user/filter"]'), []);
			tagFilterDropdown($('[component="tag/filter"]'), []);
			categoryFilterDropdown([]);
			alerts.success('[[search:search-preferences-cleared]]');
			return false;
		});
	}

	function categoryFilterDropdown(_selectedCids) {
		ajaxify.data.allCategoriesUrl = '';
		selectedCids = _selectedCids || [];
		const dropdownEl = $('[component="category/filter"]');
		categoryFilter.init(dropdownEl, {
			selectedCids: _selectedCids,
			updateButton: false, // prevent categoryFilter module from updating the button
			onHidden: async function (data) {
				const isActive = data.selectedCids.length > 0 && data.selectedCids[0] !== 'all';
				let labelText = '[[search:categories]]';
				ajaxify.data.selectedCids = data.selectedCids;
				selectedCids = data.selectedCids;
				if (data.selectedCids.length === 1 && data.selectedCids[0] === 'watched') {
					ajaxify.data.selectedCategory = { cid: 'watched' };
					labelText = `[[search:categories-watched-categories]]`;
				} else if (data.selectedCids.length === 1 && data.selectedCids[0] === 'all') {
					ajaxify.data.selectedCategory = null;
				} else if (data.selectedCids.length > 0) {
					const categoryData = await api.get(`/categories/${data.selectedCids[0]}`);
					ajaxify.data.selectedCategory = categoryData;
					labelText = `[[search:categories-x, ${categoryData.name}]]`;
				}
				if (data.selectedCids.length > 1) {
					labelText = `[[search:categories-x, ${data.selectedCids.length}]]`;
				}

				$('[component="category/filter/button"]').toggleClass(
					'active-filter', isActive
				).find('.filter-label').translateText(labelText);
			},
			localCategories: [
				{
					cid: 'watched',
					name: '[[category:watched-categories]]',
					icon: '',
				},
			],
		});
	}

	function userFilterDropdown(el, _selectedUsers) {
		selectedUsers = _selectedUsers || [];
		userFilter.init(el, {
			selectedUsers: _selectedUsers,
			template: 'partials/search-filters',
			onSelect: function (_selectedUsers) {
				selectedUsers = _selectedUsers;
			},
			onHidden: function (_selectedUsers) {
				const isActive = _selectedUsers.length > 0;
				let labelText = '[[search:posted-by]]';
				if (isActive) {
					labelText = translator.compile(
						'search:posted-by-usernames', selectedUsers.map(u => u.username).join(', ')
					);
				}
				el.find('[component="user/filter/button"]').toggleClass(
					'active-filter', isActive
				).find('.filter-label').translateText(labelText);
			},
		});
	}

	function tagFilterDropdown(el, _selectedTags) {
		selectedTags = _selectedTags;
		async function renderSelectedTags() {
			const html = await app.parseAndTranslate('partials/search-filters', 'tagFilterSelected', {
				tagFilterSelected: selectedTags,
			});
			el.find('[component="tag/filter/selected"]').html(html);
		}
		function tagValueToObject(value) {
			const escapedTag = utils.escapeHTML(value);
			return {
				value: value,
				valueEscaped: escapedTag,
				valueEncoded: encodeURIComponent(value),
				class: escapedTag.replace(/\s/g, '-'),
			};
		}

		async function doSearch() {
			let result = { tags: [] };
			const query = el.find('[component="tag/filter/search"]').val();
			if (query && query.length > 1) {
				if (app.user.privileges['search:tags']) {
					result = await socket.emit('topics.searchAndLoadTags', { query: query });
				} else {
					result = {
						tags: [tagValueToObject(query)],
					};
				}
			}

			if (!result.tags.length) {
				el.find('[component="tag/filter/results"]').translateHtml(
					'[[tags:no-tags-found]]'
				);
				return;
			}
			result.tags = result.tags.slice(0, 20);
			const tagMap = {};
			result.tags.forEach((tag) => {
				tagMap[tag.value] = tag;
			});

			const html = await app.parseAndTranslate('partials/search-filters', 'tagFilterResults', {
				tagFilterResults: result.tags,
			});
			el.find('[component="tag/filter/results"]').html(html);
			el.find('[component="tag/filter/results"] [data-tag]').on('click', async function () {
				selectedTags.push(tagMap[$(this).attr('data-tag')]);
				renderSelectedTags();
			});
		}

		el.find('[component="tag/filter/search"]').on('keyup', utils.debounce(function () {
			if (app.user.privileges['search:tags']) {
				doSearch();
			}
		}, 1000));

		el.on('click', '[component="tag/filter/delete"]', function () {
			const deleteTag = $(this).attr('data-tag');
			selectedTags = selectedTags.filter(tag => tag.value !== deleteTag);
			renderSelectedTags();
		});

		el.find('[component="tag/filter/search"]').on('keyup', (e) => {
			if (e.key === 'Enter' && !app.user.privileges['search:tags']) {
				const value = el.find('[component="tag/filter/search"]').val();
				if (value && selectedTags.every(tag => tag.value !== value)) {
					selectedTags.push(tagValueToObject(value));
					renderSelectedTags();
				}
				el.find('[component="tag/filter/search"]').val('');
			}
		});

		el.on('shown.bs.dropdown', function () {
			el.find('[component="tag/filter/search"]').trigger('focus');
		});
	}

	return Search;
});
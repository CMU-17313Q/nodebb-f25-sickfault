<div class="search flex-fill">
	<!-- Simple Search -->
	<div id="simple-search" class="simple-search-container">
		<div class="search-header">
			<h1 class="search-title">Search Posts</h1>
			<div class="search-box">
				<div class="search-input-wrapper">
					<input 
						type="text" 
						id="simple-search-input" 
						class="simple-search-input" 
						placeholder="Search for posts..." 
						autocomplete="off"
						value="{term}"
					/>
					<button id="simple-search-button" class="simple-search-btn" aria-label="Search">
						<i class="fa fa-search"></i>
					</button>
				</div>
				<div class="search-suggestions" id="search-suggestions"></div>
			</div>
			<button id="toggle-advanced" class="btn btn-link advanced-toggle">
				<i class="fa fa-sliders"></i> Advanced Search
			</button>
		</div>

		<div class="search-results-container">
			<div id="search-status" class="search-status"></div>
			<div id="simple-search-results" class="simple-search-results"></div>
		</div>
	</div>

	<!-- Existing Advanced Search (Hidden by default) -->
	<div id="advanced-search" class="d-none">
		<div class="d-flex flex-column flex-md-row">
			<!-- sidebar -->
			<div class="flex-shrink-0 pe-2 border-end-md text-sm mb-3" style="flex-basis: 240px!important;">
				<form action="{config.relative_path}/search" method="get" class="nav sticky-md-top d-flex flex-row flex-md-column flex-wrap gap-3 pe-md-3" style="top: 1rem; z-index: 1;">
					<h2 class="fw-semibold tracking-tight mb-0">[[global:search]]</h2>

					<input id="search-input" name="term" type="text" class="form-control fw-semibold py-2 ps-2 pe-3" placeholder="[[search:type-to-search]]" value="{term}">

					<select id="search-in" name="in" class="form-select text-sm py-2 ps-2 pe-3">
						<option value="titlesposts">[[search:in-titles-posts]]</option>
						<option value="titles">[[search:in-titles]]</option>
						<option value="posts">[[search:in-posts]]</option>
						<option value="bookmarks">[[search:in-bookmarks]]</option>
						<option value="categories">[[search:in-categories]]</option>
						{{{if privileges.search:users}}}
						<option value="users">[[search:in-users]]</option>
						{{{end}}}
						{{{if privileges.search:tags}}}
						<option value="tags">[[search:in-tags]]</option>
						{{{end}}}
					</select>

					<select id="match-words-filter" name="matchWords" class="post-search-item form-select text-sm py-2 ps-2 pe-3">
						<option value="all">[[search:match-all-words]]</option>
						<option value="any">[[search:match-any-word]]</option>
					</select>

					<select id="show-results-as" name="showAs" class="post-search-item form-select text-sm py-2 ps-2 pe-3">
						<option value="posts" selected>[[search:show-results-as-posts]]</option>
						<option value="topics">[[search:show-results-as-topics]]</option>
					</select>

					<button type="submit" class="btn btn-primary fw-semibold form-control py-2 px-3">[[global:search]]</button>
					<button type="button" id="back-to-simple" class="btn btn-secondary fw-semibold form-control py-2 px-3">
						<i class="fa fa-arrow-left"></i> Simple Search
					</button>
				</form>
			</div>

			<!-- filters and search results -->
			<div class="flex-grow-1 ps-md-2 ps-lg-5" style="min-width:0;">
				<div class="d-flex flex-column gap-3">
					<!-- IMPORT partials/search-filters.tpl -->
					<!-- IMPORT partials/search-results.tpl -->
				</div>
			</div>
		</div>
	</div>
</div>

<style>
/* Search Styles */
.simple-search-container {
	min-height: calc(100vh - 200px);
	padding: 40px 20px;
}

.search-header {
	text-align: center;
	margin-bottom: 40px;
	max-width: 600px;
	margin-left: auto;
	margin-right: auto;
}

.search-title {
	color: var(--bs-body-color);
	font-size: 2.5rem;
	margin-bottom: 30px;
	font-weight: 300;
}

.search-box {
	position: relative;
	margin-bottom: 20px;
}

.search-input-wrapper {
	display: flex;
	background: var(--bs-body-bg);
	border: 1px solid var(--bs-border-color);
	border-radius: 50px;
	box-shadow: 0 2px 5px rgba(0,0,0,0.1);
	overflow: hidden;
	transition: all 0.3s ease;
}

.search-input-wrapper:hover,
.search-input-wrapper:focus-within {
	box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.simple-search-input {
	flex: 1;
	padding: 14px 20px;
	border: none;
	outline: none;
	font-size: 16px;
	background: transparent;
}

.simple-search-btn {
	background: transparent;
	border: none;
	padding: 0 20px;
	cursor: pointer;
	color: var(--bs-primary);
	font-size: 18px;
	transition: color 0.3s ease;
}

.simple-search-btn:hover {
	color: var(--bs-primary-dark);
}

.advanced-toggle {
	color: var(--bs-secondary);
	text-decoration: none;
	font-size: 14px;
}

.advanced-toggle:hover {
	color: var(--bs-primary);
}

.search-suggestions {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	margin-top: 10px;
	background: var(--bs-body-bg);
	border: 1px solid var(--bs-border-color);
	border-radius: 10px;
	box-shadow: 0 5px 20px rgba(0,0,0,0.15);
	max-height: 300px;
	overflow-y: auto;
	display: none;
	z-index: 1000;
}

.search-suggestions.active {
	display: block;
}

.suggestion-item {
	padding: 12px 20px;
	cursor: pointer;
	transition: background 0.2s ease;
	border-bottom: 1px solid var(--bs-border-color);
}

.suggestion-item:last-child {
	border-bottom: none;
}

.suggestion-item:hover {
	background: var(--bs-gray-100);
}

.suggestion-title {
	font-weight: 500;
	color: var(--bs-body-color);
	margin-bottom: 4px;
}

.suggestion-content {
	font-size: 13px;
	color: var(--bs-secondary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.search-results-container {
	max-width: 800px;
	margin: 0 auto;
}

.search-status {
	text-align: center;
	padding: 20px;
	color: var(--bs-secondary);
	font-size: 16px;
}

.simple-search-results {
	background: var(--bs-body-bg);
	border-radius: 15px;
	padding: 20px;
	box-shadow: 0 2px 10px rgba(0,0,0,0.1);
	display: none;
}

.simple-search-results.active {
	display: block;
}

.result-item {
	padding: 20px;
	border-bottom: 1px solid var(--bs-border-color);
	transition: background 0.2s ease;
}

.result-item:last-child {
	border-bottom: none;
}

.result-item:hover {
	background: var(--bs-gray-100);
}

.result-header {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
}

.result-avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	margin-right: 12px;
}

.result-meta {
	flex: 1;
}

.result-author {
	font-weight: 600;
	color: var(--bs-body-color);
	margin-right: 10px;
}

.result-time {
	color: var(--bs-secondary);
	font-size: 13px;
}

.result-title {
	font-size: 18px;
	font-weight: 500;
	color: var(--bs-body-color);
	margin-bottom: 8px;
	text-decoration: none;
	display: block;
}

.result-title:hover {
	color: var(--bs-primary);
}

.result-content {
	color: var(--bs-secondary);
	line-height: 1.6;
	margin-bottom: 10px;
}

.result-content mark {
	background-color: #ffeb3b;
	padding: 0 2px;
}

.result-footer {
	display: flex;
	align-items: center;
	gap: 20px;
	color: var(--bs-secondary);
	font-size: 13px;
}

.result-footer i {
	margin-right: 5px;
}

.no-results {
	text-align: center;
	padding: 40px 20px;
	color: var(--bs-secondary);
}

.no-results i {
	font-size: 48px;
	color: var(--bs-gray-400);
	margin-bottom: 15px;
}

.loading {
	text-align: center;
	padding: 40px;
}

.loading-spinner {
	display: inline-block;
	width: 40px;
	height: 40px;
	border: 4px solid rgba(0,0,0,0.1);
	border-radius: 50%;
	border-top-color: var(--bs-primary);
	animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
	.search-title {
		font-size: 1.8rem;
	}
	
	.simple-search-input {
		padding: 12px 16px;
		font-size: 14px;
	}
	
	.search-results-container {
		padding: 0 10px;
	}
}
</style>
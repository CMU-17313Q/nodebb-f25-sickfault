'use strict';
/* global $, ajaxify, app, config */

function isLoggedIn() {
  return (window.app && app.user && app.user.uid) || (window.config && config.loggedIn);
}

$(window).on('action:ajaxify.end', (_ev, data) => {
  if (!/^categories/.test(data.url)) return;
  if (!isLoggedIn()) return;
  if (document.getElementById('btn-new-public-category')) return;

  const btn = $('<button id="btn-new-public-category" class="btn btn-primary"> Create a New Category</button>')
    .css({ margin: '1rem 0' })
    .on('click', async () => {
        const name = prompt('Category name:');
        if (!name) return;
        const description = prompt('Description (optional):') || '';

        try {
            const res = await $.ajax({
                method: 'POST',
                url: '/api/category/create',
                headers: { 'x-csrf-token': config.csrf_token },
                data: { name, description },
            });
            app.alertSuccess('Category created.');
            if (res?.cid) {
                // If we're already viewing /categories, do a soft refresh so the new one shows up
                const onCategories = window.ajaxify?.data?.url && /^categories/.test(ajaxify.data.url);
                if (onCategories && typeof ajaxify.refresh === 'function') {
                    ajaxify.refresh();
                } else if (typeof ajaxify.go === 'function') {
                    ajaxify.go('categories');  // go to categories if we were elsewhere
                } else {
                    // hard fallback (rare)
                    window.location.href = (window.config?.relative_path || '') + '/categories';
                }
            }
            } catch (e) {
                if (e?.status === 409) {
                    app.alert({
                        type: 'error',
                        title: 'Duplicate name',
                        message: 'No duplicates allowed. Please choose a different category name.',
                        timeout: 5000,
                    });
                } else {
                    app.alertError(e?.responseJSON?.error || 'Failed to create category.');
                }
            }
  });

  $('#content').prepend(btn);

});
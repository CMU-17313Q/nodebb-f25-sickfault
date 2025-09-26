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
            if (res?.cid) ajaxify.go(`category/${res.cid}`);
            } catch (e) {
            app.alertError(e?.responseJSON?.error || 'Failed to create category.');
            }
  });

  $('#content').prepend(btn);

});
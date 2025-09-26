'use strict';
/* global $, ajaxify, app, config */

function isLoggedIn() {
  return (window.app && app.user && app.user.uid) || (window.config && config.loggedIn);
}

$(window).on('action:ajaxify.end', (_ev, data) => {
  if (!/^categories/.test(data.url)) return;
  if (!isLoggedIn()) return;
  if (document.getElementById('btn-new-public-category')) return;

  const btn = $('<button id="btn-new-public-category" class="btn btn-primary">New Category</button>')
    .css({ margin: '1rem 0' })
    .on('click', async () => {
        
  });




  $('.categories, .page-categories, #content').first().prepend(btn);
});
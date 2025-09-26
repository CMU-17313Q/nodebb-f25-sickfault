'use strict';
/* global $, ajaxify, app, config */

function isLoggedIn() {
  return (window.app && app.user && app.user.uid) || (window.config && config.loggedIn);
}

'use strict';

let router, middleware;
const Categories = require.main.require('./src/categories');
const User = require.main.require('./src/user');

// Put 0 to place at root, or a parent category cid if you created one like "Student Hubs"
const PARENT_CID = 0;
const MAX_PER_USER = 3;

async function getCount(uid) {
  const settings = (await User.getSettings(uid)) || {};
  return Number(settings.userPublicCatCount || 0);
}
async function bumpCount(uid) {
  const settings = (await User.getSettings(uid)) || {};
  const next = Number(settings.userPublicCatCount || 0) + 1;
  await User.updateSettings(uid, { ...settings, userPublicCatCount: next });
}
